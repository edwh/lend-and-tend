{{-- One garden listing, digest-style: photo (or placeholder) + label + title + snippet + button.
     Expects $listing = { itemName, isOffer, distance_km, text, imageUrl, url }. --}}
<mj-section background-color="#ffffff" padding="6px 24px">
  <mj-column width="28%" vertical-align="top" mj-class="{{ $listing['isOffer'] ? 'bg-green-light' : 'bg-purple-light' }}" border-radius="10px" padding="8px">
    <mj-image width="120px" src="{{ $listing['imageUrl'] }}" alt="{{ $listing['isOffer'] ? 'Garden' : 'Wanted' }}" border-radius="8px" />
  </mj-column>
  {{-- Consistent left edge: every element uses 0 horizontal padding, so the
       label, title, snippet and button share the column's content edge (the
       12px gap from the photo comes from the column's own left padding). --}}
  <mj-column width="72%" vertical-align="top" padding="8px 0 8px 14px">
    <mj-text font-size="12px" font-weight="bold" mj-class="{{ $listing['isOffer'] ? 'text-success' : 'text-secondary' }}" text-transform="uppercase" letter-spacing="0.5px" padding="0 0 3px 0">
      {{ $listing['isOffer'] ? '🌷 Garden to share' : '🌻 Wants to grow' }}@if(!is_null($listing['distance_km'])) &bull; {{ $listing['distance_km'] }} km away @endif
    </mj-text>
    <mj-text font-size="17px" font-weight="bold" color="#333322" line-height="1.25" padding="0">
      <a href="{{ $listing['url'] }}" style="color:#333322; text-decoration:none;">{{ $listing['itemName'] }}</a>
    </mj-text>
    @if(!empty($listing['text']))
    <mj-text font-size="13px" color="#5A3B1F" line-height="1.4" padding="4px 0 0 0">
      {{ \Illuminate\Support\Str::limit(trim(preg_replace('/\s+/', ' ', $listing['text'])), 110) }}
    </mj-text>
    @endif
    <mj-button href="{{ $listing['url'] }}" mj-class="{{ $listing['isOffer'] ? 'btn-success' : 'btn-secondary' }}" align="left" font-size="14px" padding="10px 0 0 0" inner-padding="9px 20px" border-radius="6px">
      Take a look
    </mj-button>
  </mj-column>
</mj-section>
