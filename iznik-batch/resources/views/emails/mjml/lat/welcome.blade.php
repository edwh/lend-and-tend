<mjml>
  @include('emails.mjml.lat.partials.head', ['preview' => 'Welcome to the community — here is how to get growing.'])
  <mj-body background-color="#EDE5D6">
    <mj-wrapper padding="0px" full-width="full-width">
      @include('emails.mjml.lat.components.header')

      <mj-section background-color="#ffffff" padding="28px 24px 8px 24px">
        <mj-column>
          <mj-text font-size="24px" font-weight="bold" mj-class="text-header">
            Welcome{{ $firstName ? ', ' . $firstName : '' }}! 🌱
          </mj-text>
          <mj-text font-size="16px" color="#333322" line-height="1.6" padding-top="6px">
            You've joined {{ config('freegle.branding.name') }} — a community of neighbours sharing gardens.
            Someone has space to lend; someone else would love to grow. We help you find each other.
          </mj-text>
          <mj-text font-size="16px" color="#333322" line-height="1.6" padding-top="10px">
            @if($role === 'lender')
              You've got a garden to share. Pop it on the map and a nearby tender can help bring it to life.
            @elseif($role === 'tender')
              You're after a patch to grow in. Have a look at the gardens near you and say hello to a lender.
            @else
              Whether you've space to share or you're looking to grow, the map is the place to start.
            @endif
          </mj-text>
        </mj-column>
      </mj-section>

      {{-- Primary, role-specific CTA --}}
      <mj-section background-color="#ffffff" padding="12px 24px 4px 24px">
        <mj-column>
          @if($role === 'lender')
          <mj-button href="{{ $lendUrl }}" mj-class="btn-success" font-size="16px" width="100%" inner-padding="14px 20px">
            🏡 Share your garden
          </mj-button>
          @elseif($role === 'tender')
          <mj-button href="{{ $tendUrl }}" mj-class="btn-success" font-size="16px" width="100%" inner-padding="14px 20px">
            🌿 Find a garden to tend
          </mj-button>
          @else
          <mj-button href="{{ $mapUrl }}" mj-class="btn-success" font-size="16px" width="100%" inner-padding="14px 20px">
            🗺 Explore the map
          </mj-button>
          @endif
        </mj-column>
      </mj-section>
      @if($role !== 'both')
      <mj-section background-color="#ffffff" padding="4px 24px 8px 24px">
        <mj-column>
          <mj-button href="{{ $mapUrl }}" mj-class="btn-secondary" font-size="15px" width="100%" inner-padding="12px 18px">
            Browse gardens near you
          </mj-button>
        </mj-column>
      </mj-section>
      @endif

      {{-- How it works --}}
      <mj-section background-color="#ffffff" padding="8px 24px 24px 24px">
        <mj-column>
          <mj-text font-size="15px" font-weight="bold" mj-class="text-header" padding-bottom="4px">
            How it works
          </mj-text>
          <mj-text font-size="14px" color="#333322" line-height="1.7">
            <strong>1.</strong> Share a garden, or find one near you.<br/>
            <strong>2.</strong> Message to get to know each other — no addresses shared until you're ready.<br/>
            <strong>3.</strong> Agree how you'll share, then start growing. 🌻
          </mj-text>
          <mj-text font-size="13px" color="#5A3B1F" line-height="1.6" padding-top="12px">
            New to this? Our <a href="{{ $rulesUrl }}">ground rules &amp; safety tips</a> are a two-minute read worth having.
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
