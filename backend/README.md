# Calendar Booking API

Backend реализует контракт из корневого `main.tsp` и хранит данные в памяти процесса.

Проверка готовности API доступна по `GET /healthz` и возвращает
`{"status":"ok"}`. При запуске всего приложения через Docker endpoint доступен
на общем порту без префикса `/api`.

## Запуск

Требуется Go 1.22 или новее. Перед запуском создайте корневой `.env` по образцу
`.env.sample` и задайте переменные окружения:

- `HTTP_ADDR` — адрес HTTP-сервера, например `127.0.0.1:4010`;
- `CORS_ALLOWED_ORIGINS` — список разрешённых frontend origins через запятую, например `http://localhost:5173`.

Без этих переменных backend завершится с ошибкой конфигурации.

Загрузите переменные из корневого `.env` в окружение текущего shell и запустите
сервер:

```bash
cd backend
set -a
source ../.env
set +a
go run ./cmd/server
```

Также переменные можно передать непосредственно при запуске:

```bash
HTTP_ADDR=127.0.0.1:4010 CORS_ALLOWED_ORIGINS=http://localhost:5173 go run ./cmd/server
```

## Проверки

```bash
go test ./...
go test -race ./...
```

TypeSpec проверяется из корня проекта:

```bash
pnpm spec:build
```
