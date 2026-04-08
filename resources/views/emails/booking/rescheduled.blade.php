@component('mail::message')
# Your Booking Has Been Rescheduled

Hi **{{ $booking->customer_name }}**,

@if($rescheduledBy === 'customer')
Your booking has been rescheduled as requested.
@else
Your booking has been rescheduled by us. We apologise for any inconvenience.
@endif

**Updated booking details:**
- **Service:** {{ $booking->service->name }}
- **New date & time:** {{ $booking->starts_at->format('l, j F Y \a\t H:i') }}

@component('mail::button', ['url' => $managementUrl])
View or Cancel Your Booking
@endcomponent

Thanks,
{{ config('app.name') }}
@endcomponent
