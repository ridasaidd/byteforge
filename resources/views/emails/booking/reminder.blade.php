@component('mail::message')
# Reminder: Your Upcoming Booking

Hi **{{ $booking->customer_name }}**,

@php
	$hours = (int) preg_replace('/[^0-9]/', '', (string) $window);
@endphp

@if($window === '24h')
This is a reminder that you have a booking **tomorrow**.
@elseif($hours > 0)
This is a reminder that you have a booking **in about {{ $hours }} hour{{ $hours === 1 ? '' : 's' }}**.
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
