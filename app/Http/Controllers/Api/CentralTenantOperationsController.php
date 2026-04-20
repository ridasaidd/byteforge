<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Page;
use App\Models\Tenant;
use App\Models\TenantActivity;
use App\Models\TenantSupportAccessGrant;
use App\Models\Theme;
use App\Models\User;
use App\Services\TenantSupportAccessService;
use App\Services\ThemeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Validator;

class CentralTenantOperationsController extends Controller
{
    public function __construct(
        private readonly ThemeService $themeService,
        private readonly TenantSupportAccessService $tenantSupportAccess,
    ) {}

    public function summary(Tenant $tenant): JsonResponse
    {
        $tenantId = (string) $tenant->id;
        $activeTheme = $this->themeService->getActiveTheme($tenantId);

        return response()->json([
            'data' => [
                'tenant' => [
                    'id' => $tenant->id,
                    'name' => $tenant->name,
                    'slug' => $tenant->slug,
                    'domain' => $tenant->domains()->first()?->domain,
                    'created_at' => $tenant->created_at?->toISOString(),
                    'updated_at' => $tenant->updated_at?->toISOString(),
                ],
                'stats' => [
                    'total_pages' => Page::query()->where('tenant_id', $tenantId)->count(),
                    'published_pages' => Page::query()->where('tenant_id', $tenantId)->where('status', 'published')->count(),
                    'total_themes' => Theme::query()->where('tenant_id', $tenantId)->count(),
                    'recent_activity_count' => TenantActivity::query()->forTenant($tenantId)->count(),
                ],
                'active_theme' => $activeTheme ? [
                    'id' => $activeTheme->id,
                    'name' => $activeTheme->name,
                    'slug' => $activeTheme->slug,
                    'is_active' => (bool) $activeTheme->is_active,
                    'updated_at' => $activeTheme->updated_at?->toISOString(),
                ] : null,
            ],
        ]);
    }

    public function themes(Tenant $tenant): JsonResponse
    {
        $tenantId = (string) $tenant->id;
        $activeTheme = $this->themeService->getActiveTheme($tenantId);
        $clonedSlugs = Theme::query()->where('tenant_id', $tenantId)->pluck('slug')->all();

        $themes = Theme::query()
            ->where(function ($query) use ($tenantId, $clonedSlugs) {
                $query->where('tenant_id', $tenantId)
                    ->orWhere(function ($system) use ($clonedSlugs) {
                        $system->whereNull('tenant_id')
                            ->where('is_system_theme', true);

                        if (! empty($clonedSlugs)) {
                            $system->whereNotIn('slug', $clonedSlugs);
                        }
                    });
            })
            ->orderByDesc('tenant_id')
            ->orderBy('name')
            ->get()
            ->map(function (Theme $theme) use ($activeTheme) {
                return [
                    'id' => $theme->id,
                    'tenant_id' => $theme->tenant_id,
                    'name' => $theme->name,
                    'slug' => $theme->slug,
                    'description' => $theme->description,
                    'is_system_theme' => (bool) $theme->is_system_theme,
                    'is_active' => $activeTheme !== null && $theme->id === $activeTheme->id,
                    'updated_at' => $theme->updated_at?->toISOString(),
                ];
            })
            ->values();

        return response()->json([
            'data' => $themes,
        ]);
    }

