<mjml>
  @include('emails.mjml.lat.partials.head', ['preview' => 'A garden near you has found someone to tend it.'])
  <mj-body background-color="#EDE5D6">
    <mj-wrapper padding="0px" full-width="full-width">
      @include('emails.mjml.lat.components.header')

      <mj-section mj-class="bg-green-light" padding="30px 24px">
        <mj-column>
          <mj-text font-size="26px" font-weight="bold" mj-class="text-header" align="center">
            A garden is being shared near you 🌻
          </mj-text>
          <mj-text font-size="16px" color="#333322" line-height="1.6" align="center" padding-top="8px">
            {{ $firstName ? $firstName . ', some' : 'Some' }} lovely news: a neighbour{{ !is_null($distanceKm) ? ' about ' . $distanceKm . ' km away' : ' near you' }} has just paired up to share a garden on {{ config('freegle.branding.name') }}. Somewhere that was sitting unloved is about to be growing again.
          </mj-text>
        </mj-column>
      </mj-section>

      <mj-section background-color="#ffffff" padding="26px 24px 6px 24px">
        <mj-column>
          <mj-text font-size="18px" font-weight="bold" color="#333322" align="center">
            Fancy being next?
          </mj-text>
          <mj-text font-size="15px" color="#5A3B1F" line-height="1.5" align="center" padding-top="4px">
            Whether you've space to share or you're itching to grow, it only takes a minute to join in.
          </mj-text>
        </mj-column>
      </mj-section>

      <mj-section background-color="#ffffff" padding="10px 24px 6px 24px">
        <mj-column>
          <mj-button href="{{ $lendUrl }}" mj-class="btn-secondary" font-size="16px" width="100%" inner-padding="14px 20px">
            🌷 Share my garden
          </mj-button>
        </mj-column>
      </mj-section>
      <mj-section background-color="#ffffff" padding="0 24px 26px 24px">
        <mj-column>
          <mj-button href="{{ $tendUrl }}" mj-class="btn-success" font-size="16px" width="100%" inner-padding="14px 20px">
            🌱 Find a garden to tend
          </mj-button>
          <mj-text font-size="13px" color="#5A3B1F" align="center" padding-top="14px">
            Or just <a href="{{ $mapUrl }}">browse what's near you on the map</a>.
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
