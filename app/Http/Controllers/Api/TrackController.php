<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AnalyticsEvent;
use App\Services\AnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * TrackController
 *
 * Public (unauthenticated) beacon endpoint for client-side analytics.
 * Only a curated whitelist of event types are accepted to prevent abuse.
 *
 * POST /api/analytics/track
 *   → 204 No Content on success
 *   → 422 on validation failure
 *
 * Rate-limited: 60 requests per minute per IP (applied at route level).
 */
class TrackController extends Controller
{
    /**
     * Event types the public may submit.
     * Extend this list as new self-service events are needed.
     */
    private const ALLOWED_PUBLIC_EVENTS = [
        AnalyticsEvent::TYPE_PAGE_VIEWED,
    ];

    public function __construct(private readonly AnalyticsService $analyticsService) {}

    public function store(Request $request): Response|JsonResponse
    {
        $request->validate([
            'event_type' => [
                'required',
                'string',
                'in:' . implode(',', self::ALLOWED_PUBLIC_EVENTS),
            ],
            'properties'           => ['sometimes', 'array'],
            'properties.page_id'   => ['sometimes', 'integer'],
            'properties.slug'      => ['sometimes', 'string', 'max:255'],
            'properties.title'     => ['sometimes', 'string', 'max:255'],
        ]);

        $this->analyticsService->record(
            $request->input('event_type'),
            $request->input('properties', []),
        );

        return response()->noContent();
    }
}
