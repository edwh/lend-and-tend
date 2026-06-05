<mjml>
  @include('emails.mjml.lat.partials.head', ['preview' => "How's your garden-sharing going with " . $otherName . '?'])
  <mj-body background-color="#EDE5D6">
    <mj-wrapper padding="0px" full-width="full-width">
      @include('emails.mjml.lat.components.header')

      <mj-section background-color="#ffffff" padding="28px 24px 8px 24px">
        <mj-column>
          <mj-text font-size="24px" font-weight="bold" mj-class="text-header">
            How's it growing{{ $firstName ? ', ' . $firstName : '' }}? 🌿
          </mj-text>
          <mj-text font-size="16px" color="#333322" line-height="1.5" padding-top="6px">
            It's been <strong>{{ $intervalLabel }}</strong> since you and <strong>{{ $otherName }}</strong> started sharing a garden on {{ config('freegle.branding.name') }}. We'd love to know how it's going — one tap is all it takes.
          </mj-text>
        </mj-column>
      </mj-section>

      <mj-section background-color="#ffffff" padding="6px 24px">
        <mj-column>
          <mj-button href="{{ $growingUrl }}" mj-class="btn-success" font-size="16px" width="100%" inner-padding="14px 20px">
            🟢 Growing — it's going well
          </mj-button>
        </mj-column>
      </mj-section>
      <mj-section background-color="#ffffff" padding="6px 24px">
        <mj-column>
          <mj-button href="{{ $okUrl }}" mj-class="btn-secondary" font-size="16px" width="100%" inner-padding="14px 20px">
            🟡 Going OK — still finding our feet
          </mj-button>
        </mj-column>
      </mj-section>
      <mj-section background-color="#ffffff" padding="6px 24px 24px 24px">
        <mj-column>
          <mj-button href="{{ $notWorkingUrl }}" mj-class="btn-warning" font-size="16px" width="100%" inner-padding="14px 20px">
            🔴 Not working — we could use some help
          </mj-button>
        </mj-column>
      </mj-section>

      <mj-section mj-class="bg-cream" padding="18px 24px">
        <mj-column>
          <mj-text font-size="13px" color="#5A3B1F" line-height="1.5">
            Your check-in is shared with {{ $otherName }} as a gentle record of how things are going. If it's not working out and you'd like us to help, choose <strong>Not working</strong> and we'll be in touch.
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
