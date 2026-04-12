# Phase 14: Payment × Booking Integration

**Status**: Implementation complete (Apr 8, 2026)  
**Branch**: `feature/phase14-payment-booking`  
**Depends on**: Phase 10 (Payments Core) ✅, Phase 13 (Booking System) ✅, Phase 12 (Tenant Runtime) ✅  
**Unlocks**: Phase 15 (Guest Authentication System)  

---

## Overview

Phase 14 integrates the payment system (Phase 10) with the booking system (Phase 13) to enable service-based tenants to collect payment deposits or full fees for bookings.

**Key principle**: Payment is bundled with booking as a single tenant experience. Payment configuration appears inside the Booking settings page when booking add-on is active, and payment validation is tied to booking service setup. Refund flows are automated on cancellation.

---

## Strategic Decisions

### 1. Per-Service Payment Configuration
- Each **BookingService** has a boolean `requires_payment` flag, not per-tenant
- Allows flexibility: some services free, some paid within the same tenant
- Example: hairdresser offers free consultations, paid haircuts

### 2. Conditional Payment Flow
- If `BookingService::requires_payment` = true AND tenant has active payment providers:
  - Hold confirmation triggers payment creation
  - Booking transitions to `awaiting_payment` status
  - Webhook confirmation → `confirmed` status
- If conditions not met: existing booking flow (auto-confirm or pending) continues unchanged

### 3. No Standalone Payment Addon UI
- Payment add-on is **internal only** — never surfaced as a toggle for users
- Payment configuration lives in Booking settings (if booking add-on is active)
- `addon:payment` middleware check piggybacks on `addon:booking` check

### 4. Bundled Addon Model
- Payment add-on is **free when paired with booking**
- Billing: charge for booking add-on only
- Internal: payment is a feature of booking, not a separate product

### 5. Automatic Refunds on Cancellation
- Cancellation (customer or staff) automatically triggers full refund if payment exists
- Refund state is tracked separately from booking state
- If refund fails, cancellation is rejected (safeguard against lost money)

---

## Data Model Changes

### New Migration: `add_requires_payment_to_booking_services_table`

```sql
ALTER TABLE booking_services ADD COLUMN requires_payment BOOLEAN NOT NULL DEFAULT FALSE;
```

### Updated Models

#### BookingService
- **New property**: `requires_payment` (boolean, cast)
- **Updated fillable**: includes `requires_payment`

#### Booking
- **Existing column**: `payment_id` (already exists from Phase 13 schema)
- **Already exists**: `status` enum includes `awaiting_payment`
- No new columns required

#### AnalyticsEvent
- **New type constant**: `TYPE_BOOKING_PAYMENT_RECEIVED = 'booking.payment_received'`
- Records when payment is successfully received for a booking

---

## Core Services

### BookingPaymentService

**Location**: `app/Services/BookingPaymentService.php`

**Responsibilities**:
1. Determine if booking requires payment (`bookingRequiresPayment()`)
   - Service has `requires_payment = true`
   - Service has price > 0
   - Tenant has active payment providers

2. Create payment for booking (`createPaymentForBooking()`)
   - Calls PaymentService to create payment record
   - Sets booking status to `awaiting_payment`
   - Logs booking event
   - Returns Payment model or null

3. Confirm booking after payment (`confirmBookingAfterPayment()`)
   - Validates booking is in `awaiting_payment` status
   - Updates status to `confirmed`
   - Logs booking event
   - Records analytics events
   - Sends confirmation notification
   - Called by webhook handlers

4. Process refunds (`refundBookingIfPaid()`)
   - Checks if booking has associated payment
   - Validates payment is in refundable state
   - Calls RefundService to initiate refund
   - Returns boolean success status
   - Called during cancellation flows

**Dependencies Injected**:
- `PaymentService` — creates payments
- `RefundService` — processes refunds
- `AnalyticsService` — records analytics events

---

## API Flow Changes

### Booking Hold Confirmation Flow (Updated)

```
POST /api/public/booking/hold/{token}
├─ Load booking (status = pending_hold)
├─ Check expiry
├─ NEW: Check if payment required via BookingPaymentService::bookingRequiresPayment()
│  ├─ If YES:
│  │  ├─ Call BookingPaymentService::createPaymentForBooking()
│  │  ├─ Payment creation succeeds:
│  │  │  └─ Booking status → awaiting_payment
│  │  ├─ Payment creation fails:
│  │  │  └─ Return 422 error
│  │  └─ Return 200 with payment_id in response (for frontend redirect)
│  └─ If NO:
│     ├─ Proceed with existing flow (auto_confirm → confirmed or pending)
│     └─ Send notifications, return 200
```

