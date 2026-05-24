@component('mail::message')
# New activity near you, {{ $recipientName }}

{{ count($newListings) === 1 ? 'A new listing has' : count($newListings) . ' new listings have' }} appeared within your search area on Lend & Tend.

@foreach ($newListings as $listing)
**{{ $listing['subject'] }}** — {{ $listing['type'] === 'Offer' ? 'Garden to lend' : 'Looking to tend' }}
@if (!empty($listing['distance_km']))
*{{ $listing['distance_km'] }} km away*
@endif

@endforeach

@component('mail::button', ['url' => $userSite . '/map'])
View on the map
@endcomponent

Log in to see full details and send a message.

Thanks,
**The Lend & Tend team**

---
<small>You received this because new listings appeared within your travel radius. To change how often you receive these alerts, visit your [Settings]({{ $userSite }}/settings).</small>
@endcomponent
