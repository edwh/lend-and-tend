<mjml>
  @include('emails.mjml.lat.partials.head', ['preview' => 'Your garden found a tender — do you have another to share?'])
  <mj-body background-color="#EDE5D6">
    <mj-wrapper padding="0px" full-width="full-width">
      @include('emails.mjml.lat.components.header')

      <mj-section background-color="#ffffff" padding="28px 24px 8px 24px">
        <mj-column>
          <mj-text font-size="24px" font-weight="bold" mj-class="text-header">
            Wonderful news{{ $firstName ? ', ' . $firstName : '' }}! 🌷
          </mj-text>
          <mj-text font-size="16px" color="#333322" line-height="1.6" padding-top="6px">
            <strong>{{ $otherName }}</strong> is going to help tend your garden. Thank you for sharing your space — it makes a real difference.
          </mj-text>
          <mj-text font-size="16px" color="#333322" line-height="1.6" padding-top="10px">
            Do you have <strong>another garden</strong> (or more space) to share, or is this the one?
          </mj-text>
        </mj-column>
      </mj-section>

      <mj-section background-color="#ffffff" padding="12px 24px 4px 24px">
        <mj-column>
          <mj-button href="{{ $moreUrl }}" mj-class="btn-secondary" font-size="16px" width="100%" inner-padding="14px 20px">
            🌷 I've another to share
          </mj-button>
        </mj-column>
      </mj-section>
      <mj-section background-color="#ffffff" padding="4px 24px 26px 24px">
        <mj-column>
          <mj-button href="{{ $doneUrl }}" mj-class="btn-muted" font-size="16px" width="100%" inner-padding="14px 20px">
            ✓ That's all for now
          </mj-button>
          <mj-text font-size="13px" color="#5A3B1F" align="center" padding-top="14px">
            Either way, we'll check in as the season goes on.
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
