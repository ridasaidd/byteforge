<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Addon;
use App\Models\Plan;
use App\Models\Tenant;
use App\Services\BillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Stripe\Exception\SignatureVerificationException;
use Stripe\Webhook;
use UnexpectedValueException;

class BillingController extends Controller
{
    public function __construct(private readonly BillingService $billingService) {}

    public function plans(): JsonResponse
    {
        return response()->json([
            'data' => $this->billingService->listPlans(),
        ]);
    }

    public function addons(Request $request): JsonResponse
    {
        $tenant = $this->resolveTenant($request);

        return response()->json([
            'data' => $this->billingService->listAddonsForTenant($tenant),
        ]);
    }

    public function subscription(Request $request): JsonResponse
    {
        $tenant = $this->resolveTenant($request);

        return response()->json([
            'data' => $this->billingService->getSubscriptionSummary($tenant),
        ]);
    }

    public function checkout(Request $request): JsonResponse
    {
        $validated = Validator::make($request->all(), [
            'tenant_id' => ['required', 'string', 'exists:tenants,id'],
            'plan_slug' => ['required', 'string', 'exists:plans,slug'],
            'success_url' => ['required', 'url'],
            'cancel_url' => ['required', 'url'],
        ])->validate();

        $this->assertAllowedRedirectUrl($validated['success_url']);
        $this->assertAllowedRedirectUrl($validated['cancel_url']);

        $tenant = Tenant::query()->findOrFail($validated['tenant_id']);
        $plan = Plan::query()->bySlug($validated['plan_slug'])->firstOrFail();

        $result = $this->billingService->createCheckout(
            $tenant,
            $plan,
            $validated['success_url'],
            $validated['cancel_url']
        );

        return response()->json($result);
    }

    public function activateAddon(Request $request, Addon $addon): JsonResponse
    {
        $tenant = $this->resolveTenant($request);

        return response()->json([
            'data' => $this->billingService->activateAddon($tenant, $addon),
        ]);
    }

    public function deactivateAddon(Request $request, Addon $addon): JsonResponse
    {
        $tenant = $this->resolveTenant($request);

        return response()->json([
            'data' => $this->billingService->deactivateAddon($tenant, $addon),
        ]);
    }

    public function portal(Request $request): JsonResponse
    {
        $validated = Validator::make($request->all(), [
            'tenant_id' => ['required', 'string', 'exists:tenants,id'],
            'return_url' => ['required', 'url'],
        ])->validate();

        $this->assertAllowedRedirectUrl($validated['return_url']);

        $tenant = Tenant::query()->findOrFail($validated['tenant_id']);

        return response()->json($this->billingService->getPortalUrl($tenant, $validated['return_url']));
    }

    public function syncSubscription(Request $request): JsonResponse
    {
        $tenant = $this->resolveTenant($request);

        return response()->json([
            'data' => $this->billingService->syncSubscription($tenant),
        ]);
    }

    public function handleWebhook(Request $request): JsonResponse
    {
        $secret = (string) config('cashier.webhook.secret', '');
        $signature = (string) $request->header('Stripe-Signature', '');

        try {
            $event = Webhook::constructEvent($request->getContent(), $signature, $secret);
        } catch (SignatureVerificationException $e) {
            return response()->json(['message' => 'Invalid Stripe signature.'], 403);
        } catch (UnexpectedValueException $e) {
            return response()->json(['message' => 'Invalid Stripe payload.'], 400);
        }

        // Idempotency: skip events already processed
        $eventId = $event->id;
        if (is_string($eventId) && $eventId !== '') {
            $alreadyProcessed = DB::table('processed_stripe_events')
                ->where('stripe_event_id', $eventId)
                ->exists();

            if ($alreadyProcessed) {
                return response()->json([
                    'received' => true,
                    'event' => $event->type,
                    'skipped' => 'duplicate',
                ]);
            }
        }

        $this->billingService->processStripeWebhook($event->toArray());

        // Record event as processed
        if (is_string($eventId) && $eventId !== '') {
            DB::table('processed_stripe_events')->insert([
                'stripe_event_id' => $eventId,
                'event_type' => $event->type,
                'processed_at' => now(),
            ]);
        }

        return response()->json([
            'received' => true,
            'event' => $event->type,
        ]);
    }

    private function assertAllowedRedirectUrl(string $url): void
    {
        $host = parse_url($url, PHP_URL_HOST);
        if (!is_string($host)) {
            throw ValidationException::withMessages(['url' => 'Invalid redirect URL.']);
        }

        $centralDomains = (array) config('tenancy.central_domains', []);
        $allowed = false;
        foreach ($centralDomains as $domain) {
            if ($host === $domain || str_ends_with($host, '.' . $domain)) {
                $allowed = true;
                break;
            }
        }

        if (!$allowed) {
            throw ValidationException::withMessages(['url' => 'Redirect URL must belong to an allowed domain.']);
        }
    }

    private function resolveTenant(Request $request): Tenant
    {
        $validated = Validator::make($request->all(), [
            'tenant_id' => ['required', 'string', 'exists:tenants,id'],
        ])->validate();

        return Tenant::query()->findOrFail($validated['tenant_id']);
    }
}
