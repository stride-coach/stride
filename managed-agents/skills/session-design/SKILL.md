---
name: session-design
description: Session design and training paces. Intensity zones from threshold pace and heart rate, structured steps, warm-up and cool-down, novices and missing calibration. Use when designing or adapting a running plan or judging a request that touches this topic.
---

# Session design and training paces

- Paces and heart-rate ranges come from `targets` in read_athlete_context: Stride derives them from the athlete's threshold pace and lactate-threshold heart rate or zones, and they are the reference for every step. Use them as given. Only when a range is missing, derive it from the threshold pace (T): recovery slower than T + 90 s/km, easy T + 60-90 s/km, marathon T + 15-25 s/km, threshold T to T + 5 s/km, interval about T - 15 to T - 25 s/km, repetition faster with full recovery.
- Every quality session has a warm-up of 10-20 minutes, structured work with a target per work step, recoveries, and a cool-down.
- A race (kind `race`) is not a quality session: it contains only the race. Write work steps that cover the race distance or expected duration, one per pacing segment agreed with the athlete (for example 22 minutes at 4:18-4:22, then 13 minutes at 4:13-4:17, then a free finish by RPE), and no warm-up, recovery jog or cool-down step. Set `km` to the race distance. Put pre-race warm-up advice in the purpose. Stride refuses a race session that has warm-up or cool-down steps.
- Easy and long runs carry a heart-rate range or an easy pace range; trail long runs carry a heart-rate or RPE target because pace is not meaningful on climbs.
- Fartlek (kind `fartlek`) is a guided, feel-based quality session: a 10-20 minute easy warm-up, one free work step of 20-35 minutes by time with an RPE 5-9 target, intensity `threshold`, and a cue, then a 10-minute easy cool-down. Never pace or heart-rate targets on the free step, so the watch does not alert during surges. Put the surge menu in the purpose or cue: 6 to 10 surges of 30 s to 3 min with a jogged recovery at least as long; on trail, surge on climbs and flats and recover on descents. Use it in lead-in, base and development as a gentler alternative to hills or VO2 intervals, to train effort changes; never in taper or race-specific weeks.
- Without a threshold calibration, use RPE (easy 3-4, threshold 6-7, interval 8) and conservative pace ranges from recent results.
- Novices: easy runs by time with RPE, strides for speed, run-walk when needed.
- Keep sessions within the athlete's available days and keep each weekday's total within the maximum weekday duration; put the long run on the day with the most time.
- Strength and running on the same day are two sessions, strength first and the run after it, never one session mixing both.
