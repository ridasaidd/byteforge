@component('mail::message')
# New Booking Received

A new booking has been submitted and requires your attention.

**Booking details:**
- **Customer:** {{ $booking->customer_name }} ({{ $booking->customer_email }})
- **Service:** {{ $booking->service->name }}
- **Date & time:** {{ $booking->starts_at->format('l, j F Y \a\t H:i') }}
- **Status:** {{ ucfirst(str_replace('_', ' ', $booking->status)) }}
@if($booking->customer_phone)
- **Phone:** {{ $booking->customer_phone }}
@endif
@if($booking->customer_notes)
- **Notes:** {{ $booking->customer_notes }}
@endif

Log in to your CMS dashboard to confirm or manage this booking.

Thanks,
{{ config('app.name') }}
@endcomponent
