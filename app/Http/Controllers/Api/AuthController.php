<?php

namespace App\Http\Controllers\Api;

use App\Actions\Api\NormalizeInputFieldsAction;
use App\Http\Controllers\Controller;
use App\Services\TenantSupportAccessService;
use App\Services\TenantRbacService;
use App\Services\Auth\WebRefreshSessionService;
use App\Models\WebRefreshSession;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Laravel\Passport\Token as PassportToken;

class AuthController extends Controller
{
    public function __construct(
        private readonly TenantRbacService $tenantRbac,
        private readonly TenantSupportAccessService $tenantSupportAccess,
        private readonly NormalizeInputFieldsAction $normalizeInputFields,
        private readonly WebRefreshSessionService $webRefreshSessionService,
    ) {}

    /**
    * Build the authenticated user payload.
     *
     * @return array<string, mixed>
     */
    private function userPayload(User $user): array
    {
        $tenantId = $this->currentTenantId();

        if ($tenantId !== null) {
            return $this->tenantUserPayload($user, $tenantId);
        }

        $user->load('roles.permissions', 'permissions');

        $payload = $user->toArray();
        $payload['avatar'] = $user->avatar_url;

        return $payload;
    }

    /**
     * Build a tenant-scoped user payload so the tenant app only sees
     * permissions and roles for the current tenant team context.
     *
     * @return array<string, mixed>
     */
    private function tenantUserPayload(User $user, string $tenantId): array
    {
        $roles = $user->roles()
            ->where('roles.guard_name', 'api')
            ->where('roles.team_id', $tenantId)
            ->with(['permissions' => function ($query) {
                $query->select('permissions.id', 'permissions.name', 'permissions.guard_name');
            }])
            ->get();

        $directPermissions = $user->getDirectPermissions()
            ->map(fn ($permission) => [
                'id' => $permission->id,
                'name' => $permission->name,
                'guard_name' => $permission->guard_name,
            ])
            ->values()
            ->all();

        $payload = $user->toArray();
        $payload['roles'] = $roles
            ->map(function ($role) {
                return [
                    'id' => $role->id,
                    'name' => $role->name,
                    'guard_name' => $role->guard_name,
                    'permissions' => $role->permissions
                        ->map(fn ($permission) => [
                            'id' => $permission->id,
                            'name' => $permission->name,
                            'guard_name' => $permission->guard_name,
                        ])
                        ->values()
                        ->all(),
                ];
            })
            ->values()
            ->all();
        $payload['permissions'] = $directPermissions;
        $payload['avatar'] = $user->avatar_url;

        return $payload;
    }

    /**
     * Return the authenticated API user as a concrete User model.
     */
    private function authenticatedUser(Request $request): User
    {
        $user = $request->user();

        if (! $user instanceof User) {
            abort(401, 'Unauthenticated.');
        }

        return $user;
    }

    private function currentTenantId(): ?string
    {
        if (! tenancy()->initialized || ! tenancy()->tenant) {
            return null;
        }

        return (string) tenancy()->tenant->id;
    }

    private function hasActiveTenantMembership(User $user, string $tenantId): bool
    {
        $this->tenantSupportAccess->expireSupportAccessIfNeeded($user, $tenantId);

        return $user->memberships()
            ->where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->where(function ($query) {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->exists();
    }

    private function syncTenantRole(User $user, string $tenantId): void
    {
        $membershipRole = $user->memberships()
            ->where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->value('role');

        $this->tenantRbac->ensureUserRoleSynced($user, $tenantId, $membershipRole);
    }

    private function resolveRefreshUser(Request $request, ?string $tenantId): array
    {
        $refreshSession = $this->webRefreshSessionService->resolveFromRequest($request, $tenantId);

        if (! $refreshSession) {
            return [null, null];
        }

        $user = $refreshSession->user;

        if (! $user instanceof User) {
            return [null, null];
        }

        if ($tenantId !== null) {
            if (! $this->hasActiveTenantMembership($user, $tenantId)) {
                $this->webRefreshSessionService->revoke($refreshSession);

                return [null, null];
            }

            $this->syncTenantRole($user, $tenantId);
        }

        return [$user, $refreshSession];
    }

    private function revokeCurrentAccessToken(?User $user): void
    {
        if (! $user instanceof User) {
            return;
        }

        $token = $user->token();

        if ($token instanceof PassportToken) {
            $token->revoke();
        }
    }

    /**
     * Login user and return token
     */
    public function login(Request $request)
    {
        $validated = Validator::make(($this->normalizeInputFields)(
            $request->all(),
            singleLineFields: ['email'],
        ), [
            'email' => 'required|email',
            'password' => 'required|string',
        ])->validate();

        // Attempt authentication
        if (! Auth::attempt([
            'email' => $validated['email'],
            'password' => $validated['password'],
        ])) {
            throw ValidationException::withMessages([
                'email' => [__('auth.failed')],
            ]);
        }

        $user = Auth::user();

        if (! $user instanceof User) {
            abort(401, 'Unauthenticated.');
        }

        // In tenant context, only active tenant members may login.
        // Return the same generic auth error to avoid account enumeration.
        $tenantId = $this->currentTenantId();

        if ($tenantId !== null) {
            if (! $this->hasActiveTenantMembership($user, $tenantId)) {
                Auth::logout();

                throw ValidationException::withMessages([
                    'email' => [__('auth.failed')],
                ]);
            }

            $this->syncTenantRole($user, $tenantId);
        }

        // Create access token
        $token = $user->createToken('web-token')->accessToken;
        [, $refreshCookie] = $this->webRefreshSessionService->issue($user, $request, $tenantId);

        return $this->tokenResponse([
            'user' => $this->userPayload($user),
            'token' => $token,
        ])->withCookie($refreshCookie);
    }

    /**
     * Register a new user (optional - for public registration)
     */
    public function register(Request $request)
    {
        $validated = Validator::make(($this->normalizeInputFields)(
            $request->all(),
            singleLineFields: ['name', 'email'],
        ), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => ['required', 'string', Password::min(8)->mixedCase()->numbers(), 'confirmed'],
        ])->validate();

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        // Assign default role if needed
        // $user->assignRole('user');

        $token = $user->createToken('web-token')->accessToken;
        [, $refreshCookie] = $this->webRefreshSessionService->issue($user, $request, $this->currentTenantId());

        return $this->tokenResponse([
            'user' => $this->userPayload($user),
            'token' => $token,
        ], 201)->withCookie($refreshCookie);
    }

    /**
     * Logout user (revoke token)
     */
    public function logout(Request $request)
    {
        $user = $this->authenticatedUser($request);
        $this->revokeCurrentAccessToken($user);

        $refreshSession = $this->webRefreshSessionService->resolveFromRequest($request, $this->currentTenantId());
        $this->webRefreshSessionService->revoke($refreshSession);

        return response()->json([
            'message' => __('Successfully logged out'),
        ])->withCookie($this->webRefreshSessionService->expireCookie($request));
    }

    /**
     * Refresh access token
     */
    public function refresh(Request $request)
    {
        $tenantId = $this->currentTenantId();
        [$user, $refreshSession] = $this->resolveRefreshUser($request, $tenantId);

        if (! $user instanceof User) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401)->withCookie($this->webRefreshSessionService->expireCookie($request));
        }

