@component('mail::message')
# Your Booking Request Has Been Received

Hi **{{ $booking->customer_name }}**,

Thank you for your booking request. We have received it and it is now awaiting confirmation.

**Booking details:**
- **Service:** {{ $booking->service->name }}
- **Date & time:** {{ $booking->starts_at->format('l, j F Y \a\t H:i') }}

We will send you another email once your booking is confirmed.

@component('mail::button', ['url' => $managementUrl])
View or Cancel Your Booking
@endcomponent

Thanks,
{{ config('app.name') }}
@endcomponent
