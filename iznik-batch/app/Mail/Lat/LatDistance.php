<?php

namespace App\Mail\Lat;

/**
 * Distances for L&T emails.
 *
 * The site talks in miles (the travel-radius setting is "Up to 2 miles" and so
 * on), while the batch jobs compute distances in kilometres. Emails must read
 * the way the site does, so convert at display time and keep the data in km.
 */
class LatDistance
{
    private const KM_PER_MILE = 1.609344;

    /**
     * "0.7 miles", "1 mile", "2.5 miles" - or null when there is no distance.
     */
    public static function miles(?float $km): ?string
    {
        if ($km === null || $km < 0) {
            return null;
        }

        $miles = round($km / self::KM_PER_MILE, 1);
        if ($miles < 0.1) {
            return 'under 0.1 miles';
        }

        $text = rtrim(rtrim(number_format($miles, 1, '.', ''), '0'), '.');

        return $text . ($text === '1' ? ' mile' : ' miles');
    }
}