    public function pages(Request $request, Tenant $tenant): JsonResponse
    {
        $tenantId = (string) $tenant->id;
        $query = Page::query()->where('tenant_id', $tenantId);

        $validStatuses = ['draft', 'published', 'archived'];
        $validPageTypes = ['general', 'home', 'about', 'contact', 'blog', 'service', 'product', 'custom'];

        if ($request->has('status') && in_array($request->input('status'), $validStatuses, true)) {
            $query->where('status', $request->input('status'));
        }

        if ($request->has('page_type') && in_array($request->input('page_type'), $validPageTypes, true)) {
            $query->where('page_type', $request->input('page_type'));
        }

        if ($request->has('search')) {
            $search = str_replace(['%', '_'], ['\\%', '\\_'], (string) $request->input('search'));
            $query->where(function ($inner) use ($search) {
                $inner->where('title', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        $perPage = min((int) $request->input('per_page', 15), 100);
        $pages = $query->orderBy('sort_order')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'data' => collect($pages->items())->map(function (Page $page) {
                return [
                    'id' => $page->id,
                    'title' => $page->title,
                    'slug' => $page->slug,
                    'page_type' => $page->page_type,
                    'status' => $page->status,
                    'is_homepage' => (bool) $page->is_homepage,
                    'published_at' => $page->published_at?->toISOString(),
                    'updated_at' => $page->updated_at->toISOString(),
                ];
            })->values()->all(),
            'meta' => [
                'current_page' => $pages->currentPage(),
                'last_page' => $pages->lastPage(),
                'per_page' => $pages->perPage(),
                'total' => $pages->total(),
            ],
        ]);
    }

    public function activity(Request $request, Tenant $tenant): JsonResponse
    {
        $query = TenantActivity::query()
            ->forTenant((string) $tenant->id)
            ->with(['subject', 'causer'])
            ->orderBy('created_at', 'desc');

        if ($request->has('event')) {
            $validEvents = ['created', 'updated', 'deleted', 'restored'];
            if (in_array($request->input('event'), $validEvents, true)) {
                $query->where('event', $request->input('event'));
            }
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
            })->values()->all(),
            'meta' => [
                'current_page' => $activities->currentPage(),
                'last_page' => $activities->lastPage(),
                'per_page' => $activities->perPage(),
                'total' => $activities->total(),
            ],
        ]);
    }

    public function activateTheme(Request $request, Tenant $tenant): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'slug' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $theme = $this->themeService->activateTheme($request->input('slug'), (string) $tenant->id);

        if (! $theme) {
            return response()->json([
                'message' => 'Theme not found',
            ], 404);
        }

        return response()->json([
            'data' => $theme,
            'message' => 'Tenant theme activated successfully',
        ]);
    }

    public function supportAccess(Tenant $tenant): JsonResponse
    {
        return response()->json([
            'data' => $this->buildSupportAccessOverview($tenant),
        ]);
    }

    public function grantSupportAccess(Request $request, Tenant $tenant): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'support_user_id' => 'required|integer|exists:users,id',
            'reason' => 'required|string|max:1000',
            'duration_hours' => 'required|integer|min:1|max:168',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $supportUser = User::query()->findOrFail((int) $request->integer('support_user_id'));
        $actor = $request->user();

        if (! $actor instanceof User) {
            abort(401, 'Unauthenticated.');
        }

        $grant = $this->tenantSupportAccess->grant(
            $tenant,
            $supportUser,
            $actor,
            (string) $request->input('reason'),
            (int) $request->integer('duration_hours'),
        );

        return response()->json([
            'data' => $this->formatSupportGrant(
                $grant,
                $this->buildOtherActiveGrantMap(collect([$supportUser->id]), (string) $tenant->id)->get($supportUser->id, collect())
            ),
            'message' => 'Temporary support access granted successfully',
        ], 201);
    }

    public function revokeSupportAccess(Request $request, Tenant $tenant, TenantSupportAccessGrant $grant): JsonResponse
    {
        if ((string) $grant->tenant_id !== (string) $tenant->id) {
            return response()->json(['message' => 'Support grant not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'reason' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $actor = $request->user();

        if (! $actor instanceof User) {
            abort(401, 'Unauthenticated.');
        }

        $grant = $this->tenantSupportAccess->revoke(
            $grant,
            $actor,
            $request->filled('reason') ? (string) $request->input('reason') : null,
        );

        return response()->json([
            'data' => $this->formatSupportGrant($grant),
            'message' => 'Temporary support access revoked successfully',
        ]);
    }

    private function buildSupportAccessOverview(Tenant $tenant): array
    {
        $tenantId = (string) $tenant->id;

        $grants = TenantSupportAccessGrant::query()
            ->where('tenant_id', $tenantId)
            ->with(['supportUser:id,name,email', 'grantedBy:id,name,email', 'revokedBy:id,name,email'])
            ->orderByDesc('created_at')
            ->get();

        $grantOtherActiveMap = $this->buildOtherActiveGrantMap(
            $grants->pluck('support_user_id')->filter()->unique()->values(),
            $tenantId,
        );

        $eligibleUsers = User::query()
            ->whereHas('roles', function ($query) {
                $query->where('roles.guard_name', 'api')
                    ->whereNull('roles.team_id')
                    ->where('roles.name', 'support');
            })
            ->with(['roles:id,name'])
            ->orderBy('name')
            ->get();

        $eligibleUserOtherActiveMap = $this->buildOtherActiveGrantMap(
            $eligibleUsers->pluck('id')->values(),
            $tenantId,
        );

        return [
            'grants' => $grants
                ->map(fn (TenantSupportAccessGrant $grant) => $this->formatSupportGrant(
                    $grant,
                    $grantOtherActiveMap->get($grant->support_user_id, collect())
                ))
                ->values(),
            'eligible_users' => $eligibleUsers
                ->map(fn (User $user) => $this->formatEligibleSupportUser(
                    $user,
                    $eligibleUserOtherActiveMap->get($user->id, collect())
                ))
                ->values(),
        ];
    }

    private function formatSupportGrant(TenantSupportAccessGrant $grant, ?Collection $otherActiveGrants = null): array
    {
        $otherActiveGrants ??= collect();

        $isEffective = $grant->status === 'active'
            && $grant->revoked_at === null
            && $grant->starts_at !== null
            && $grant->starts_at->lte(now())
            && $grant->expires_at !== null
            && $grant->expires_at->gt(now());

        return [
            'id' => $grant->id,
            'tenant_id' => $grant->tenant_id,
            'status' => $grant->status,
            'is_effective' => $isEffective,
            'reason' => $grant->reason,
            'revoke_reason' => $grant->revoke_reason,
            'starts_at' => $grant->starts_at?->toISOString(),
            'expires_at' => $grant->expires_at?->toISOString(),
            'revoked_at' => $grant->revoked_at?->toISOString(),
            'last_used_at' => $grant->last_used_at?->toISOString(),
            'support_user' => $grant->supportUser ? [
                'id' => $grant->supportUser->id,
                'name' => $grant->supportUser->name,
                'email' => $grant->supportUser->email,
            ] : null,
            'granted_by' => $grant->grantedBy ? [
                'id' => $grant->grantedBy->id,
                'name' => $grant->grantedBy->name,
                'email' => $grant->grantedBy->email,
            ] : null,
            'revoked_by' => $grant->revokedBy ? [
                'id' => $grant->revokedBy->id,
                'name' => $grant->revokedBy->name,
                'email' => $grant->revokedBy->email,
            ] : null,
            'other_active_grants_count' => $otherActiveGrants->count(),
            'other_active_grants' => $otherActiveGrants->values()->all(),
            'created_at' => $grant->created_at?->toISOString(),
            'updated_at' => $grant->updated_at?->toISOString(),
        ];
    }

    private function formatEligibleSupportUser(User $user, Collection $otherActiveGrants): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'roles' => $user->roles->pluck('name')->values()->all(),
            'other_active_grants_count' => $otherActiveGrants->count(),
            'other_active_grants' => $otherActiveGrants->values()->all(),
        ];
    }

    private function buildOtherActiveGrantMap(Collection $supportUserIds, string $currentTenantId): Collection
    {
        $supportUserIds = $supportUserIds->filter()->unique()->values();

        if ($supportUserIds->isEmpty()) {
            return collect();
        }

        return TenantSupportAccessGrant::query()
            ->effective()
            ->whereIn('support_user_id', $supportUserIds)
            ->where('tenant_id', '!=', $currentTenantId)
            ->with(['tenant.domains'])
            ->orderBy('expires_at')
            ->get()
            ->groupBy('support_user_id')
            ->map(function (Collection $grants) {
                return $grants
                    ->unique('tenant_id')
                    ->values()
                    ->map(fn (TenantSupportAccessGrant $grant) => $this->formatOtherActiveGrant($grant));
            });
    }

    private function formatOtherActiveGrant(TenantSupportAccessGrant $grant): array
    {
        $tenant = $grant->tenant;

        return [
            'tenant_id' => $grant->tenant_id,
            'tenant_name' => $tenant?->name ?? $grant->tenant_id,
            'tenant_slug' => $tenant?->slug,
            'tenant_domain' => $tenant?->domains->first()?->domain,
            'expires_at' => $grant->expires_at?->toISOString(),
        ];
    }
}
