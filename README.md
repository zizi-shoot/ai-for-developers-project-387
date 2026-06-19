### Hexlet tests and linter status:
[![Actions Status](https://github.com/zizi-shoot/ai-for-developers-project-387/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/zizi-shoot/ai-for-developers-project-387/actions)

### Project tests status:
[![Tests](https://github.com/zizi-shoot/ai-for-developers-project-387/actions/workflows/tests.yml/badge.svg)](https://github.com/zizi-shoot/ai-for-developers-project-387/actions/workflows/tests.yml)

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