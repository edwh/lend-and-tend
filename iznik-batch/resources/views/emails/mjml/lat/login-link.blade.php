<mjml>
  @include('emails.mjml.lat.partials.head', ['preview' => 'Your one-tap sign-in link for ' . config('freegle.branding.name')])
  <mj-body background-color="#EDE5D6">
    <mj-wrapper padding="0px" full-width="full-width">
      @include('emails.mjml.lat.components.header')

      <mj-section background-color="#ffffff" padding="28px 24px 6px 24px">
        <mj-column>
          <mj-text font-size="24px" font-weight="bold" mj-class="text-header">
            Here's your sign-in link 🌱
          </mj-text>
          <mj-text font-size="16px" color="#333322" line-height="1.6" padding-top="6px">
            No password needed — that's how {{ config('freegle.branding.name') }} works.
            Tap the button below and you'll be signed in straight away.
          </mj-text>
        </mj-column>
      </mj-section>

      <mj-section background-color="#ffffff" padding="8px 24px 8px 24px">
        <mj-column>
          <mj-button href="{{ $loginUrl }}" mj-class="btn-success" font-size="17px" width="100%" inner-padding="15px 20px">
            Sign in to {{ config('freegle.branding.name') }}
          </mj-button>
        </mj-column>
      </mj-section>

      <mj-section background-color="#ffffff" padding="0 24px 22px 24px">
        <mj-column>
          <mj-text font-size="13px" color="#5A3B1F" line-height="1.6">
            This link signs in just this once and expires soon, so use it while it's fresh.
            If the button doesn't work, copy and paste this address into your browser:
          </mj-text>
          <mj-text font-size="13px" line-height="1.5" css-class="magic-url">
            <a href="{{ $loginUrl }}" style="color:#329732; word-break:break-all;">{{ $loginUrl }}</a>
          </mj-text>
          <mj-text font-size="13px" color="#666666" line-height="1.6" padding-top="12px">
            Didn't try to sign in? You can safely ignore this email — no one can
            reach your account without this link.
          </mj-text>
        </mj-column>
      </mj-section>

      @include('emails.mjml.lat.partials.footer', ['email' => $email, 'settingsUrl' => $settingsUrl, 'unsubscribeUrl' => $unsubscribeUrl])

      @if($trackingPixelMjml ?? false)
      <mj-section padding="0"><mj-column>{!! $trackingPixelMjml !!}</mj-column></mj-section>
      @endif
    </mj-wrapper>
  </mj-body>
</mjml>
