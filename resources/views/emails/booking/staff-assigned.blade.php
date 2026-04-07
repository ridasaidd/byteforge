@component('mail::message')
# New Booking Assigned to You

Hi **{{ $resource->name }}**,

A booking has been confirmed and assigned to you.

**Booking details:**
- **Customer:** {{ $booking->customer_name }}
- **Service:** {{ $booking->service->name }}
- **Date & time:** {{ $booking->starts_at->format('l, j F Y \a\t H:i') }}
@if($booking->customer_notes)
- **Customer notes:** {{ $booking->customer_notes }}
@endif

Please ensure you are available at the scheduled time.

Thanks,
{{ config('app.name') }}
@endcomponent
