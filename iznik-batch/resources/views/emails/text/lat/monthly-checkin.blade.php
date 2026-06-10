How's your patch{{ $firstName ? ', ' . $firstName : '' }}?

@if($role === 'lender')
You've a garden waiting for someone to help tend it. Just a gentle nudge — it's still listed and ready.
@elseif($role === 'tender')
You're on the lookout for a garden to grow in. We've not forgotten you!
@else
You're part of {{ config('freegle.branding.name') }} — sharing a garden or looking to grow. Just a gentle monthly hello.
@endif

@if($newNearbyCount > 0)
{{ $newNearbyCount }} new {{ $newNearbyCount === 1 ? 'listing has' : 'listings have' }} appeared near you recently{{ !empty($listings) ? ' — here are a few:' : '.' }}

@foreach ($listings as $listing)
* {{ $listing['isOffer'] ? 'Garden to share' : 'Wants to grow' }}@if(!is_null($listing['distance_km'])) ({{ $listing['distance_km'] }} km away)@endif
  {!! $listing['itemName'] !!}
  {!! $listing['url'] !!}

@endforeach
@endif
See everything near you: {!! $mapUrl !!}
@if($role === 'lender')
Share another garden: {!! $lendUrl !!}
@else
Update what you're looking for: {!! $tendUrl !!}
@endif

All sorted now? Let us know and we'll pause these monthly notes: {!! $doneUrl !!}
Still keen? {!! $stillLookingUrl !!}

--
This email was sent to {{ $email }}
Manage your notifications: {!! $settingsUrl !!}

{{ config('freegle.branding.name') }} helps neighbours share gardens. Run by volunteers.
{{ config('freegle.branding.registered_address') }}
