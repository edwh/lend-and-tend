<?php

// Lend & Tend media hosts used when an email embeds a listing photo.
//
// Photos are uploaded to L&T's own tusd server and served through L&T's own
// weserv image proxy; emails must never point at Freegle's delivery or images
// hosts. The defaults follow the production reverse-proxy paths
// (deploy/fly/proxy/Caddyfile: /lat-delivery/* and /lat-uploads/*), derived
// from the same asset host the email logo uses, so a deployment that sets only
// LAT_ASSET_BASE_URL gets working photos. Override per environment when the
// delivery proxy or upload store live elsewhere (locally: the compose ports).
$assetBase = rtrim((string) env('LAT_ASSET_BASE_URL', 'https://new.lendandtend.com'), '/');

return [
    // The public weserv endpoint. A thumbnail is <delivery>?url=<upload>&w=300.
    'image_delivery_url' => rtrim((string) env('LAT_IMAGE_DELIVERY_URL', $assetBase . '/lat-delivery/'), '/'),

    // Where the delivery proxy fetches originals from: <uploads_url><tusd id>.
    // This is fetched by the proxy, not the member's mail client, so an
    // internal hostname (http://lat-tusd:8080/files/) is fine locally.
    'uploads_url' => rtrim((string) env('LAT_UPLOADS_URL', $assetBase . '/lat-uploads/files/'), '/') . '/',
];
