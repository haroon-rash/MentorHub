#!/usr/bin/env bash
# Rebuild and recreate MentorHub-final containers.
#
# Default (fast): gateway + user API + tutor-service + frontend (code we changed most often).
#   bash scripts/rebuild-mentorhub-final.sh
#
# If the UI still shows old errors after code changes, rebuild without Docker layer cache:
#   NO_CACHE=1 bash scripts/rebuild-mentorhub-final.sh
#
# Full stack rebuild (slow; includes ai-sentiment / large Python layers):
#   FULL_REBUILD=1 bash scripts/rebuild-mentorhub-final.sh
#
# Wipe Postgres + uploads volumes then full rebuild (DESTRUCTIVE):
#   WIPE_VOLUMES=1 FULL_REBUILD=1 bash scripts/rebuild-mentorhub-final.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
COMPOSE=(docker compose -f docker-compose.mentorhub-final.yml)

AFFECTED_SERVICES=(api-gateway usermanagment-api tutor-service frontend)

if [[ "${WIPE_VOLUMES:-0}" == "1" ]]; then
  echo "Stopping stack and removing named volumes (database + uploads)…"
  "${COMPOSE[@]}" down -v
elif [[ "${FULL_REBUILD:-0}" == "1" ]]; then
  echo "Stopping stack (keeping volumes)…"
  "${COMPOSE[@]}" down
fi

if [[ "${FULL_REBUILD:-0}" == "1" ]]; then
  echo "Building ALL images (use FULL_REBUILD=1 with WIPE_VOLUMES carefully)…"
  if [[ "${NO_CACHE:-0}" == "1" ]]; then
    "${COMPOSE[@]}" build --no-cache
  else
    "${COMPOSE[@]}" build
  fi
  echo "Starting all services…"
  "${COMPOSE[@]}" up -d
else
  echo "Building affected images: ${AFFECTED_SERVICES[*]}"
  if [[ "${NO_CACHE:-0}" == "1" ]]; then
    "${COMPOSE[@]}" build --no-cache "${AFFECTED_SERVICES[@]}"
  else
    "${COMPOSE[@]}" build "${AFFECTED_SERVICES[@]}"
  fi
  echo "Recreating affected containers…"
  "${COMPOSE[@]}" up -d --force-recreate "${AFFECTED_SERVICES[@]}"
fi

echo "Done. Frontend: http://localhost:3005  Gateway: http://localhost:8080"
"${COMPOSE[@]}" ps