**Response** (with payment):
```json
{
  "data": {
    "booking_id": 123,
    "starts_at": "2026-04-15T10:00:00Z",
    "ends_at": "2026-04-15T10:30:00Z",
    "status": "awaiting_payment",
    "payment_id": 456,
    "message": "Payment required. Redirecting to payment provider..."
  }
}
```

### Booking Cancellation Flow (Updated)

#### Customer Cancellation
```
PATCH /api/public/booking/{token}/cancel
├─ Load booking
├─ Validate status (pending, confirmed, or awaiting_payment)
├─ NEW: If payment_id exists:
│  ├─ Call BookingPaymentService::refundBookingIfPaid()
│  ├─ If refund fails:
│  │  └─ Return 422 error (cancellation blocked)
│  └─ If refund succeeds (or no payment):
│     └─ Continue to booking cancellation
├─ Update booking status → cancelled
├─ Log booking event
├─ Send cancellation notification
└─ Return 200
```

#### Staff Cancellation
```
POST /api/bookings/{id}/cancel
├─ Same flow as customer cancellation
├─ Additional: log staff user ID in booking event
```

### Webhook → Booking Confirmation Flow (New)

```
POST /payments/{provider}/webhook
├─ Validate webhook signature
├─ Process payment status update
├─ If status = succeeded/completed:
│  ├─ NEW: Call PaymentWebhookController::confirmBookingIfLinked()
│  │  ├─ Extract booking ID from payment.metadata.reference ("booking:{id}")
│  │  ├─ Call BookingPaymentService::confirmBookingAfterPayment()
│  │  ├─ Booking status → confirmed
│  │  ├─ Send confirmation notification
│  │  └─ Log analytics events
│  └─ Record payment analytics event
└─ Return 200 received
```

**Payment Reference Format**:
- When BookingPaymentService creates payment, `metadata.reference` is set to `"booking:{booking_id}"`
- Webhook handler extracts booking ID from this metadata value

---

## Controllers Updated

### PublicBookingController
- **Constructor**: added `BookingPaymentService` dependency
- **`confirmHold()`**: added payment requirement check and payment creation logic
- **`cancel()`**: added refund processing logic

### BookingManagementController
- **Constructor**: added `BookingPaymentService` dependency
- **`cancel()`**: added refund processing logic for staff-initiated cancellations

### PaymentWebhookController
- **Constructor**: added `BookingPaymentService` dependency
- **Helper method**: `confirmBookingIfLinked()` extracts booking ID from `payment.metadata.reference` and confirms booking

---

## Analytics Integration

### New Event Type
- **Event**: `booking.payment_received`
- **Trigger**: When payment is successfully received and booking is confirmed
- **Properties**:
  ```php
  [
      'booking_id' => int,
      'service_name' => string,
      'payment_id' => int,
      'amount' => decimal,
      'currency' => string,
  ]
  ```

### Event Recording Points
1. **Payment received** (via webhook)
   - Event type: `booking.payment_received`
   - Subject: Booking model
   - Tenant-scoped

2. **Booking confirmed after payment** (via webhook)
   - Event type: `booking.confirmed` (existing type, now with payment context)
   - Subject: Booking model
   - Properties include `'payment_received' => true`

3. **Existing events** continue to fire
   - Payment create/success/failure: handled by PaymentService/PaymentWebhookController
   - Booking creation/cancellation: handled by existing code

### Dashboard Impact
- Booking analytics now includes payment context
- Can build revenue reports (bookings × payment status)
- Can track payment conversion rates

---

## Status Lifecycle (Updated)

### Booking Status Progression

**Without payment requirement**:
```
pending_hold → pending → confirmed → completed
         ↓
      cancelled (any point)
```

**With payment requirement**:
```
pending_hold → awaiting_payment → confirmed → completed
         ↓
      cancelled (any point)
```

**Status definitions**:
- `pending_hold`: Temporary hold (10-minute slot lock)
- `awaiting_payment`: Payment processing (customer must complete payment) ← NEW
- `pending`: Awaiting manual confirmation (if not auto-confirm)
- `confirmed`: Booking confirmed (auto or manually)
- `completed`: Booking completed (staff marks complete)
- `cancelled`: Cancelled by customer or staff
- `no_show`: Customer didn't show up

---

## Error Handling

### Payment Creation Failures
- If payment creation fails during hold confirmation:
  - Booking **remains in `pending_hold`** state
  - Return 422 error to customer
  - Log error for investigation
  - Suggest customer retry or contact support

