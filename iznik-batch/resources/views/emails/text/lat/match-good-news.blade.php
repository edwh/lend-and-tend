A garden is being shared near you!

{{ $firstName ? $firstName . ', some' : 'Some' }} lovely news: a neighbour{{ !is_null($distanceKm) ? ' about ' . $distanceKm . ' km away' : ' near you' }} has just paired up to share a garden on {{ config('freegle.branding.name') }}. Somewhere that was sitting unloved is about to be growing again.

Fancy being next? Whether you've space to share or you're itching to grow, it only takes a minute to join in.

Share my garden: {!! $lendUrl !!}
Find a garden to tend: {!! $tendUrl !!}
Browse what's near you: {!! $mapUrl !!}

--
This email was sent to {{ $email }}
Manage your notifications: {!! $settingsUrl !!}

{{ config('freegle.branding.name') }} helps neighbours share gardens. Run by volunteers.
{{ config('freegle.branding.registered_address') }}
