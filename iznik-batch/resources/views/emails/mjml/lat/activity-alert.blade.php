<mjml>
  @include('emails.mjml.lat.partials.head', ['preview' => $count . ' new ' . ($count === 1 ? 'garden' : 'gardens') . ' near you'])
  <mj-body background-color="#EDE5D6">
    <mj-wrapper padding="0px" full-width="full-width">
      @include('emails.mjml.lat.components.header')

      <mj-section background-color="#ffffff" padding="28px 24px 8px 24px">
        <mj-column>
          <mj-text font-size="24px" font-weight="bold" mj-class="text-header">
            {{ $firstName ? $firstName . ', there' : 'There' }}'{{ $count === 1 ? 's a new garden' : 're new gardens' }} near you 🌱
          </mj-text>
          <mj-text font-size="16px" color="#333322" line-height="1.5" padding-top="6px">
            {{ $count === 1 ? 'A new listing has' : $count . ' new listings have' }} just appeared within your patch on {{ config('freegle.branding.name') }}.
          </mj-text>
        </mj-column>
      </mj-section>

      @foreach ($listings as $listing)
        @include('emails.mjml.lat.partials.listing-card', ['listing' => $listing])
      @endforeach

      <mj-section background-color="#ffffff" padding="20px 24px 30px 24px">
        <mj-column>
          <mj-button href="{{ $mapUrl }}" mj-class="btn-success" font-size="16px" padding="0" inner-padding="14px 40px">
            See everything on the map
          </mj-button>
          <mj-text font-size="13px" color="#5A3B1F" align="center" padding-top="14px">
            Log in to see full details and message whoever posted.
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
