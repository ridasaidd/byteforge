@component('mail::message')
# Reminder: Your Upcoming Booking

Hi **{{ $booking->customer_name }}**,

@if($window === '24h')
This is a reminder that you have a booking **tomorrow**.
@else
This is a reminder that you have a booking **in about 1 hour**.
@endif

**Booking details:**
- **Service:** {{ $booking->service->name }}
- **Date & time:** {{ $booking->starts_at->format('l, j F Y \a\t H:i') }}

@component('mail::button', ['url' => $managementUrl])
View or Cancel Your Booking
@endcomponent

Thanks,
{{ config('app.name') }}
@endcomponent
