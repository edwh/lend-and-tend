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
      <mj-section background-color="#ffffff" padding="6px 24px">
        <mj-column mj-class="{{ $listing['isOffer'] ? 'bg-green-light' : 'bg-purple-light' }}" border-radius="10px" padding="16px">
          <mj-text font-size="12px" font-weight="bold" mj-class="{{ $listing['isOffer'] ? 'text-success' : 'text-secondary' }}" text-transform="uppercase" letter-spacing="0.5px">
            {{ $listing['isOffer'] ? '🌷 Garden to share' : '🌻 Someone wants to grow' }}@if(!is_null($listing['distance_km'])) &bull; {{ $listing['distance_km'] }} km away @endif
          </mj-text>
          <mj-text font-size="18px" font-weight="bold" color="#333322" padding-top="4px">
            {{ $listing['subject'] }}
          </mj-text>
          <mj-button href="{{ $listing['url'] }}" mj-class="{{ $listing['isOffer'] ? 'btn-success' : 'btn-secondary' }}" align="left" font-size="14px" padding="12px 0 0 0" inner-padding="10px 22px">
            Take a look
          </mj-button>
        </mj-column>
      </mj-section>
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
