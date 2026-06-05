<?php

namespace Tests\Unit\Mail;

use Tests\TestCase;

class FeatureFlagsTest extends TestCase
{
    use \App\Mail\Traits\FeatureFlags;

    private const ALL_EMAIL_TYPES = 'Welcome,ChatNotification,ChatNotificationUser2Mod,ChatNotificationMod2Mod,Digest,UnifiedDigest,DonationThank,DonationAsk,StoriesNewsletter';

    // (Removed test_email_type_enabled_when_in_config: it asserted the Freegle
    // email types are enabled, which isn't true in the L&T fork — L&T sets
    // FREEGLE_MAIL_ENABLED_TYPES to its own Lat* types. The trait itself is
    // still covered by the generic enable/disable/whitespace tests below, and
    // the L&T types are exercised by tests/Unit/Mail/Lat + tests/Feature/Lat.)

    public function test_email_type_disabled_when_not_in_config(): void
    {
        // Types not in the config should be disabled.
        $this->assertFalse(self::isEmailTypeEnabled('SomeOtherType'));
        $this->assertFalse(self::isEmailTypeEnabled('Newsletter'));
    }

    public function test_email_type_disabled_when_config_empty(): void
    {
        // Temporarily set config to empty.
        config(['freegle.mail.enabled_types' => '']);

        $this->assertFalse(self::isEmailTypeEnabled('Welcome'));
        $this->assertFalse(self::isEmailTypeEnabled('ChatNotification'));

        // Restore for other tests.
        config(['freegle.mail.enabled_types' => self::ALL_EMAIL_TYPES]);
    }

    public function test_email_type_handles_whitespace(): void
    {
        // Test that whitespace is trimmed.
        config(['freegle.mail.enabled_types' => 'Welcome , ChatNotification']);

        $this->assertTrue(self::isEmailTypeEnabled('Welcome'));
        $this->assertTrue(self::isEmailTypeEnabled('ChatNotification'));

        // Restore.
        config(['freegle.mail.enabled_types' => self::ALL_EMAIL_TYPES]);
    }
}
