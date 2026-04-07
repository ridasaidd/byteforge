@component('mail::message')
# Your Booking Is Confirmed

Hi **{{ $booking->customer_name }}**,

Great news — your booking is confirmed!

**Booking details:**
- **Service:** {{ $booking->service->name }}
- **Date & time:** {{ $booking->starts_at->format('l, j F Y \a\t H:i') }}

@component('mail::button', ['url' => $managementUrl])
View or Cancel Your Booking
@endcomponent

Thanks,
{{ config('app.name') }}
@endcomponent
