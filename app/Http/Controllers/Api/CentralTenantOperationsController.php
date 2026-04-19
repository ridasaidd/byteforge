<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Page;
use App\Models\Tenant;
use App\Models\TenantActivity;
use App\Models\Theme;
use App\Services\ThemeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CentralTenantOperationsController extends Controller
{
    public function __construct(
        private readonly ThemeService $themeService,
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
}
