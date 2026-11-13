#!/usr/bin/env bash
set -euo pipefail

config="supabase/config.toml"

sed -i -E \
  -e 's/^project_id = "stride"$/project_id = "stride-ci"/' \
  -e 's/^([[:space:]]*(port|shadow_port)[[:space:]]*=[[:space:]]*)543([0-9]{2})$/\1553\3/' \
  -e 's/^([[:space:]]*inspector_port[[:space:]]*=[[:space:]]*)8083$/\19083/' \
  "$config"

grep -q '^project_id = "stride-ci"$' "$config"
if grep -nE '^[^#]*=[[:space:]]*(543[0-9]{2}|8083)$' "$config"; then
  echo "supabase/config.toml still uses a port of the local stack." >&2
  exit 1
fi
