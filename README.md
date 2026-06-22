### Hexlet tests and linter status:
[![Actions Status](https://github.com/zizi-shoot/ai-for-developers-project-387/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/zizi-shoot/ai-for-developers-project-387/actions)

### Project tests status:
[![Tests](https://github.com/zizi-shoot/ai-for-developers-project-387/actions/workflows/tests.yml/badge.svg)](https://github.com/zizi-shoot/ai-for-developers-project-387/actions/workflows/tests.yml)

## Запуск в Docker

Production-образ содержит собранный Vue frontend, Go backend, nginx и Supervisor.
Приложение использует один обязательный порт из переменной `PORT`. Допустимы
непривилегированные порты от `1024` до `65535`.

Соберите образ и запустите контейнер:

```bash
docker build -t calendar-booking:local .
docker run --rm -e PORT=8080 -p 8080:8080 calendar-booking:local
```

После запуска frontend доступен по адресу `http://localhost:8080`, API — с
префиксом `/api`, а проверка готовности — по `GET /healthz`.

Для запуска через Docker Compose передайте `PORT` в окружении или добавьте его в
локальный `.env`:

```bash
PORT=8080 docker compose up --build
```

Внутренний порт можно опубликовать на другом порту хоста, например
`-p 80:8080` при `PORT=8080`. Backend хранит данные в памяти, поэтому при
перезапуске контейнера созданные типы событий и бронирования теряются.

Полная smoke-проверка образа требует запущенного Docker daemon:

```bash
PORT=18080 sh scripts/docker-smoke.sh
```

## Релизы

Релизы всего приложения автоматизированы с помощью Release Please. После
попадания изменений в `main` workflow создаёт или обновляет Release PR. Слияние
этого PR вручную публикует GitHub Release, создаёт тег `vX.Y.Z`, обновляет
корневой `package.json` и формирует `CHANGELOG.md`.

Версия определяется по сообщениям коммитов в формате Conventional Commits:

- `fix` повышает patch-версию;
- `feat` повышает minor-версию;
- `!` после типа или footer `BREAKING CHANGE` повышает major-версию;
- `docs`, `refactor`, `test`, `build`, `ci`, `chore`, `style` и `revert`
  попадают в следующий changelog, но сами по себе релиз не инициируют.
