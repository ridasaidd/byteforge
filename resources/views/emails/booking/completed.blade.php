@component('mail::message')
# Thank You for Your Visit

Hi **{{ $booking->customer_name }}**,

Thank you for booking with us — we hope you had a great experience.

**Booking summary:**
- **Service:** {{ $booking->service->name }}
- **Date:** {{ $booking->starts_at->format('l, j F Y') }}

We look forward to seeing you again!

Thanks,
{{ config('app.name') }}
@endcomponent
