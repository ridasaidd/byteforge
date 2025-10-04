<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TenantActivity;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    /**
     * Display a listing of activity logs for the current tenant.
     */
    public function index(Request $request)
    {
        $query = TenantActivity::forTenant()
            ->with(['subject', 'causer'])
            ->orderBy('created_at', 'desc');

        // Filter by subject type (e.g., "pages", "navigations")
        if ($request->has('subject_type')) {
            $subjectType = $request->subject_type;
            // Convert friendly names to full class names
            $typeMap = [
                'pages' => \App\Models\Page::class,
                'navigations' => \App\Models\Navigation::class,
                'users' => \App\Models\User::class,
            ];
            
            if (isset($typeMap[$subjectType])) {
                $query->where('subject_type', $typeMap[$subjectType]);
            }
        }

        // Filter by event (created, updated, deleted)
        if ($request->has('event')) {
            $query->where('event', $request->event);
        }

        // Filter by causer (user who made the change)
        if ($request->has('causer_id')) {
            $query->where('causer_id', $request->causer_id);
        }

        // Pagination
        $perPage = $request->input('per_page', 15);
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
            ]
        ]);
    }

    /**
     * Display a specific activity log.
     */
    public function show(string $id)
    {
        $activity = TenantActivity::forTenant()
            ->with(['subject', 'causer'])
            ->findOrFail($id);

        return response()->json([
            'data' => [
                'id' => $activity->id,
                'log_name' => $activity->log_name,
                'description' => $activity->description,
                'event' => $activity->event,
                'subject_type' => $activity->subject_type,
                'subject_id' => $activity->subject_id,
                'subject' => $activity->subject,
                'causer' => $activity->causer ? [
                    'id' => $activity->causer->id,
                    'name' => $activity->causer->name,
                    'email' => $activity->causer->email,
                ] : null,
                'properties' => $activity->properties,
                'created_at' => $activity->created_at,
                'updated_at' => $activity->updated_at,
            ]
        ]);
    }
}
