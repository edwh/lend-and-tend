<?php

namespace App\Mail\Lat;

/**
 * Small name helpers shared by the L&T mailables.
 */
class LatNames
{
    /**
     * First name (or null) from a full name, for friendly salutations.
     */
    public static function first(?string $name): ?string
    {
        $name = trim((string) $name);

        return $name === '' ? null : explode(' ', $name)[0];
    }
}
