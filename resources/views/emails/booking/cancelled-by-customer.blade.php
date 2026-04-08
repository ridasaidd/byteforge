@component('mail::message')
# Booking Cancelled by Customer

A customer has cancelled their booking.

**Booking details:**
- **Customer:** {{ $booking->customer_name }} ({{ $booking->customer_email }})
- **Service:** {{ $booking->service->name }}
- **Scheduled for:** {{ $booking->starts_at->format('l, j F Y \a\t H:i') }}

The time slot is now available again.

Thanks,
{{ config('app.name') }}
@endcomponent
