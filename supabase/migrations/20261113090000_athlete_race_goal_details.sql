alter table public.athlete_races
  add column location text
    check (location is null or char_length(btrim(location)) between 1 and 120),
  add column poles text
    check (poles is null or poles in ('allowed', 'forbidden', 'unknown')),
  add column expectation text
    check (expectation is null or expectation in ('performance', 'rehearsal', 'fun')),
  add column test_items text[]
    check (
      test_items is null
      or (
        cardinality(test_items) between 1 and 8
        and char_length(array_to_string(test_items, '')) <= 480
        and array_position(test_items, null) is null
      )
    );

grant insert (location, poles, expectation, test_items)
  on public.athlete_races to authenticated;
grant update (location, poles, expectation, test_items)
  on public.athlete_races to authenticated;
