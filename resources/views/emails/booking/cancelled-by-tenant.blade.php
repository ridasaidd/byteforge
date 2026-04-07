@component('mail::message')
# Your Booking Has Been Cancelled

Hi **{{ $booking->customer_name }}**,

We're sorry to inform you that your booking has been cancelled.

**Cancelled booking:**
- **Service:** {{ $booking->service->name }}
- **Was scheduled for:** {{ $booking->starts_at->format('l, j F Y \a\t H:i') }}

If you have any questions, please contact us directly.

Thanks,
{{ config('app.name') }}
@endcomponent
