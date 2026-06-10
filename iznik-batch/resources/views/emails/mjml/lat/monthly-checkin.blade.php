<mjml>
  @include('emails.mjml.lat.partials.head', ['preview' => 'Still keen? Here is what is happening in your patch this month.'])
  <mj-body background-color="#EDE5D6">
    <mj-wrapper padding="0px" full-width="full-width">
      @include('emails.mjml.lat.components.header')

      <mj-section background-color="#ffffff" padding="28px 24px 8px 24px">
        <mj-column>
          <mj-text font-size="24px" font-weight="bold" mj-class="text-header">
            How's your patch{{ $firstName ? ', ' . $firstName : '' }}? 🌱
          </mj-text>
          <mj-text font-size="16px" color="#333322" line-height="1.6" padding-top="6px">
            @if($role === 'lender')
              You've a garden waiting for someone to help tend it. Just a gentle nudge — it's still listed and ready.
            @elseif($role === 'tender')
              You're on the lookout for a garden to grow in. We've not forgotten you!
            @else
              You're part of {{ config('freegle.branding.name') }} — sharing a garden or looking to grow. Just a gentle monthly hello.
            @endif
          </mj-text>
          @if($newNearbyCount > 0)
          <mj-text font-size="16px" mj-class="text-success" font-weight="bold" line-height="1.6" padding-top="10px">
            🎉 {{ $newNearbyCount }} new {{ $newNearbyCount === 1 ? 'listing has' : 'listings have' }} appeared near you recently{{ !empty($listings) ? ' — here are a few:' : '.' }}
          </mj-text>
          @endif
        </mj-column>
      </mj-section>

      @foreach ($listings as $listing)
        @include('emails.mjml.lat.partials.listing-card', ['listing' => $listing])
      @endforeach

      <mj-section background-color="#ffffff" padding="14px 24px 4px 24px">
        <mj-column>
          <mj-button href="{{ $mapUrl }}" mj-class="btn-success" font-size="16px" width="100%" inner-padding="14px 20px">
            See everything near you
          </mj-button>
        </mj-column>
      </mj-section>
      <mj-section background-color="#ffffff" padding="4px 24px 8px 24px">
        <mj-column>
          @if($role === 'lender')
          <mj-button href="{{ $lendUrl }}" mj-class="btn-secondary" font-size="15px" width="100%" inner-padding="12px 18px">
            Share another garden
          </mj-button>
          @else
          <mj-button href="{{ $tendUrl }}" mj-class="btn-secondary" font-size="15px" width="100%" inner-padding="12px 18px">
            Update what you're looking for
          </mj-button>
          @endif
        </mj-column>
      </mj-section>

      <mj-section mj-class="bg-cream" padding="16px 24px">
        <mj-column>
          <mj-text font-size="13px" color="#5A3B1F" align="center" line-height="1.5">
            All sorted now?
            <a href="{{ $doneUrl }}">Let us know you're done</a>
            and we'll pause these monthly notes — or
            <a href="{{ $stillLookingUrl }}">tell us you're still keen</a>.
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
