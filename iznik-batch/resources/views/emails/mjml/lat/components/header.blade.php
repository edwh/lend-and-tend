<mj-section mj-class="bg-success" padding="18px">
    <mj-column>
        <mj-image
            width="140px"
            src="{{ $logoUrl ?? config('freegle.branding.logo_url') }}"
            alt="{{ $siteName ?? config('freegle.branding.name') }}"
        />
    </mj-column>
</mj-section>
