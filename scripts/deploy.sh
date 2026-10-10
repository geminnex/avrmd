#!/usr/bin/env bash
# Two-step deploy that never rebuilds the directory the live server reads.
#
#   scripts/deploy.sh prepare    install, test, migrate, build into .next-release,
#                                smoke-test it on a spare port. Touches nothing live.
#   scripts/deploy.sh activate   swap .next-release in (old build kept as
#                                .next-prev), restart avrmd.service, check the live
#                                site, and swap back automatically if it fails.
#   scripts/deploy.sh rollback   swap .next-prev back in and restart.
#
# activate and rollback restart production and need sudo; they are run only
# with the owner's go-ahead.
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo"
live_url="${AVRMD_LIVE_URL:-https://avrmd.cyalin.com}"
smoke_port="${AVRMD_SMOKE_PORT:-3190}"
pages=(/ /questions /ask /talks /members /clearances /signals /sign-in /privacy /entities/osso-vr /topics/surgical-training /stages/regulatory)

check_pages() { # base-url
  local failed=0
  for path in "${pages[@]}"; do
    code=$(curl -s -o /dev/null -m 20 -w "%{http_code}" "$1$path" || true)
    if [[ "$code" != "200" ]]; then echo "  FAIL $path → $code"; failed=1; fi
  done
  return $failed
}

restart_and_check() {
  sudo systemctl restart avrmd.service
  for _ in $(seq 1 20); do
    sleep 2
    if curl -s -o /dev/null -m 5 "$live_url/"; then break; fi
  done
  check_pages "$live_url"
}

case "${1:-}" in
  prepare)
    # Editors approve records from /workspace, which writes data/catalog.json;
    # the robot refreshes the FDA list. Commit that content so every release
    # is reproducible from git.
    if ! git diff --quiet -- data/catalog.json data/fda-xr-devices.json; then
      added=$(git diff -U0 -- data/catalog.json | grep -c '^+    "slug"' || true)
      git add data/catalog.json data/fda-xr-devices.json
      git commit -q -m "Publish content: ${added} approved record(s) and data refresh" -m "Committed by scripts/deploy.sh prepare from editor approvals in /workspace and the daily robot."
      echo "== committed content changes (${added} new record(s)); push when ready"
    fi
    echo "== $(git rev-parse --short HEAD) $(git log -1 --format=%s)"
    [[ -z "$(git status --porcelain)" ]] || echo "warning: uncommitted changes are included"
    corepack pnpm install --frozen-lockfile
    node_modules/.bin/tsc --noEmit
    node_modules/.bin/vitest run
    set -a; . ./.env; set +a
    node_modules/.bin/drizzle-kit migrate
    rm -rf .next-release
    NEXT_DIST_DIR=.next-release node_modules/.bin/next build
    echo "== smoke test on :$smoke_port"
    NEXT_DIST_DIR=.next-release NODE_ENV=production node_modules/.bin/next start -p "$smoke_port" > /tmp/avrmd-smoke.log 2>&1 &
    pid=$!
    trap 'kill $pid 2>/dev/null || true' EXIT
    for _ in $(seq 1 30); do sleep 1; curl -s -o /dev/null "http://localhost:$smoke_port/" && break; done
    check_pages "http://localhost:$smoke_port"
    git rev-parse HEAD > .next-release/DEPLOYED_COMMIT
    echo "== release ready in .next-release ($(git rev-parse --short HEAD)); run: scripts/deploy.sh activate"
    ;;
  activate)
    [[ -f .next-release/BUILD_ID ]] || { echo "no prepared release; run prepare first"; exit 1; }
    rm -rf .next-prev
    mv .next .next-prev
    mv .next-release .next
    echo "== restarting with $(cat .next/DEPLOYED_COMMIT 2>/dev/null | cut -c1-7)"
    if restart_and_check; then
      echo "== live and healthy"
    else
      echo "== live check failed: rolling back"
      mv .next .next-failed-$(date +%s)
      mv .next-prev .next
      restart_and_check && echo "== rolled back; previous release is live" || echo "== ROLLBACK ALSO FAILING — investigate now"
      exit 1
    fi
    ;;
  rollback)
    [[ -d .next-prev ]] || { echo "no previous release to roll back to"; exit 1; }
    mv .next .next-rolled-back-$(date +%s)
    mv .next-prev .next
    restart_and_check && echo "== previous release is live"
    ;;
  *)
    sed -n '2,13p' "$0"; exit 2 ;;
esac