### Refund Failures
- If refund fails during cancellation:
  - Booking **remains in `confirmed`** (or non-cancelled state)
  - Return 422 error to customer/staff
  - Log error for investigation
  - Require manual intervention (support ticket)
  - Prevents loss of customer money

### Webhook Failures
- If webhook is invalid:
  - Return 400 (signature validation fails)
- If booking not found when confirming:
  - Log warning but return 200 (idempotent)
  - Prevents webhook retry loops
- If booking in wrong status:
  - Log warning but return 200 (idempotent)

---

## Testing Coverage

### Unit Tests
- `BookingPaymentService::bookingRequiresPayment()` — all condition combinations
- `BookingPaymentService::createPaymentForBooking()` — success/failure paths
- `BookingPaymentService::confirmBookingAfterPayment()` — status transitions, validations
- `BookingPaymentService::refundBookingIfPaid()` — refund states, partial amounts

### Feature Tests (BookingPaymentIntegrationTest)
1. Payment requirement detection
   - With/without provider
   - With/without price
   - Active/inactive provider

2. Hold confirmation flow
   - With payment requirement
   - Without payment requirement
   - Free service with active provider

3. Webhook confirmation
   - Booking transitions to confirmed
   - Analytics events recorded
   - Notification sent

4. Refund on cancellation
   - Public endpoint refund
   - Staff endpoint refund
   - Failed refund blocks cancellation

5. Analytics events
   - `booking.payment_received` recorded
   - `booking.confirmed` recorded with context

6. Edge cases
   - Inactive provider skips payment
   - Cannot confirm booking without webhook
   - Manual status changes prevented

### E2E Tests (Playwright)
- Full booking flow with Stripe test payment
- Customer receives confirmation email after payment
- Cancellation with refund tracked in payment dashboard

---

## Deployment Notes

### Database Migration
1. Run migration: `add_requires_payment_to_booking_services_table`
   - Adds `requires_payment` boolean with default `false`
   - No data loss (nullable = false, default = false)
   - Non-breaking change

### Service Provider Registration
- No new service providers needed
- `BookingPaymentService` auto-discovered by Laravel's service container

### Configuration
- No new config keys required
- Uses existing payment provider configuration
- Uses existing booking settings

### Backward Compatibility
- Existing bookings and services unaffected
- Existing booking flows work unchanged
- Payment integration is opt-in (per-service flag)
- No UI breaking changes for non-payment bookings

---

## Future Enhancements (Out of Scope for Phase 14)

1. **Partial/Deposit Payments**
   - Set percentage or fixed amount for deposit
   - Remaining balance collected after service completion

2. **Subscription Bookings**
   - Recurring bookings with automated payment
   - Requires `parent_booking_id` domain logic expansion

3. **Custom Payment Schedules**
   - Payment X days before booking
   - Installment plans

4. **Gift Cards / Credits**
   - Apply payment credits to bookings
   - Requires separate tracking model

5. **Invoice Generation**
   - Auto-generate invoice when payment received
   - Email to customer for accounting

6. **Revenue Reports**
   - Booking revenue by service/period
   - Payment conversion rates (bookings requested → paid)

---

## Code Examples

### Creating a Paid Service

```php
BookingService::create([
    'tenant_id' => $tenant->id,
    'name' => 'Deep Tissue Massage',
    'booking_mode' => 'slot',
    'duration_minutes' => 60,
    'price' => 79.99,
    'currency' => 'SEK',
    'requires_payment' => true,  // NEW
]);
```

### Checking Payment Requirement

```php
$service = $this->app->make(BookingPaymentService::class);

if ($service->bookingRequiresPayment($booking)) {
   // Payment required — create provider payment and return its identifiers
    $payment = $service->createPaymentForBooking($booking);
   return response()->json(['payment_id' => $payment->id]);
}
```

### Handling Webhook

```php
// PaymentWebhookController
if ($result->eventType === 'payment_intent.succeeded') {
    $payment->update(['status' => 'completed']);
    $this->confirmBookingIfLinked($payment);  // Calls BookingPaymentService
}
```

### Cancelling with Refund

```php
$booking->load('payment');

// Check if refund is needed
if (!$service->refundBookingIfPaid($booking)) {
    return response()->json(['error' => 'Refund failed'], 422);
}

// Safe to cancel
$booking->update(['status' => 'cancelled']);
```

---

## Summary

Phase 14 implements a clean, isolated payment flow for bookings:
- Per-service configuration enables flexibility
- Automatic payment creation during booking confirmation
- Webhook-driven status transitions prevent race conditions
- Automatic refunds protect customers
- Analytics integration enables revenue tracking
- Backward compatible with existing booking flows

All code is production-tested with comprehensive test coverage.
