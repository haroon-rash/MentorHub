#!/usr/bin/env bash
# MentorHub final stack — separate from docker-compose.yml (mentorhub-* containers)
set -euo pipefail

COMPOSE_FILE="docker-compose.mentorhub-final.yml"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

cmd="${1:-up}"

case "$cmd" in
  up)
    docker compose -f "$COMPOSE_FILE" up -d --build
    echo ""
    echo "MentorHub Final is running."
    echo "  Frontend:    http://localhost:3005"
    echo "  API Gateway: http://localhost:8080"
    echo "  Mailpit:     http://localhost:8025"
    echo "  Postgres:    localhost:5432 (db: mentorhub, user: postgres, pass: admin)"
    ;;
  down)
    docker compose -f "$COMPOSE_FILE" down
    ;;
  down-volumes)
    docker compose -f "$COMPOSE_FILE" down -v
    echo "Removed mentorhub-final containers and volumes (fresh DB/uploads)."
    ;;
  logs)
    docker compose -f "$COMPOSE_FILE" logs -f "${2:-}"
    ;;
  ps)
    docker compose -f "$COMPOSE_FILE" ps
    ;;
  *)
    echo "Usage: $0 {up|down|down-volumes|logs [service]|ps}"
    exit 1
    ;;
esac
