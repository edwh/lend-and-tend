<?php

namespace App\Services\Lat;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Shared helpers for the Lend & Tend email batch commands.
 *
 * Centralises the things every L&T mail command needs: the world-group id,
 * how to find a user's location (L&T users don't have users.lastlocation
 * populated, so we fall back to the location of their own listing), who
 * counts as an "active" lender or "still-looking" tender, preferred email
 * lookup, distance maths, and reading/writing the per-user settings JSON.
 *
 * Garden listing = Freegle message (Offer = lender, Wanted = tender).
 * Agreement = messages_promises row: lender = messages.fromuser (the Offer's
 * owner), tender = messages_promises.userid (the party promised to).
 */
class LatMailService
{
    private const EARTH_RADIUS_KM = 6371.0;

    /** Cache of resolved member rows, keyed by world-group id. */
    private array $memberCache = [];

    public function worldGroupId(): int
    {
        return (int) config('freegle.lat.world_groupid', 0);
    }

    /**
     * Great-circle distance in km between two WGS-84 points.
     */
    public function haversineKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return self::EARTH_RADIUS_KM * 2 * asin(min(1.0, sqrt($a)));
    }

    /**
     * Preferred email address for a user (preferred flag wins, else any).
     */
    public function preferredEmail(int $userId): ?string
    {
        return DB::table('users_emails')
            ->where('userid', $userId)
            ->orderByDesc('preferred')
            ->orderBy('id')
            ->value('email');
    }

    /**
     * Decode a raw users.settings JSON string to an array.
     */
    public function settings(?string $raw): array
    {
        if (empty($raw)) {
            return [];
        }
        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : [];
    }

    /**
     * Persist a user's settings array back to users.settings.
     */
    public function saveSettings(int $userId, array $settings): void
    {
        DB::table('users')
            ->where('id', $userId)
            ->update(['settings' => json_encode($settings)]);
    }

    /**
     * lat/lng of a single message (e.g. the matched garden), or null.
     *
     * @return array{lat: float, lng: float}|null
     */
    public function messageLatLng(int $msgid): ?array
    {
        $row = DB::table('messages')
            ->where('id', $msgid)
            ->whereNotNull('lat')
            ->whereNotNull('lng')
            ->first(['lat', 'lng']);

        return $row ? ['lat' => (float) $row->lat, 'lng' => (float) $row->lng] : null;
    }

    /**
     * Public image URL for a message's first photo, via the delivery service,
     * or null if it has none. Guarded so it degrades to null where the
     * messages_attachments table is absent (e.g. the seed dev DB).
     */
    public function messageImageUrl(int $msgid): ?string
    {
        try {
            $att = DB::table('messages_attachments')->where('msgid', $msgid)->orderBy('id')->first();
        } catch (\Throwable $e) {
            return null;
        }
        if (!$att) {
            return null;
        }
        $base = rtrim((string) config('freegle.delivery.base_url'), '/');
        if (!empty($att->externalurl)) {
            return $base . '?url=' . urlencode($att->externalurl) . '&w=300';
        }
        if (!empty($att->id)) {
            $imagesDomain = rtrim((string) config('freegle.images.domain'), '/');
            return $base . '?url=' . urlencode("{$imagesDomain}/timg_{$att->id}.jpg") . '&w=300';
        }

        return null;
    }

    /**
     * Safe, human-readable snippet from a listing's textbody for use in emails.
     *
     * L&T listings store the body as JSON (built by the lend/tend form:
     * {description, address, postcode, phone, ...}). Only the free-text
     * `description` is safe to broadcast — the address and phone are PRIVATE
     * and must never appear in an alert sent to nearby users. Returns null when
     * there's nothing safe to show. Non-JSON (legacy/plain) bodies pass through.
     */
    public function listingSnippet(?string $textbody): ?string
    {
        $textbody = trim((string) $textbody);
        if ($textbody === '') {
            return null;
        }

        $data = json_decode($textbody, true);
        if (is_array($data)) {
            // Structured L&T body — expose the description only, never PII.
            $desc = trim((string) ($data['description'] ?? ''));
            return $desc !== '' ? $desc : null;
        }

        // Plain-text body (not the structured form) — safe to show as-is.
        return $textbody;
    }

    /**
     * New, visible Offer/Wanted listings in the world group within $since,
     * as card-ready rows: id, subject, type, text (snippet source), lat, lng,
     * fromuser, imageUrl (or null). Shared by the activity-alert and monthly
     * check-in emails so both show real listings like the Freegle digest.
     */
    public function recentListings(\Illuminate\Support\Carbon $since): Collection
    {
        $rows = DB::table('messages')
            ->join('messages_groups', 'messages.id', '=', 'messages_groups.msgid')
            ->where('messages_groups.groupid', $this->worldGroupId())
            ->where('messages_groups.collection', 'Approved')
            ->where('messages.arrival', '>=', $since)
            ->whereIn('messages.type', ['Offer', 'Wanted'])
            ->whereNull('messages.deleted')
            ->whereNotNull('messages.lat')
            ->whereNotNull('messages.lng')
            ->select('messages.id', 'messages.subject', 'messages.type', 'messages.textbody', 'messages.lat', 'messages.lng', 'messages.fromuser')
            ->orderByDesc('messages.arrival')
            ->get();

        foreach ($rows as $r) {
            $r->imageUrl = $this->messageImageUrl((int) $r->id);
        }

        return $rows;
    }

    /**
     * The lender (Offer owner) and tender (promised-to) of an agreement.
     *
     * @return array{lender: int, tender: int}
     */
    public function agreementParties(int $msgid, int $promiseUserId): array
    {
        $lender = (int) DB::table('messages')->where('id', $msgid)->value('fromuser');

        return ['lender' => $lender, 'tender' => (int) $promiseUserId];
    }

    /**
     * A single user as { id, fullname, settings(array), email } or null.
     */
    public function userRecord(int $userId): ?object
    {
        $u = DB::table('users')->where('id', $userId)->first(['id', 'fullname', 'settings']);
        if (!$u) {
            return null;
        }

        return (object) [
            'id' => (int) $u->id,
            'fullname' => $u->fullname,
            'settings' => $this->settings($u->settings),
            'email' => $this->preferredEmail($userId),
        ];
    }

    /**
     * All world-group members with a resolved location, preferred email and
     * decoded settings. Location resolution prefers users.lastlocation →
     * locations.lat/lng, and falls back to the location of the user's most
     * recent world-group listing (L&T users typically have no lastlocation).
     *
     * Each row: (object){ id, fullname, settings(array), lat, lng, email }.
     */
    public function membersWithLocation(): Collection
    {
        $grp = $this->worldGroupId();
        if (isset($this->memberCache[$grp])) {
            return $this->memberCache[$grp];
        }

        // World-group members (one row per user).
        $users = DB::table('users')
            ->join('memberships', 'memberships.userid', '=', 'users.id')
            ->where('memberships.groupid', $grp)
            ->whereNull('users.deleted')
            ->select('users.id', 'users.fullname', 'users.settings', 'users.lastlocation')
            ->distinct()
            ->get()
            ->keyBy('id');

        if ($users->isEmpty()) {
            return $this->memberCache[$grp] = collect();
        }

        $userIds = $users->keys()->all();

        // Declared location via lastlocation → locations.
        $lastLocIds = $users->pluck('lastlocation')->filter()->unique()->values()->all();
        $locById = $lastLocIds
            ? DB::table('locations')->whereIn('id', $lastLocIds)->get(['id', 'lat', 'lng'])->keyBy('id')
            : collect();

        // Fallback: lat/lng of each user's most recent world-group listing.
        $msgLoc = DB::table('messages')
            ->join('messages_groups', 'messages_groups.msgid', '=', 'messages.id')
            ->where('messages_groups.groupid', $grp)
            ->whereIn('messages.fromuser', $userIds)
            ->whereNotNull('messages.lat')
            ->whereNotNull('messages.lng')
            ->orderByDesc('messages.id')
            ->get(['messages.fromuser', 'messages.lat', 'messages.lng']);
        $msgLocByUser = [];
        foreach ($msgLoc as $row) {
            // First seen wins (ordered newest first).
            if (!isset($msgLocByUser[$row->fromuser])) {
                $msgLocByUser[$row->fromuser] = $row;
            }
        }

        // Preferred email per user (preferred flag, else lowest id).
        $emails = DB::table('users_emails')
            ->whereIn('userid', $userIds)
            ->orderByDesc('preferred')
            ->orderBy('id')
            ->get(['userid', 'email']);
        $emailByUser = [];
        foreach ($emails as $row) {
            if (!isset($emailByUser[$row->userid])) {
                $emailByUser[$row->userid] = $row->email;
            }
        }

        $out = collect();
        foreach ($users as $u) {
            $lat = null;
            $lng = null;
            if ($u->lastlocation && $locById->has($u->lastlocation)) {
                $loc = $locById->get($u->lastlocation);
                $lat = $loc->lat;
                $lng = $loc->lng;
            } elseif (isset($msgLocByUser[$u->id])) {
                $lat = $msgLocByUser[$u->id]->lat;
                $lng = $msgLocByUser[$u->id]->lng;
            }
            if ($lat === null || $lng === null) {
                continue; // No usable location — can't target by distance.
            }
            $out->push((object) [
                'id' => (int) $u->id,
                'fullname' => $u->fullname,
                'settings' => $this->settings($u->settings),
                'lat' => (float) $lat,
                'lng' => (float) $lng,
                'email' => $emailByUser[$u->id] ?? null,
            ]);
        }

        return $this->memberCache[$grp] = $out;
    }

    /**
     * World-group members within $radiusKm of a point, optionally excluding
     * some user ids. Each row gains a ->distance_km field.
     */
    public function usersNearPoint(float $lat, float $lng, float $radiusKm, array $excludeUserIds = []): Collection
    {
        $exclude = array_flip(array_map('intval', $excludeUserIds));

        return $this->membersWithLocation()
            ->reject(fn ($u) => isset($exclude[$u->id]) || empty($u->email))
            ->map(function ($u) use ($lat, $lng) {
                $u = clone $u;
                $u->distance_km = round($this->haversineKm($lat, $lng, $u->lat, $u->lng), 1);

                return $u;
            })
            ->filter(fn ($u) => $u->distance_km <= $radiusKm)
            ->values();
    }

    /**
     * User ids of active lenders: own an Offer in the world group that has no
     * agreement (messages_promises) and no outcome (still available).
     *
     * @return array<int,int>
     */
    public function activeLenderIds(): array
    {
        return DB::table('messages as m')
            ->join('messages_groups as mg', 'mg.msgid', '=', 'm.id')
            ->leftJoin('messages_promises as mp', 'mp.msgid', '=', 'm.id')
            ->leftJoin('messages_outcomes as mo', 'mo.msgid', '=', 'm.id')
            ->where('mg.groupid', $this->worldGroupId())
            ->where('m.type', 'Offer')
            ->whereNull('m.deleted')
            ->whereNull('mp.id')
            ->whereNull('mo.id')
            ->distinct()
            ->pluck('m.fromuser')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /**
     * User ids of still-looking tenders: own an open Wanted in the world group
     * (no outcome), unless they've explicitly set lat_still_looking=not_looking.
     * Also includes anyone who explicitly set lat_still_looking=looking.
     *
     * @return array<int,int>
     */
    public function stillLookingTenderIds(): array
    {
        $grp = $this->worldGroupId();

        $openWanted = DB::table('messages as m')
            ->join('messages_groups as mg', 'mg.msgid', '=', 'm.id')
            ->leftJoin('messages_outcomes as mo', 'mo.msgid', '=', 'm.id')
            ->where('mg.groupid', $grp)
            ->where('m.type', 'Wanted')
            ->whereNull('m.deleted')
            ->whereNull('mo.id')
            ->distinct()
            ->pluck('m.fromuser')
            ->map(fn ($id) => (int) $id)
            ->all();

        // Explicit overrides from settings.
        $explicitLooking = DB::table('users')
            ->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(settings, '$.lat_still_looking.status')) = 'looking'")
            ->pluck('id')->map(fn ($id) => (int) $id)->all();
        $notLooking = array_flip(DB::table('users')
            ->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(settings, '$.lat_still_looking.status')) = 'not_looking'")
            ->pluck('id')->map(fn ($id) => (int) $id)->all());

        $ids = array_unique(array_merge($openWanted, $explicitLooking));

        return array_values(array_filter($ids, fn ($id) => !isset($notLooking[$id])));
    }
}
