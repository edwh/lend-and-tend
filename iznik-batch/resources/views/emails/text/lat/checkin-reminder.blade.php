How's it growing{{ $firstName ? ', ' . $firstName : '' }}?

It's been {{ $intervalLabel }} since you and {!! $otherName !!} started sharing a garden on {{ config('freegle.branding.name') }}. We'd love to know how it's going — just follow one of the links below.

Growing — it's going well:
{!! $growingUrl !!}

Going OK — still finding our feet:
{!! $okUrl !!}

Not working — we could use some help:
{!! $notWorkingUrl !!}

Your check-in is shared with {!! $otherName !!} as a gentle record of how things are going. If it's not working out and you'd like us to help, choose "Not working" and we'll be in touch.

--
This email was sent to {{ $email }}
Manage your notifications: {!! $settingsUrl !!}

{{ config('freegle.branding.name') }} helps neighbours share gardens. Run by volunteers.
{{ config('freegle.branding.registered_address') }}
