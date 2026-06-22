FROM node:24.12.0-alpine3.22 AS frontend-builder

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV VITE_API_BASE_URL=/api

RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

WORKDIR /app/frontend

COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY frontend/ ./
RUN pnpm build


FROM golang:1.22.12-alpine3.21 AS backend-builder

WORKDIR /src/backend

COPY backend/go.mod ./
RUN go mod download

COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server


FROM nginx:1.28.0-alpine3.21 AS runtime

ARG SUPERVISOR_VERSION=4.2.5-r5

RUN apk add --no-cache "supervisor=${SUPERVISOR_VERSION}" \
    && rm -f /etc/nginx/conf.d/default.conf

COPY --chown=nginx:nginx --from=frontend-builder /app/frontend/dist/ /usr/share/nginx/html/
COPY --chown=nginx:nginx --from=backend-builder /out/server /app/server
COPY --chown=nginx:nginx docker/nginx.conf.template /etc/nginx/nginx.conf.template
COPY --chown=nginx:nginx docker/supervisord.conf /etc/supervisord.conf
COPY --chown=nginx:nginx --chmod=0555 docker/entrypoint.sh /usr/local/bin/container-entrypoint

USER nginx

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/healthz" || exit 1

ENTRYPOINT ["/usr/local/bin/container-entrypoint"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