        $token = $user->createToken('web-token')->accessToken;
        [, $refreshCookie] = $this->webRefreshSessionService->rotate($refreshSession, $request);

        return $this->tokenResponse([
            'token' => $token,
            'user' => $this->userPayload($user),
        ])->withCookie($refreshCookie);
    }

    /**
     * Prevent token-bearing auth responses from being cached by browsers or intermediaries.
     *
     * @param  array<string, mixed>  $payload
     */
    private function tokenResponse(array $payload, int $status = 200)
    {
        return response()
            ->json($payload, $status)
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->header('Pragma', 'no-cache')
            ->header('Expires', '0');
    }

    /**
     * Get authenticated user with roles and permissions
     */
    public function user(Request $request)
    {
        $user = $this->authenticatedUser($request);

        return response()->json($this->userPayload($user));
    }

    /**
     * Update authenticated user's profile
     */
    public function updateProfile(Request $request)
    {
        $user = $this->authenticatedUser($request);

        $validated = Validator::make(($this->normalizeInputFields)(
            $request->all(),
            singleLineFields: ['name', 'email'],
        ), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email,'.$user->id,
        ])->validate();

        $user->update($validated);

        // Log activity
        $causer = auth('api')->user();
        activity('central')
            ->performedOn($user)
            ->causedBy($causer)
            ->event('updated')
            ->withProperties([
                'attributes' => [
                    'name' => $user->name,
                    'email' => $user->email,
                ],
            ])
            ->log('Profile updated');

        return response()->json([
            'message' => __('Profile updated successfully'),
            'user' => $this->userPayload($user),
        ]);
    }

    /**
     * Update authenticated user's password
     */
    public function updatePassword(Request $request)
    {
        $user = $this->authenticatedUser($request);

        $validated = $request->validate([
            'current_password' => 'required|string',
            'password' => ['required', 'string', Password::min(8)->mixedCase()->numbers(), 'confirmed'],
        ]);

        // Verify current password
        if (! Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        // Log activity
        $causer = auth('api')->user();
        activity('central')
            ->causedBy($causer)
            ->event('updated')
            ->log('Password changed');

        return response()->json([
            'message' => __('Password updated successfully'),
        ]);
    }

    /**
     * Update authenticated user's locale preference.
     */
    public function updateLocale(Request $request)
    {
        $validated = $request->validate([
            'locale' => ['required', 'string', Rule::in(['en', 'sv', 'ar'])],
        ]);

        $user = $this->authenticatedUser($request);
        $user->update([
            'preferred_locale' => $validated['locale'],
        ]);

        return response()->json([
            'message' => __('Locale updated successfully'),
            'locale' => $validated['locale'],
        ]);
    }

    /**
     * Upload user avatar
     */
    public function uploadAvatar(Request $request)
    {
        $user = $this->authenticatedUser($request);

        $validated = $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:2048', // Max 2MB
        ]);

        // Delete old avatar if exists
        $user->clearMediaCollection('avatar');

        // Add new avatar with custom filename
        $media = $user->addMediaFromRequest('avatar')
            ->usingFileName('avatar-' . $user->id . '-' . time() . '.' . $request->file('avatar')->getClientOriginalExtension())
            ->usingName('Avatar')
            ->toMediaCollection('avatar');

        // Log activity
        activity('central')
            ->performedOn($user)
            ->causedBy($user)
            ->event('updated')
            ->withProperties(['attributes' => ['avatar' => $media->file_name]])
            ->log('Avatar uploaded');

        return response()->json([
            'message' => __('Avatar uploaded successfully'),
            'user' => $this->userPayload($user),
            'avatar_url' => $user->avatar_url,
        ]);
    }

    /**
     * Delete user avatar
     */
    public function deleteAvatar(Request $request)
    {
        $user = $this->authenticatedUser($request);

        // Delete avatar
        $user->clearMediaCollection('avatar');

        // Log activity
        activity('central')
            ->performedOn($user)
            ->causedBy($user)
            ->event('updated')
            ->log('Avatar deleted');

        return response()->json([
            'message' => __('Avatar deleted successfully'),
            'user' => $this->userPayload($user),
        ]);
    }
}
