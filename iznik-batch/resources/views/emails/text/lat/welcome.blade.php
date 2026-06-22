Welcome{{ $firstName ? ', ' . $firstName : '' }}!

You've joined {{ config('freegle.branding.name') }} — a community of neighbours sharing gardens. Someone has space to lend; someone else would love to grow. We help you find each other.

@if($role === 'lender')
You've got a garden to share. Pop it on the map and a nearby tender can help bring it to life.

Share your garden: {!! $lendUrl !!}
Browse gardens near you: {!! $mapUrl !!}
@elseif($role === 'tender')
You're after a patch to grow in. Have a look at the gardens near you and say hello to a lender.

Find a garden to tend: {!! $tendUrl !!}
Browse gardens near you: {!! $mapUrl !!}
@else
Whether you've space to share or you're looking to grow, the map is the place to start.

Explore the map: {!! $mapUrl !!}
@endif

How it works:
1. Share a garden, or find one near you.
2. Message to get to know each other — no addresses shared until you're ready.
3. Agree how you'll share, then start growing.

New to this? Our ground rules & safety tips are a two-minute read worth having: {!! $rulesUrl !!}

--
This email was sent to {{ $email }}
Manage your notifications: {!! $settingsUrl !!}

{{ config('freegle.branding.name') }} helps neighbours share gardens. Run by volunteers.
{{ config('freegle.branding.registered_address') }}
