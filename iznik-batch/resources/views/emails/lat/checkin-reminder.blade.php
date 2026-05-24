@component('mail::message')
# How's it going, {{ $recipientName }}?

It's been **{{ $intervalLabel }}** since you and **{{ $otherName }}** started your Lend & Tend arrangement.

We'd love to know how things are going! It only takes a second — just tap one of the options below.

@component('mail::button', ['url' => $userSite . '/checkin/' . $agreementId . '?status=growing', 'color' => 'success'])
🟢 Growing — it's going well
@endcomponent

@component('mail::button', ['url' => $userSite . '/checkin/' . $agreementId . '?status=ok'])
🟡 Going OK — still finding our feet
@endcomponent

@component('mail::button', ['url' => $userSite . '/checkin/' . $agreementId . '?status=not_working', 'color' => 'error'])
🔴 Not working — we need some help
@endcomponent

Your check-in will be visible to both you and {{ $otherName }}, as a gentle record of how the arrangement is going.

If things aren't working out and you'd like Lend & Tend to help mediate, select "Not working" and we'll be in touch.

Thanks for being part of the community,
**The Lend & Tend team**

---
<small>You received this because you have a garden-sharing arrangement registered on Lend & Tend. To manage your notification preferences, visit your [Settings]({{ $userSite }}/settings).</small>
@endcomponent
