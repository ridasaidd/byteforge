<?php

namespace App\Http\Controllers\Api;

use App\Actions\Api\NormalizeInputFieldsAction;
use App\Actions\Api\Superadmin\CreateTenantAction;
use App\Actions\Api\Superadmin\CreateUserAction;
use App\Actions\Api\Superadmin\DeleteTenantAction;
use App\Actions\Api\Superadmin\DeleteUserAction;
use App\Actions\Api\Superadmin\ListTenantsAction;
use App\Actions\Api\Superadmin\ListUsersAction;
use App\Actions\Api\Superadmin\UpdateTenantAction;
use App\Actions\Api\Superadmin\UpdateUserAction;
use App\Http\Controllers\Controller;
use App\Models\Membership;
use App\Models\Tenant;
use App\Models\TenantActivity;
use App\Notifications\TenantUserManagementOwnerNotification;
use App\Models\User;
use App\Models\WebRefreshSession;
use App\Services\TenantRbacService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Passport\Token as PassportToken;
use App\Settings\GeneralSettings;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class SuperadminController extends Controller
{
    private const BROWSER_TOKEN_NAME_PREFIX = 'web-session:';

    public function __construct(
        private readonly NormalizeInputFieldsAction $normalizeInputFields,
    ) {}

    public function tenantUsers(Tenant $tenant)
    {
        $memberships = Membership::query()
            ->with('user:id,name,email')
            ->where('tenant_id', (string) $tenant->id)
            ->where('status', 'active')
            ->orderByRaw("FIELD(role, 'owner', 'editor', 'viewer')")
            ->orderBy('id')
            ->get();

        $data = $memberships
            ->filter(fn (Membership $membership) => $membership->user !== null)
            ->map(function (Membership $membership) {
                return [
                    'id' => (int) $membership->user->id,
                    'name' => $membership->user->name,
                    'email' => $membership->user->email,
                    'role' => $membership->role,
                    'status' => $membership->status,
                    'joined_at' => $membership->created_at?->toISOString(),
                ];
            })
            ->values();

        return response()->json(['data' => $data]);
    }

    // Tenant management
    public function indexTenants(Request $request)
    {
        $result = ListTenantsAction::run([
            'search' => $request->input('search'),
            'per_page' => $request->input('per_page', 15),
        ]);

        return response()->json($result);
    }

    public function storeTenant(Request $request)
    {
        $tenant = CreateTenantAction::run($request->only(['name', 'domain']));

        return response()->json(['data' => $tenant], 201);
    }

    public function showTenant(Tenant $tenant)
    {
        $tenant->load('domains');

        $data = [
            'id' => $tenant->id,
            'name' => $tenant->name,
            'slug' => $tenant->slug,
            'domain' => $tenant->domains->first()->domain ?? null,
            'created_at' => $tenant->created_at->toISOString(),
            'updated_at' => $tenant->updated_at->toISOString(),
        ];

        return response()->json(['data' => $data]);
    }

    public function updateTenant(Request $request, Tenant $tenant)
    {
        $updated = UpdateTenantAction::run($tenant, $request->only(['name', 'domain']));

        return response()->json(['data' => $updated]);
    }

    public function destroyTenant(Tenant $tenant)
    {
        DeleteTenantAction::run($tenant);

        return response()->json(['message' => 'Tenant deleted successfully']);
    }

    // User management
    public function indexUsers(Request $request)
    {
        $result = ListUsersAction::run([
            'search' => $request->input('search'),
            'per_page' => $request->input('per_page', 15),
        ]);

        return response()->json($result);
    }

    public function storeUser(Request $request)
    {
        $user = CreateUserAction::run($request->only(['name', 'email', 'password', 'password_confirmation', 'role']));

        return response()->json(['data' => $user], 201);
    }

    public function showUser(User $user)
    {
        $user->load('roles', 'permissions');

        $data = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'roles' => $user->roles->pluck('name')->toArray(),
            'permissions' => $user->permissions->pluck('name')->toArray(),
            'created_at' => $user->created_at->toISOString(),
            'updated_at' => $user->updated_at->toISOString(),
        ];

        return response()->json(['data' => $data]);
    }

    public function updateUser(Request $request, User $user)
    {
        $updated = UpdateUserAction::run($user, $request->only(['name', 'email', 'password', 'password_confirmation', 'role']));

        return response()->json(['data' => $updated]);
    }

    public function destroyUser(User $user)
    {
        DeleteUserAction::run($user);

        return response()->json(['message' => 'User deleted successfully']);
    }

    // Central Activity Log
    public function indexActivity(Request $request)
    {
        $query = TenantActivity::query()
            ->whereNull('tenant_id')
            ->where('log_name', 'central')
            ->with(['subject', 'causer'])
            ->orderBy('created_at', 'desc');

        // Optional filters
        if ($request->filled('subject_type')) {
            $subjectType = $request->input('subject_type');
            // Map friendly names to classes where possible
            $typeMap = [
                'Page' => \App\Models\Page::class,
                'Navigation' => \App\Models\Navigation::class,
                'User' => \App\Models\User::class,
                'Tenant' => \App\Models\Tenant::class,
            ];
            if (isset($typeMap[$subjectType])) {
                $query->where('subject_type', $typeMap[$subjectType]);
            } else {
                // fallback: allow direct class name filter
                $query->where('subject_type', $subjectType);
            }
        }

        if ($request->filled('event')) {
            $validEvents = ['created', 'updated', 'deleted', 'restored'];
            if (in_array($request->input('event'), $validEvents, true)) {
                $query->where('event', $request->input('event'));
            }
        }

        if ($request->filled('causer_id') && is_numeric($request->input('causer_id'))) {
            $query->where('causer_id', (int) $request->input('causer_id'));
        }

        $perPage = min((int) $request->input('per_page', 15), 100);
        $activities = $query->paginate($perPage);

        return response()->json([
            'data' => $activities->map(function ($activity) {
                return [
                    'id' => $activity->id,
                    'log_name' => $activity->log_name,
                    'description' => $activity->description,
                    'event' => $activity->event,
                    'subject_type' => class_basename($activity->subject_type),
                    'subject_id' => $activity->subject_id,
                    'causer' => $activity->causer ? [
                        'id' => $activity->causer->id,
                        'name' => $activity->causer->name,
                        'email' => $activity->causer->email,
                    ] : null,
                    'properties' => $activity->properties,
                    'created_at' => $activity->created_at,
                ];
            }),
            'meta' => [
                'current_page' => $activities->currentPage(),
                'last_page' => $activities->lastPage(),
                'per_page' => $activities->perPage(),
                'total' => $activities->total(),
            ],
        ]);
    }

    // Add user to tenant
    public function addUserToTenant(Request $request, Tenant $tenant)
    {
        $validated = validator(($this->normalizeInputFields)(
            $request->all(),
            singleLineFields: ['email', 'name'],
        ), [
            'email' => ['required', 'email', 'max:255'],
            'name' => ['nullable', 'string', 'max:120'],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
            'role' => ['sometimes', 'string', Rule::in(['owner', 'editor', 'viewer'])],
        ])->validate();

        $role = $validated['role'] ?? 'owner';
        $email = strtolower((string) $validated['email']);
        $actor = $this->authenticatedActor($request);

        $user = User::query()->where('email', $email)->first();

        if (! $user) {
            if (! isset($validated['name']) || trim((string) $validated['name']) === '') {
                return response()->json([
                    'message' => 'Name is required when creating a new user.',
                    'errors' => ['name' => ['Name is required when creating a new user.']],
                ], 422);
            }

            if (! isset($validated['password']) || trim((string) $validated['password']) === '') {
                return response()->json([
                    'message' => 'Password is required when creating a new user.',
                    'errors' => ['password' => ['Password is required when creating a new user.']],
                ], 422);
            }

            $user = User::query()->create([
                'name' => trim((string) $validated['name']),
                'email' => $email,
                'password' => Hash::make((string) $validated['password']),
            ]);
        }

        $membership = DB::transaction(function () use ($tenant, $user, $role) {
            $membership = Membership::query()->updateOrCreate(
                ['tenant_id' => (string) $tenant->id, 'user_id' => $user->id],
                ['role' => $role, 'status' => 'active', 'source' => 'superadmin_assign', 'expires_at' => null]
            );

            app(TenantRbacService::class)->syncUserRoleFromMembership(
                $user,
                (string) $tenant->id,
                $membership->role,
                'api'
            );

            return $membership;
        });

        $this->logCentralTenantUserAction(
            'assigned',
            $tenant,
            $user,
            $actor,
            sprintf('%s granted %s tenant access to %s on tenant %s', $actor->name, $role, $user->email, $tenant->slug),
            [
                'membership_role' => $membership->role,
                'membership_status' => $membership->status,
                'membership_source' => $membership->source,
            ],
        );

        $this->logTenantUserAction(
            'assigned',
            $tenant,
            $user,
            $actor,
            sprintf('Central admin %s granted %s access to %s', $actor->name, $role, $user->email),
            [
                'membership_role' => $membership->role,
                'membership_status' => $membership->status,
                'membership_source' => $membership->source,
            ],
        );

        $this->notifyTenantOwners(
            $tenant,
            $user,
            $actor,
            TenantUserManagementOwnerNotification::EVENT_ASSIGNED,
            $membership->role,
        );

        return response()->json([
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ],
                'membership' => [
                    'tenant_id' => (string) $membership->tenant_id,
                    'role' => $membership->role,
                    'status' => $membership->status,
                ],
            ],
        ], 201);
    }

    public function updateUserInTenant(Request $request, Tenant $tenant, User $user)
    {
        $validated = $request->validate([
            'role' => ['required', 'string', Rule::in(['owner', 'editor', 'viewer'])],
        ]);

        $actor = $this->authenticatedActor($request);

        $membership = Membership::query()
            ->where('tenant_id', (string) $tenant->id)
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->first();

        if (! $membership) {
            return response()->json(['message' => 'Membership not found.'], 404);
        }

        if ($membership->role === 'owner' && $validated['role'] !== 'owner') {
            $activeOwnerCount = Membership::query()
                ->where('tenant_id', (string) $tenant->id)
                ->where('status', 'active')
                ->where('role', 'owner')
                ->count();

            if ($activeOwnerCount <= 1) {
                return response()->json([
                    'message' => 'Tenant must have at least one active owner.',
                ], 422);
            }
        }

        $previousRole = $membership->role;

        $membership->update([
            'role' => $validated['role'],
            'status' => 'active',
            'expires_at' => null,
        ]);

        app(TenantRbacService::class)->syncUserRoleFromMembership(
            $user,
            (string) $tenant->id,
            $membership->role,
            'api'
        );

        $this->logCentralTenantUserAction(
            'updated',
            $tenant,
            $user,
            $actor,
            sprintf('%s changed tenant role for %s on tenant %s from %s to %s', $actor->name, $user->email, $tenant->slug, $previousRole, $membership->role),
            [
                'previous_role' => $previousRole,
                'membership_role' => $membership->role,
                'membership_status' => $membership->status,
            ],
        );

        $this->logTenantUserAction(
            'updated',
            $tenant,
            $user,
            $actor,
            sprintf('Central admin %s changed %s from %s to %s', $actor->name, $user->email, $previousRole, $membership->role),
            [
                'previous_role' => $previousRole,
                'membership_role' => $membership->role,
                'membership_status' => $membership->status,
            ],
        );

        $this->notifyTenantOwners(
            $tenant,
            $user,
            $actor,
            TenantUserManagementOwnerNotification::EVENT_UPDATED,
            $membership->role,
            $previousRole,
        );

        return response()->json([
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ],
                'membership' => [
                    'tenant_id' => (string) $membership->tenant_id,
                    'role' => $membership->role,
                    'status' => $membership->status,
                ],
            ],
        ]);
    }

    // Remove user from tenant
    public function removeUserFromTenant(Tenant $tenant, User $user)
    {
        $actor = request()->user();

        if (! $actor instanceof User) {
            abort(401, 'Unauthenticated.');
        }

        $membership = Membership::query()
            ->where('tenant_id', (string) $tenant->id)
            ->where('user_id', $user->id)
            ->first();

        if (! $membership) {
            return response()->json(['message' => 'Membership not found.'], 404);
        }

        if ($membership->role === 'owner') {
            $activeOwnerCount = Membership::query()
                ->where('tenant_id', (string) $tenant->id)
                ->where('status', 'active')
                ->where('role', 'owner')
                ->count();

            if ($activeOwnerCount <= 1) {
                return response()->json([
                    'message' => 'Tenant must have at least one active owner.',
                ], 422);
            }
        }

        $previousRole = $membership->role;
        $revokedAt = now();

        DB::transaction(function () use ($membership, $tenant, $user, $revokedAt) {
            $membership->update([
                'status' => 'inactive',
                'expires_at' => $revokedAt,
            ]);

            DB::table('model_has_roles')
                ->where('model_type', $user->getMorphClass())
                ->where('model_id', $user->getKey())
                ->where('team_id', (string) $tenant->id)
                ->delete();

            $this->revokeTenantRefreshSessions($user->id, (string) $tenant->id, $revokedAt);
        });

        $this->logCentralTenantUserAction(
            'removed',
            $tenant,
            $user,
            $actor,
            sprintf('%s removed tenant access for %s on tenant %s', $actor->name, $user->email, $tenant->slug),
            [
                'previous_role' => $previousRole,
                'membership_status' => 'inactive',
                'revoked_at' => $revokedAt->toISOString(),
            ],
        );

        $this->logTenantUserAction(
            'removed',
            $tenant,
            $user,
            $actor,
            sprintf('Central admin %s removed tenant access for %s', $actor->name, $user->email),
            [
                'previous_role' => $previousRole,
                'membership_status' => 'inactive',
                'revoked_at' => $revokedAt->toISOString(),
            ],
        );

        $this->notifyTenantOwners(
            $tenant,
            $user,
            $actor,
            TenantUserManagementOwnerNotification::EVENT_REMOVED,
            null,
            $previousRole,
        );

        return response()->json(['message' => 'User removed from tenant successfully.']);
    }

    private function authenticatedActor(Request $request): User
    {
        $actor = $request->user();

        if (! $actor instanceof User) {
            abort(401, 'Unauthenticated.');
        }

        return $actor;
    }

    private function revokeTenantRefreshSessions(int $userId, string $tenantId, \Illuminate\Support\Carbon $revokedAt): void
    {
        $sessionIds = WebRefreshSession::query()
            ->where('user_id', $userId)
            ->where('tenant_id', $tenantId)
            ->pluck('id');

        WebRefreshSession::query()
            ->whereIn('id', $sessionIds)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => $revokedAt]);

        if ($sessionIds->isEmpty()) {
            return;
        }

        PassportToken::query()
            ->where('user_id', $userId)
            ->whereIn(
                'name',
                $sessionIds
                    ->map(fn (int $sessionId): string => self::BROWSER_TOKEN_NAME_PREFIX.$sessionId)
                    ->all(),
            )
            ->where('revoked', false)
            ->update(['revoked' => true]);
    }

    private function logCentralTenantUserAction(string $event, Tenant $tenant, User $subjectUser, User $actor, string $description, array $properties = []): void
    {
        activity('central')
            ->causedBy($actor)
            ->performedOn($tenant)
            ->event($event)
            ->withProperties(array_merge([
                'tenant_id' => (string) $tenant->id,
                'tenant_slug' => $tenant->slug,
                'user_id' => $subjectUser->id,
                'user_email' => $subjectUser->email,
            ], $properties))
            ->log($description);
    }

    private function logTenantUserAction(string $event, Tenant $tenant, User $subjectUser, User $actor, string $description, array $properties = []): void
    {
        TenantActivity::query()->create([
            'tenant_id' => (string) $tenant->id,
            'log_name' => 'tenant',
            'event' => $event,
            'description' => $description,
            'subject_type' => User::class,
            'subject_id' => (string) $subjectUser->id,
            'causer_type' => User::class,
            'causer_id' => $actor->id,
            'properties' => array_merge([
                'user_email' => $subjectUser->email,
            ], $properties),
        ]);
    }

    private function notifyTenantOwners(
        Tenant $tenant,
        User $managedUser,
        User $actor,
        string $event,
        ?string $currentRole = null,
        ?string $previousRole = null,
    ): void {
        $owners = Membership::query()
            ->where('tenant_id', (string) $tenant->id)
            ->where('role', 'owner')
            ->where('status', 'active')
            ->with('user')
            ->get()
            ->pluck('user')
            ->filter(fn ($owner) => $owner instanceof User && $owner->id !== $managedUser->id);

        if ($owners->isEmpty()) {
            return;
        }

        $tenant->loadMissing('domains');

        foreach ($owners as $owner) {
            $owner->notify(new TenantUserManagementOwnerNotification(
                $tenant,
                $managedUser,
                $actor,
                $event,
                $currentRole,
                $previousRole,
            ));
        }
    }

    // Settings management
    public function getSettings()
    {
        try {
            $settings = app(GeneralSettings::class);

            return response()->json([
                'data' => [
                    'site_name' => $settings->site_name,
                    'site_active' => $settings->site_active,
                    'support_email' => $settings->support_email,
                    'company_name' => $settings->company_name,
                    'max_tenants_per_user' => $settings->max_tenants_per_user,
                    // Phase 9.6 — Analytics integrations
                    'ga4_measurement_id' => $settings->ga4_measurement_id,
                    'gtm_container_id' => $settings->gtm_container_id,
                    'clarity_project_id' => $settings->clarity_project_id,
                    'plausible_domain' => $settings->plausible_domain,
                    'meta_pixel_id' => $settings->meta_pixel_id,
                    // Phase 13 — Cookie consent controls
                    'privacy_policy_url' => $settings->privacy_policy_url,
                    'cookie_policy_url' => $settings->cookie_policy_url,
                    'ga4_enabled' => $settings->ga4_enabled,
                    'gtm_enabled' => $settings->gtm_enabled,
                    'clarity_enabled' => $settings->clarity_enabled,
                    'plausible_enabled' => $settings->plausible_enabled,
                    'meta_pixel_enabled' => $settings->meta_pixel_enabled,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to load settings', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Failed to load settings',
            ], 500);
        }
    }

    public function updateSettings(Request $request)
    {
        $normalizedInput = ($this->normalizeInputFields)(
            $request->all(),
            singleLineFields: ['site_name', 'support_email', 'company_name'],
        );

        $validator = Validator::make($normalizedInput, [
            'site_name' => 'sometimes|required|string|max:255',
            'site_active' => 'sometimes|required|boolean',
            'support_email' => 'nullable|email|max:255',
            'company_name' => 'nullable|string|max:255',
            'max_tenants_per_user' => 'sometimes|required|integer|min:1|max:100',
            // Phase 9.6 — Analytics integrations (strict format to prevent script injection)
            'ga4_measurement_id' => ['nullable', 'string', 'max:50', 'regex:/^[A-Za-z0-9_\-\.]+$/'],
            'gtm_container_id' => ['nullable', 'string', 'max:50', 'regex:/^[A-Za-z0-9_\-\.]+$/'],
            'clarity_project_id' => ['nullable', 'string', 'max:50', 'regex:/^[A-Za-z0-9_\-\.]+$/'],
            'plausible_domain' => ['nullable', 'string', 'max:255', 'regex:/^[A-Za-z0-9\.\-]+$/'],
            'meta_pixel_id' => ['nullable', 'string', 'max:50', 'regex:/^[0-9]+$/'],
            // Phase 13 — Cookie consent controls
            'privacy_policy_url' => ['nullable', 'url', 'max:500'],
            'cookie_policy_url' => ['nullable', 'url', 'max:500'],
            'ga4_enabled' => ['sometimes', 'boolean'],
            'gtm_enabled' => ['sometimes', 'boolean'],
            'clarity_enabled' => ['sometimes', 'boolean'],
            'plausible_enabled' => ['sometimes', 'boolean'],
            'meta_pixel_enabled' => ['sometimes', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Evaluate final state (incoming values override existing settings)
        $settings = app(GeneralSettings::class);

        $ga4Enabled = array_key_exists('ga4_enabled', $normalizedInput) ? (bool) $normalizedInput['ga4_enabled'] : (bool) $settings->ga4_enabled;
        $gtmEnabled = array_key_exists('gtm_enabled', $normalizedInput) ? (bool) $normalizedInput['gtm_enabled'] : (bool) $settings->gtm_enabled;
        $clarityEnabled = array_key_exists('clarity_enabled', $normalizedInput) ? (bool) $normalizedInput['clarity_enabled'] : (bool) $settings->clarity_enabled;
        $plausibleEnabled = array_key_exists('plausible_enabled', $normalizedInput) ? (bool) $normalizedInput['plausible_enabled'] : (bool) $settings->plausible_enabled;
        $metaPixelEnabled = array_key_exists('meta_pixel_enabled', $normalizedInput) ? (bool) $normalizedInput['meta_pixel_enabled'] : (bool) $settings->meta_pixel_enabled;

        $ga4Id = array_key_exists('ga4_measurement_id', $normalizedInput) ? $normalizedInput['ga4_measurement_id'] : $settings->ga4_measurement_id;
        $gtmId = array_key_exists('gtm_container_id', $normalizedInput) ? $normalizedInput['gtm_container_id'] : $settings->gtm_container_id;
        $clarityId = array_key_exists('clarity_project_id', $normalizedInput) ? $normalizedInput['clarity_project_id'] : $settings->clarity_project_id;
        $plausibleDomain = array_key_exists('plausible_domain', $normalizedInput) ? $normalizedInput['plausible_domain'] : $settings->plausible_domain;
        $metaPixelId = array_key_exists('meta_pixel_id', $normalizedInput) ? $normalizedInput['meta_pixel_id'] : $settings->meta_pixel_id;
        $cookiePolicyUrl = array_key_exists('cookie_policy_url', $normalizedInput) ? $normalizedInput['cookie_policy_url'] : $settings->cookie_policy_url;

        $crossFieldErrors = [];

        if ($ga4Enabled && empty($ga4Id)) {
            $crossFieldErrors['ga4_measurement_id'][] = 'ga4_measurement_id is required when ga4_enabled is true.';
        }
        if ($gtmEnabled && empty($gtmId)) {
            $crossFieldErrors['gtm_container_id'][] = 'gtm_container_id is required when gtm_enabled is true.';
        }
        if ($clarityEnabled && empty($clarityId)) {
            $crossFieldErrors['clarity_project_id'][] = 'clarity_project_id is required when clarity_enabled is true.';
        }
        if ($plausibleEnabled && empty($plausibleDomain)) {
            $crossFieldErrors['plausible_domain'][] = 'plausible_domain is required when plausible_enabled is true.';
        }
        if ($metaPixelEnabled && empty($metaPixelId)) {
            $crossFieldErrors['meta_pixel_id'][] = 'meta_pixel_id is required when meta_pixel_enabled is true.';
        }

        if (($ga4Enabled || $gtmEnabled || $clarityEnabled || $plausibleEnabled || $metaPixelEnabled) && empty($cookiePolicyUrl)) {
            $crossFieldErrors['cookie_policy_url'][] = 'cookie_policy_url is required when any optional provider is enabled.';
        }

        if (! empty($crossFieldErrors)) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $crossFieldErrors,
            ], 422);
        }

        try {
            if (array_key_exists('site_name', $normalizedInput)) {
                $settings->site_name = $normalizedInput['site_name'];
            }
            if (array_key_exists('site_active', $normalizedInput)) {
                $settings->site_active = (bool) $normalizedInput['site_active'];
            }
            if (array_key_exists('support_email', $normalizedInput)) {
                $settings->support_email = $normalizedInput['support_email'];
            }
            if (array_key_exists('company_name', $normalizedInput)) {
                $settings->company_name = $normalizedInput['company_name'];
            }
            if (array_key_exists('max_tenants_per_user', $normalizedInput)) {
                $settings->max_tenants_per_user = (int) $normalizedInput['max_tenants_per_user'];
            }
            // Phase 9.6 — Analytics integrations
            if (array_key_exists('ga4_measurement_id', $normalizedInput)) {
                $settings->ga4_measurement_id = $normalizedInput['ga4_measurement_id'];
            }
            if (array_key_exists('gtm_container_id', $normalizedInput)) {
                $settings->gtm_container_id = $normalizedInput['gtm_container_id'];
            }
            if (array_key_exists('clarity_project_id', $normalizedInput)) {
                $settings->clarity_project_id = $normalizedInput['clarity_project_id'];
            }
            if (array_key_exists('plausible_domain', $normalizedInput)) {
                $settings->plausible_domain = $normalizedInput['plausible_domain'];
            }
            if (array_key_exists('meta_pixel_id', $normalizedInput)) {
                $settings->meta_pixel_id = $normalizedInput['meta_pixel_id'];
            }
            // Phase 13 — Cookie consent controls
            if (array_key_exists('privacy_policy_url', $normalizedInput)) {
                $settings->privacy_policy_url = $normalizedInput['privacy_policy_url'];
            }
            if (array_key_exists('cookie_policy_url', $normalizedInput)) {
                $settings->cookie_policy_url = $normalizedInput['cookie_policy_url'];
            }
            if (array_key_exists('ga4_enabled', $normalizedInput)) {
                $settings->ga4_enabled = (bool) $normalizedInput['ga4_enabled'];
            }
            if (array_key_exists('gtm_enabled', $normalizedInput)) {
                $settings->gtm_enabled = (bool) $normalizedInput['gtm_enabled'];
            }
            if (array_key_exists('clarity_enabled', $normalizedInput)) {
                $settings->clarity_enabled = (bool) $normalizedInput['clarity_enabled'];
            }
            if (array_key_exists('plausible_enabled', $normalizedInput)) {
                $settings->plausible_enabled = (bool) $normalizedInput['plausible_enabled'];
            }
            if (array_key_exists('meta_pixel_enabled', $normalizedInput)) {
                $settings->meta_pixel_enabled = (bool) $normalizedInput['meta_pixel_enabled'];
            }

            $settings->save();

            // Log activity
            $causer = auth('api')->user();
            activity('central')
                ->causedBy($causer)
                ->event('updated')
                ->withProperties([
                    'attributes' => $request->only([
                        'site_name',
                        'site_active',
                        'support_email',
                        'company_name',
                        'max_tenants_per_user',
                        'ga4_measurement_id',
                        'gtm_container_id',
                        'clarity_project_id',
                        'plausible_domain',
                        'meta_pixel_id',
                        'privacy_policy_url',
                        'cookie_policy_url',
                        'ga4_enabled',
                        'gtm_enabled',
                        'clarity_enabled',
                        'plausible_enabled',
                        'meta_pixel_enabled',
                    ]),
                ])
                ->log('General settings updated');

            return response()->json([
                'message' => 'Settings updated successfully',
                'data' => [
                    'site_name' => $settings->site_name,
                    'site_active' => $settings->site_active,
                    'support_email' => $settings->support_email,
                    'company_name' => $settings->company_name,
                    'max_tenants_per_user' => $settings->max_tenants_per_user,
                    // Phase 9.6 — Analytics integrations
                    'ga4_measurement_id' => $settings->ga4_measurement_id,
                    'gtm_container_id' => $settings->gtm_container_id,
                    'clarity_project_id' => $settings->clarity_project_id,
                    'plausible_domain' => $settings->plausible_domain,
                    'meta_pixel_id' => $settings->meta_pixel_id,
                    // Phase 13 — Cookie consent controls
                    'privacy_policy_url' => $settings->privacy_policy_url,
                    'cookie_policy_url' => $settings->cookie_policy_url,
                    'ga4_enabled' => $settings->ga4_enabled,
                    'gtm_enabled' => $settings->gtm_enabled,
                    'clarity_enabled' => $settings->clarity_enabled,
                    'plausible_enabled' => $settings->plausible_enabled,
                    'meta_pixel_enabled' => $settings->meta_pixel_enabled,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to update settings', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Failed to update settings',
            ], 500);
        }
    }
}
