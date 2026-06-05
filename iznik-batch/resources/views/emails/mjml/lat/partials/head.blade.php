<mj-head>
  <mj-preview>{{ $preview ?? '' }}</mj-preview>
  {{-- inline="inline" tells MJML to inline these styles into elements, which is required for Gmail --}}
  <mj-style inline="inline">
    a { color: #329732; text-decoration: none; font-weight: bold }
    ol { margin-top: 0; margin-bottom: 0; padding-left: 2.4em; }
    li { margin: 0.5em 0; }
    @if(!empty($styles)){!! $styles !!}@endif
  </mj-style>
  @if(!empty($mediaStyles))
    <mj-style>
      {!! $mediaStyles !!}
    </mj-style>
  @endif
  <mj-attributes>
    {{-- Modern system font stack --}}
    <mj-all font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"></mj-all>
    {{-- Lend & Tend brand palette (from lat/branding.config.ts) --}}
    <mj-class name="bg-success" background-color="#329732" />        {{-- brand green --}}
    <mj-class name="bg-header" background-color="#4F6642" />         {{-- forest green --}}
    <mj-class name="bg-secondary" background-color="#B868CA" />      {{-- lilac/purple (lender) --}}
    <mj-class name="bg-warning" background-color="#CC3F00" />        {{-- burnt orange --}}
    <mj-class name="bg-cream" background-color="#EDE5D6" />          {{-- warm cream surface --}}
    <mj-class name="bg-green-light" background-color="#e8f5e9" />    {{-- light green --}}
    <mj-class name="bg-purple-light" background-color="#f3e8f7" />   {{-- light purple --}}
    <mj-class name="text-success" color="#329732" />
    <mj-class name="text-header" color="#4F6642" />
    <mj-class name="text-secondary" color="#B868CA" />
    <mj-class name="text-muted" color="#5A3B1F" />
    <mj-class name="btn-success" background-color="#329732" color="white" font-weight="bold" />
    <mj-class name="btn-secondary" background-color="#B868CA" color="white" font-weight="bold" />
    <mj-class name="btn-warning" background-color="#CC3F00" color="white" font-weight="bold" />
    <mj-class name="btn-muted" background-color="#8a8a7a" color="white" font-weight="bold" />
  </mj-attributes>
</mj-head>
