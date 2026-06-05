{{ $firstName ? $firstName . ', there' : 'There' }}{{ $count === 1 ? "'s a new garden near you" : "'re new gardens near you" }}!

{{ $count === 1 ? 'A new listing has' : $count . ' new listings have' }} just appeared within your patch on {{ config('freegle.branding.name') }}:

@foreach ($listings as $listing)
* {{ $listing['isOffer'] ? 'Garden to share' : 'Someone wants to grow' }}@if(!is_null($listing['distance_km'])) ({{ $listing['distance_km'] }} km away)@endif
  {!! $listing['subject'] !!}
  {!! $listing['url'] !!}

@endforeach
See everything on the map: {!! $mapUrl !!}

Log in to see full details and message whoever posted.

--
This email was sent to {{ $email }}
Change how often you hear from us: {!! $settingsUrl !!}

{{ config('freegle.branding.name') }} helps neighbours share gardens. Run by volunteers.
{{ config('freegle.branding.registered_address') }}
