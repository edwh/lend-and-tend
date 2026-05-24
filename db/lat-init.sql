-- Lend & Tend database initialisation
-- Core tables mirror the Freegle schema (from iznik-batch Laravel migrations).
-- L&T-specific tables and columns are prefixed with lat_ or live in lat_ tables.
-- Idempotent: all CREATE TABLE statements use IF NOT EXISTS.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ─── Freegle core: users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id`                   bigint unsigned  NOT NULL AUTO_INCREMENT,
  `firstname`            varchar(191)     DEFAULT NULL,
  `lastname`             varchar(191)     DEFAULT NULL,
  `fullname`             varchar(191)     DEFAULT NULL,
  `systemrole`           enum('User','Moderator','Support','Admin') NOT NULL DEFAULT 'User',
  `added`                timestamp        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `lastaccess`           timestamp        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `settings`             mediumtext       DEFAULT NULL,
  `deleted`              timestamp        DEFAULT NULL,
  -- L&T additions
  `lat_email`            varchar(255)     DEFAULT NULL,
  `lat_password`         varchar(255)     DEFAULT NULL,
  `lat_lat`              double           DEFAULT NULL,
  `lat_lng`              double           DEFAULT NULL,
  `lat_is_admin`         tinyint(1)       NOT NULL DEFAULT 0,
  `lat_active`           tinyint(1)       NOT NULL DEFAULT 1,
  `lat_last_active_at`   datetime(3)      DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_lat_email` (`lat_email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Freegle core: sessions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `sessions` (
  `id`         bigint unsigned NOT NULL AUTO_INCREMENT,
  `userid`     bigint unsigned DEFAULT NULL,
  `series`     bigint unsigned NOT NULL,
  `token`      varchar(191)    NOT NULL,
  `date`       timestamp       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lastactive` timestamp       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_3` (`id`,`series`,`token`),
  KEY `userid` (`userid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Freegle core: chat_rooms ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `chat_rooms` (
  `id`            bigint unsigned NOT NULL AUTO_INCREMENT,
  `user1`         bigint unsigned DEFAULT NULL,
  `user2`         bigint unsigned DEFAULT NULL,
  `chattype`      enum('Mod2Mod','User2Mod','User2User','Group') NOT NULL DEFAULT 'User2User',
  `created`       timestamp       DEFAULT CURRENT_TIMESTAMP,
  `updated`       timestamp       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `latestmessage` timestamp       DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user1_2` (`user1`,`user2`,`chattype`),
  KEY `user1` (`user1`),
  KEY `user2` (`user2`),
  KEY `rooms` (`user1`,`chattype`,`latestmessage`),
  KEY `rooms2` (`user2`,`chattype`,`latestmessage`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Freegle core: chat_messages ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id`              bigint unsigned NOT NULL AUTO_INCREMENT,
  `chatid`          bigint unsigned NOT NULL,
  `userid`          bigint unsigned NOT NULL,
  `type`            enum('Default','System','ModMail','Interested','Promised','Reneged','ReportedUser','Completed','Image','Address','Nudge','Schedule','ScheduleUpdated','Reminder') NOT NULL DEFAULT 'Default',
  `date`            timestamp       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `message`         text            DEFAULT NULL,
  `seenbyall`       tinyint(1)      NOT NULL DEFAULT 0,
  `reviewrequired`  tinyint(1)      NOT NULL DEFAULT 0,
  `deleted`         tinyint(1)      NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `chatid` (`chatid`),
  KEY `userid` (`userid`),
  KEY `chatid_2` (`chatid`,`date`),
  KEY `reviewrequired` (`reviewrequired`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Freegle core: messages ─────────────────────────────────────────────────
-- Gardens are Freegle messages: Lend = Offer, Tend = Wanted
CREATE TABLE IF NOT EXISTS `messages` (
  `id`                  bigint unsigned  NOT NULL AUTO_INCREMENT,
  `arrival`             timestamp        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `date`                timestamp        NULL DEFAULT NULL,
  `deleted`             timestamp        NULL DEFAULT NULL,
  `fromuser`            bigint unsigned  DEFAULT NULL,
  `fromname`            varchar(191)     DEFAULT NULL,
  `subject`             varchar(191)     DEFAULT NULL,
  `textbody`            longtext         DEFAULT NULL,
  `type`                enum('Offer','Taken','Wanted','Received','Admin','Other') DEFAULT NULL,
  `lat`                 decimal(10,6)    DEFAULT NULL,
  `lng`                 decimal(10,6)    DEFAULT NULL,
  `availableinitially`  int              NOT NULL DEFAULT 1,
  `availablenow`        int              NOT NULL DEFAULT 1,
  `source`              enum('Yahoo Approved','Yahoo Pending','Yahoo System','Platform','Email') DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fromuser` (`fromuser`),
  KEY `type` (`type`),
  KEY `lat` (`lat`),
  KEY `lng` (`lng`),
  KEY `deleted` (`deleted`),
  KEY `arrival` (`arrival`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── L&T specific: lender profiles ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `lat_lender_profiles` (
  `user_id`          bigint unsigned NOT NULL,
  `garden_size`      varchar(20)     DEFAULT NULL,
  `sun_exposure`     varchar(20)     DEFAULT NULL,
  `water_access`     tinyint(1)      NOT NULL DEFAULT 0,
  `access_route`     varchar(40)     DEFAULT NULL,
  `arrangement_type` varchar(20)     DEFAULT NULL,
  `tasks_wanted`     text            DEFAULT NULL,
  `restrictions`     text            DEFAULT NULL,
  `tools_available`  text            DEFAULT NULL,
  `description`      text            DEFAULT NULL,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── L&T specific: tender profiles ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `lat_tender_profiles` (
  `user_id`              bigint unsigned NOT NULL,
  `growing_interests`    text            DEFAULT NULL,
  `commercial_intent`    tinyint(1)      NOT NULL DEFAULT 0,
  `tools_available`      text            DEFAULT NULL,
  `available_days`       text            DEFAULT NULL,
  `offender_declaration` tinyint(1)      NOT NULL DEFAULT 0,
  `description`          text            DEFAULT NULL,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── L&T specific: agreements ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `lat_agreements` (
  `id`                   bigint unsigned  NOT NULL AUTO_INCREMENT,
  `lender_id`            bigint unsigned  NOT NULL,
  `tender_id`            bigint unsigned  NOT NULL,
  `status`               varchar(30)      NOT NULL DEFAULT 'draft',
  `garden_address`       text             DEFAULT NULL,
  `gardening_hours`      varchar(100)     DEFAULT NULL,
  `growing_purpose`      text             DEFAULT NULL,
  `max_people`           int              DEFAULT NULL,
  `exchange_terms`       text             DEFAULT NULL,
  `end_date`             date             DEFAULT NULL,
  `notice_period_months` int              NOT NULL DEFAULT 1,
  `allow_animals`        tinyint(1)       NOT NULL DEFAULT 0,
  `allow_commercial`     tinyint(1)       NOT NULL DEFAULT 0,
  `additional_terms`     text             DEFAULT NULL,
  `lender_agreed_at`     timestamp        DEFAULT NULL,
  `tender_agreed_at`     timestamp        DEFAULT NULL,
  `created_at`           timestamp        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`           timestamp        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `lender_id` (`lender_id`),
  KEY `tender_id` (`tender_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── L&T specific: check-ins ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `lat_checkins` (
  `id`               bigint unsigned NOT NULL AUTO_INCREMENT,
  `agreement_id`     bigint unsigned NOT NULL,
  `scheduled_at`     timestamp       NOT NULL,
  `sent_at`          timestamp       DEFAULT NULL,
  `lender_status`    varchar(20)     DEFAULT NULL,
  `tender_status`    varchar(20)     DEFAULT NULL,
  `needs_mediation`  tinyint(1)      NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `agreement_id` (`agreement_id`),
  KEY `scheduled_at` (`scheduled_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── L&T specific: notifications ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `lat_notifications` (
  `id`         bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id`    bigint unsigned NOT NULL,
  `type`       varchar(40)     NOT NULL,
  `title`      varchar(191)    NOT NULL,
  `body`       text            NOT NULL,
  `link`       varchar(191)    DEFAULT NULL,
  `read`       tinyint(1)      NOT NULL DEFAULT 0,
  `created_at` timestamp       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `read` (`read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── L&T specific: blocked users ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `lat_blocked_users` (
  `blocker_id` bigint unsigned NOT NULL,
  `blocked_id` bigint unsigned NOT NULL,
  `created_at` timestamp       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`blocker_id`,`blocked_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── L&T specific: word filters ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `lat_word_filters` (
  `id`      bigint unsigned NOT NULL AUTO_INCREMENT,
  `pattern` varchar(191)    NOT NULL,
  `action`  varchar(10)     NOT NULL DEFAULT 'flag',
  PRIMARY KEY (`id`),
  UNIQUE KEY `pattern` (`pattern`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── L&T specific: admin impersonations ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS `lat_admin_impersonations` (
  `id`         bigint unsigned NOT NULL AUTO_INCREMENT,
  `admin_id`   bigint unsigned NOT NULL,
  `target_id`  bigint unsigned NOT NULL,
  `reason`     text            DEFAULT NULL,
  `created_at` timestamp       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `admin_id` (`admin_id`),
  KEY `target_id` (`target_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
