#!/bin/sh

set -eu

if [ -z "${PORT:-}" ]; then
  echo "PORT is required" >&2
  exit 1
fi

case "$PORT" in
  *[!0-9]*|0|0[0-9]*)
    echo "PORT must be an integer between 1024 and 65535" >&2
    exit 1
    ;;
esac

if [ "${#PORT}" -gt 5 ] || [ "$PORT" -lt 1024 ] || [ "$PORT" -gt 65535 ]; then
  echo "PORT must be an integer between 1024 and 65535" >&2
  exit 1
fi

envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /tmp/nginx.conf
nginx -t -c /tmp/nginx.conf

exec "$@"
