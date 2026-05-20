<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Booking;
use App\Models\Membership;
use App\Models\Quote;
use App\Models\QuoteRequest;
use App\Models\Tenant;
use App\Models\User;
use App\Notifications\Quotes\QuoteSentNotification;
use App\Notifications\Quotes\TenantNewQuoteRequestNotification;
use App\Notifications\Quotes\TenantQuoteLifecycleNotification;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Notification;

class QuoteWorkflowService
{
    public function handleRequestSubmitted(QuoteRequest $quoteRequest): void
    {
        $this->logActivity(
            subject: $quoteRequest,
            event: 'submitted',
            description: 'Quote request submitted',
            properties: [
                'guest_email' => $quoteRequest->guest_email,
                'requested_booking_service_id' => $quoteRequest->requested_booking_service_id,
            ],
        );

        $owner = $this->tenantOwner((string) $quoteRequest->tenant_id);
        if ($owner) {
            $owner->notify(new TenantNewQuoteRequestNotification($quoteRequest, $this->tenantDomain((string) $quoteRequest->tenant_id)));
        }
    }

    public function handleManualRequestCreated(QuoteRequest $quoteRequest, ?Authenticatable $causer = null): void
    {
        $this->logActivity(
            subject: $quoteRequest,
            event: 'submitted',
            description: 'Manual quote request created',
            causer: $causer,
            properties: [
                'guest_email' => $quoteRequest->guest_email,
                'requested_booking_service_id' => $quoteRequest->requested_booking_service_id,
                'origin_surface' => $quoteRequest->origin_surface,
            ],
        );
    }

    public function handleDraftCreated(Quote $quote, ?Authenticatable $causer = null): void
    {
        $this->logActivity(
            subject: $quote,
            event: 'drafted',
            description: 'Quote drafted',
            causer: $causer,
            properties: [
                'quote_request_id' => $quote->quote_request_id,
                'version' => $quote->version,
                'total_minor' => $quote->total_minor,
            ],
        );
    }

    public function handleSent(Quote $quote, string $publicToken, ?Authenticatable $causer = null): void
    {
        $quote->loadMissing('request');

        $this->logActivity(
            subject: $quote,
            event: 'sent',
            description: 'Quote sent',
            causer: $causer,
            properties: [
                'quote_request_id' => $quote->quote_request_id,
                'guest_email' => $quote->request?->guest_email,
            ],
        );

        if ($quote->request?->guest_email) {
            Notification::route('mail', [$quote->request->guest_email => $quote->request->guest_name])
                ->notify(new QuoteSentNotification($quote, $this->tenantDomain((string) $quote->tenant_id), $publicToken));
        }
    }

    public function handleAccepted(Quote $quote): void
    {
        $this->handleLifecycleTransition($quote, TenantQuoteLifecycleNotification::EVENT_ACCEPTED, 'accepted', 'Quote accepted');
    }

    public function handleRejected(Quote $quote): void
    {
        $this->handleLifecycleTransition($quote, TenantQuoteLifecycleNotification::EVENT_REJECTED, 'rejected', 'Quote rejected');
    }

    public function handleExpired(Quote $quote): void
    {
        $this->handleLifecycleTransition($quote, TenantQuoteLifecycleNotification::EVENT_EXPIRED, 'expired', 'Quote expired');
    }

    public function handleCancelled(Quote $quote, ?Authenticatable $causer = null): void
    {
        $quote->loadMissing('request');

        $this->logActivity(
            subject: $quote,
            event: 'cancelled',
            description: 'Quote cancelled by tenant',
            causer: $causer,
            properties: [
                'quote_request_id' => $quote->quote_request_id,
                'guest_email' => $quote->request?->guest_email,
            ],
        );
    }

    public function handleDeleted(Quote $quote, ?Authenticatable $causer = null): void
    {
        $this->logActivity(
            subject: $quote,
            event: 'deleted',
            description: 'Draft quote deleted',
            causer: $causer,
            properties: [
                'quote_request_id' => $quote->quote_request_id,
                'version' => $quote->version,
                'status' => $quote->status,
            ],
        );
    }

    public function handleConverted(Quote $quote, Booking $booking, ?Authenticatable $causer = null): void
    {
        $this->logActivity(
            subject: $quote,
            event: 'converted',
            description: 'Quote converted to booking',
            causer: $causer,
            properties: [
                'quote_request_id' => $quote->quote_request_id,
                'booking_id' => $booking->id,
            ],
        );

        $owner = $this->tenantOwner((string) $quote->tenant_id);
        if ($owner) {
            $owner->notify(new TenantQuoteLifecycleNotification(
                $quote,
                $this->tenantDomain((string) $quote->tenant_id),
                TenantQuoteLifecycleNotification::EVENT_CONVERTED,
                $booking->id,
            ));
        }
    }

    private function handleLifecycleTransition(Quote $quote, string $notificationEvent, string $activityEvent, string $description): void
    {
        $quote->loadMissing('request');

        $this->logActivity(
            subject: $quote,
            event: $activityEvent,
            description: $description,
            properties: [
                'quote_request_id' => $quote->quote_request_id,
                'guest_email' => $quote->request?->guest_email,
            ],
        );

        $owner = $this->tenantOwner((string) $quote->tenant_id);
        if ($owner) {
            $owner->notify(new TenantQuoteLifecycleNotification(
                $quote,
                $this->tenantDomain((string) $quote->tenant_id),
                $notificationEvent,
            ));
        }
    }

    private function logActivity(
        Model $subject,
        string $event,
        string $description,
        ?Authenticatable $causer = null,
        array $properties = [],
    ): void {
        $logger = activity('quotes')
            ->performedOn($subject)
            ->event($event)
            ->withProperties($properties);

        if ($causer instanceof User) {
            $logger->causedBy($causer);
        }

        $logger->log($description);
    }

    private function tenantOwner(string $tenantId): ?User
    {
        $tenant = Tenant::query()->find($tenantId);
        if (! $tenant) {
            return null;
        }

        $memberships = Membership::query()
            ->where('tenant_id', $tenantId)
            ->where('role', 'owner')
            ->where('status', 'active')
            ->with('user')
            ->get();

        $membership = $memberships->first(function (Membership $membership) use ($tenant): bool {
            return $membership->user !== null
                && str_contains($membership->user->email, $tenant->domain ?? $tenant->slug);
        }) ?? $memberships->first();

        return $membership?->user;
    }

    private function tenantDomain(string $tenantId): string
    {
        $tenant = Tenant::query()->with('domains')->findOrFail($tenantId);
        $fallbackTemplate = (string) config('tenancy.fallback_tenant_domain_template', ':tenant.localhost');

        return $tenant->domains()->first()?->domain
            ?? str_replace(':tenant', $tenant->slug, $fallbackTemplate);
    }
}
