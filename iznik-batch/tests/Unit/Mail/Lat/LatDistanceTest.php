<?php

namespace Tests\Unit\Mail\Lat;

use App\Mail\Lat\LatDistance;
use PHPUnit\Framework\TestCase;

/**
 * Emails must talk in miles like the site does ("Up to 2 miles"), even though
 * the batch jobs measure in km.
 */
class LatDistanceTest extends TestCase
{
    public function test_converts_km_to_miles_for_display(): void
    {
        $this->assertSame('0.7 miles', LatDistance::miles(1.2));
        $this->assertSame('2.1 miles', LatDistance::miles(3.4));
        $this->assertSame('1 mile', LatDistance::miles(1.609344));
        $this->assertSame('3 miles', LatDistance::miles(4.828032));
    }

    public function test_very_short_distances_do_not_read_as_zero(): void
    {
        $this->assertSame('under 0.1 miles', LatDistance::miles(0.05));
    }

    public function test_no_distance_means_no_text(): void
    {
        $this->assertNull(LatDistance::miles(null));
        $this->assertNull(LatDistance::miles(-1));
    }
}
