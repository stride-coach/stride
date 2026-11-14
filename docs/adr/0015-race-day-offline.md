# ADR 0015: Race-day view offline

- Status: Accepted
- Date: 2026-11-14
- Issue: #509
- Amends: [ADR 0014](0014-postgres-scheduled-push-delivery.md)

## Context

On race day the athlete opens the race-day view (`/races/[id]/day`) on the phone, often where the network drops: forests, valleys, aid stations crowded with phones. The view must open and take aid-station check-ins without a network after it was opened once from the day before the race. ADR 0014 kept the service worker to pushes with no offline cache. Stride does not want the whole app offline: every other screen reads fresh data and assumes a session.

## Decision

- Only the race-day view works offline. Its server render embeds a frozen race-day plan (`RaceDayPlan`): passages, barriers, intakes, climbs, night and the to-do of each aid station. The estimate, the next intake, the margins and the recalibration from the last check-in run in the browser, so the view needs no request once loaded.
- The existing `public/sw.js` serves it. No PWA library is added. Each time the view opens, the page registers the service worker and saves a copy into the `stride-race-day-v1` Cache Storage cache: its own HTML, every `/_next/static/` file it loaded, and an expiry entry two days after the race start.
- The service worker answers a navigation to `/races/<id>/day` from the network first. When the network fails or takes more than four seconds, it serves the saved copy. Other navigations are untouched; `/_next/static/` files fall back to the saved copy only when the network fails. Expired copies are removed on activation and on each navigation, and the cache is deleted once no copy is live.
- Check-ins are written to the phone first (`localStorage`, one entry per race), then sent to `POST /api/races/[id]/checkins`, which upserts one `race_checkins` row per race and aid station. A check-in stays queued until the server accepts it, and the queue is sent again when the page opens and when the browser goes back online. Sending twice is harmless: the row keeps the last time. The phone's check-ins are laid over those of the saved page, which may be older. The ticked to-do items of each aid station stay on the phone.
- Signing out deletes the cache and the race-day entries in `localStorage`, next to the push subscription.

## Alternatives considered

- A PWA library such as Serwist or next-pwa: a build step and a precache of the whole app for one screen.
- Caching every page offline: stale plans and coach screens without a session, for no race-day need.
- Background Sync to send queued check-ins: Safari on iOS does not support it, and the owner uses an iPhone.
- A server action for check-ins: a queued call must be replayable by plain `fetch` after a reload.

## Trade-offs

- The athlete must open the view once with a network from the day before. The status line says « Plan enregistré sur le téléphone » once the copy is saved.
- The saved copy holds the athlete's race plan on the device until two days after the start or until sign-out.
- Stride never tracks the position. The estimate follows the plan and stops at the next aid station until the athlete checks in there.
- In `next dev` the hot-reload client keeps the offline page from hydrating, so the offline journey is only meaningful against a production build.

## Consequences

- Another offline screen would reuse the same cache and expiry entry pattern rather than cache the app.
- Check-ins are available to later work such as the after-race view or the crew link.
