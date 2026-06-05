<mj-section background-color="#EDE5D6" padding="20px">
  <mj-column>
    <mj-text font-size="12px" color="#5A3B1F" align="center" line-height="1.6">
      This email was sent{{ !empty($ampIncluded) ? ' with AMP' : '' }} to {{ $email }}<br/>
      <a href="{{ $settingsUrl ?? config('freegle.sites.user') . '/settings' }}" style="color: #329732;">Change your email settings</a> &bull;
      <a href="{{ $unsubscribeUrl ?? config('freegle.sites.user') . '/unsubscribe' }}" style="color: #329732;">Unsubscribe</a>
    </mj-text>
    <mj-divider border-color="#d8cbb5" border-width="1px" padding="15px 40px"></mj-divider>
    <mj-text font-size="11px" color="#5A3B1F" align="center" line-height="1.5">
      {{ config('freegle.branding.name') }} helps neighbours share gardens — someone with space, someone who wants to grow. Run by volunteers. 🌱<br/>
      {{ config('freegle.branding.registered_address') }}
    </mj-text>
  </mj-column>
</mj-section>
