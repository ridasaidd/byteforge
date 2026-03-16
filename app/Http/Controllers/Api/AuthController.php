<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\TenantRbacService;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Laravel\Passport\Token as PassportToken;

class AuthController extends Controller
{
    public function __construct(
        private readonly TenantRbacService $tenantRbac,
    ) {}

    /**
    * Build the authenticated user payload.
     *
     * @return array<string, mixed>
     */
    private function userPayload(User $user): array
    {
        $user->load('roles.permissions', 'permissions');

        $payload = $user->toArray();
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

    /**
     * Login user and return token
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        // Attempt authentication
        if (! Auth::attempt($request->only('email', 'password'))) {
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
        if (tenancy()->initialized && tenancy()->tenant) {
            $tenantId = (string) tenancy()->tenant->id;

            $isActiveMember = $user->memberships()
                ->where('tenant_id', $tenantId)
                ->where('status', 'active')
                ->exists();

            if (! $isActiveMember) {
                Auth::logout();

                throw ValidationException::withMessages([
                    'email' => [__('auth.failed')],
                ]);
            }

            $membershipRole = $user->memberships()
                ->where('tenant_id', $tenantId)
                ->where('status', 'active')
                ->value('role');

            $this->tenantRbac->ensureUserRoleSynced($user, $tenantId, $membershipRole);
        }

        // Create access token
        $token = $user->createToken('web-token')->accessToken;

        return response()->json([
            'user' => $this->userPayload($user),
            'token' => $token,
        ]);
    }

    /**
     * Register a new user (optional - for public registration)
     */
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => ['required', 'string', Password::min(8)->mixedCase()->numbers(), 'confirmed'],
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        // Assign default role if needed
        // $user->assignRole('user');

        $token = $user->createToken('web-token')->accessToken;

        return response()->json([
            'user' => $this->userPayload($user),
            'token' => $token,
        ], 201);
    }

    /**
     * Logout user (revoke token)
     */
    public function logout(Request $request)
    {
        $user = $this->authenticatedUser($request);
        $token = $user->token();

        if ($token instanceof PassportToken) {
            $token->revoke();
        }

        return response()->json([
            'message' => __('Successfully logged out'),
        ]);
    }

    /**
     * Refresh access token
     */
    public function refresh(Request $request)
    {
        $user = $this->authenticatedUser($request);

        // Revoke old token
        $token = $user->token();
        if ($token instanceof PassportToken) {
            $token->revoke();
        }

        // Create new token
        $token = $user->createToken('web-token')->accessToken;

        return response()->json([
            'token' => $token,
        ]);
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

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email,'.$user->id,
        ]);

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
            'user' => $user->load('roles', 'permissions'),
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

        $user->load('roles.permissions', 'permissions');
        $user->avatar = $user->avatar_url;

        return response()->json([
            'message' => __('Avatar uploaded successfully'),
            'user' => $user,
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

        $user->load('roles.permissions', 'permissions');
        $user->avatar = null;

        return response()->json([
            'message' => __('Avatar deleted successfully'),
            'user' => $user,
        ]);
    }
}
