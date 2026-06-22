#!/bin/sh

set -eu

IMAGE_NAME=${IMAGE_NAME:-calendar-booking:smoke}
PORT=${PORT:-18080}
CONTAINER_NAME="calendar-booking-smoke-$$"

cleanup() {
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}

fail() {
  echo "$1" >&2
  docker logs "$CONTAINER_NAME" 2>/dev/null || true
  exit 1
}

assert_invalid_port() {
  value=$1
  if docker run --rm -e "PORT=$value" "$IMAGE_NAME" >/dev/null 2>&1; then
    fail "container unexpectedly accepted PORT=$value"
  fi
}

wait_until_healthy() {
  attempts=0
  while [ "$attempts" -lt 30 ]; do
    status=$(docker inspect --format '{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || true)
    if [ "$status" = "healthy" ]; then
      return 0
    fi
    attempts=$((attempts + 1))
    sleep 1
  done
  fail "container did not become healthy"
}

wait_for_restart() {
  program=$1
  old_pid=$2
  attempts=0
  while [ "$attempts" -lt 30 ]; do
    status=$(docker exec "$CONTAINER_NAME" supervisorctl -c /etc/supervisord.conf status "$program" 2>/dev/null || true)
    new_pid=$(docker exec "$CONTAINER_NAME" supervisorctl -c /etc/supervisord.conf pid "$program" 2>/dev/null || true)
    case "$status" in
      *RUNNING*)
        if [ -n "$new_pid" ] && [ "$new_pid" != "$old_pid" ]; then
          return 0
        fi
        ;;
    esac
    attempts=$((attempts + 1))
    sleep 1
  done
  fail "supervisor did not restart $program"
}

trap cleanup EXIT INT TERM

PORT="$PORT" docker compose config --quiet
if PORT= docker compose config --quiet >/dev/null 2>&1; then
  fail "compose unexpectedly accepted an empty PORT"
fi

docker build --tag "$IMAGE_NAME" .

if docker run --rm "$IMAGE_NAME" >/dev/null 2>&1; then
  fail "container unexpectedly started without PORT"
fi
assert_invalid_port abc
assert_invalid_port 80
assert_invalid_port 65536
assert_invalid_port 99999999999999999999

docker run --detach \
  --name "$CONTAINER_NAME" \
  --env "PORT=$PORT" \
  --publish "127.0.0.1:$PORT:$PORT" \
  "$IMAGE_NAME" >/dev/null

wait_until_healthy

test "$(docker exec "$CONTAINER_NAME" id -u)" != "0" \
  || fail "container processes run as root"
test "$(curl --fail --silent --show-error "http://127.0.0.1:$PORT/healthz")" = '{"status":"ok"}' \
  || fail "health endpoint returned an unexpected response"
curl --fail --silent --show-error "http://127.0.0.1:$PORT/api/owner" | grep -q 'owner-1' \
  || fail "API proxy did not return the owner"
curl --fail --silent --show-error "http://127.0.0.1:$PORT/admin/event-types" | grep -q '<div id="app"></div>' \
  || fail "SPA history fallback did not return index.html"

for program in backend nginx; do
  old_pid=$(docker exec "$CONTAINER_NAME" supervisorctl -c /etc/supervisord.conf pid "$program")
  docker exec "$CONTAINER_NAME" kill -KILL "$old_pid"
  wait_for_restart "$program" "$old_pid"
done

wait_until_healthy
curl --fail --silent --show-error "http://127.0.0.1:$PORT/api/owner" >/dev/null \
  || fail "application did not recover after process restarts"

docker stop --time 20 "$CONTAINER_NAME" >/dev/null
exit_code=$(docker inspect --format '{{.State.ExitCode}}' "$CONTAINER_NAME")
test "$exit_code" = "0" || fail "container did not stop gracefully"
