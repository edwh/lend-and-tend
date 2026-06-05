Congratulations{{ $firstName ? ', ' . $firstName : '' }}!

You and {!! $otherName !!} have agreed to share a garden. We hope it's the start of something lovely.

Quick question: are you still looking for other gardens to tend, or are you sorted for now? Letting us know keeps your alerts relevant.

Yes — keep the alerts coming:
{!! $lookingUrl !!}

No — I'm sorted for now:
{!! $doneUrl !!}

You can change your mind any time in your settings: {!! $settingsUrl !!}

--
This email was sent to {{ $email }}
Manage your notifications: {!! $settingsUrl !!}

{{ config('freegle.branding.name') }} helps neighbours share gardens. Run by volunteers.
{{ config('freegle.branding.registered_address') }}
