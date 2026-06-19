# Calendar Booking API

Backend реализует контракт из корневого `main.tsp` и хранит данные в памяти процесса.

## Запуск

Требуется Go 1.22 или новее.

```bash
cd backend
go run ./cmd/server
```

По умолчанию API доступен по адресу `http://127.0.0.1:4010`. Настройки можно изменить переменными окружения:

- `HTTP_ADDR` — адрес HTTP-сервера;
- `CORS_ALLOWED_ORIGINS` — список разрешённых frontend origins через запятую.

Пример:

```bash
HTTP_ADDR=127.0.0.1:8080 CORS_ALLOWED_ORIGINS=http://localhost:5173 go run ./cmd/server
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
