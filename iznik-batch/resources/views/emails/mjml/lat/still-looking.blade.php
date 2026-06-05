<mjml>
  @include('emails.mjml.lat.partials.head', ['preview' => 'Now you have a garden — are you still looking for others?'])
  <mj-body background-color="#EDE5D6">
    <mj-wrapper padding="0px" full-width="full-width">
      @include('emails.mjml.lat.components.header')

      <mj-section background-color="#ffffff" padding="28px 24px 8px 24px">
        <mj-column>
          <mj-text font-size="24px" font-weight="bold" mj-class="text-header">
            Congratulations{{ $firstName ? ', ' . $firstName : '' }}! 🌿
          </mj-text>
          <mj-text font-size="16px" color="#333322" line-height="1.6" padding-top="6px">
            You and <strong>{{ $otherName }}</strong> have agreed to share a garden. We hope it's the start of something lovely.
          </mj-text>
          <mj-text font-size="16px" color="#333322" line-height="1.6" padding-top="10px">
            Quick question: are you <strong>still looking</strong> for other gardens to tend, or are you sorted for now? Letting us know keeps your alerts relevant.
          </mj-text>
        </mj-column>
      </mj-section>

      <mj-section background-color="#ffffff" padding="12px 24px 4px 24px">
        <mj-column>
          <mj-button href="{{ $lookingUrl }}" mj-class="btn-success" font-size="16px" width="100%" inner-padding="14px 20px">
            🌱 Yes — keep the alerts coming
          </mj-button>
        </mj-column>
      </mj-section>
      <mj-section background-color="#ffffff" padding="4px 24px 26px 24px">
        <mj-column>
          <mj-button href="{{ $doneUrl }}" mj-class="btn-muted" font-size="16px" width="100%" inner-padding="14px 20px">
            ✓ No — I'm sorted for now
          </mj-button>
          <mj-text font-size="13px" color="#5A3B1F" align="center" padding-top="14px">
            You can change your mind any time in your <a href="{{ $settingsUrl }}">settings</a>.
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
