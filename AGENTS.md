# AGENTS.md

> Автоматически поддерживаемая сводка контекста для AI-агентов.
> Последнее обновление: 2026-08-06 13:14:54 UTC

## Project Overview

<!-- agents-md:auto:project-overview -->
**mdviewer** — Красивый просмотрщик Markdown в стиле GitHub

Версия: `0.1.0`
Основной фреймворк: `React`.
<!-- /agents-md:auto:project-overview -->

## Tech Stack

<!-- agents-md:auto:tech-stack -->
- Фреймворк/UI: React
- Пакетный менеджер: npm
- Основные зависимости: @codemirror/autocomplete, @codemirror/commands, @codemirror/lang-markdown, @codemirror/language, @codemirror/search, @codemirror/state, @codemirror/view, @lezer/highlight …
- Dev-зависимости: @types/jsdom, @types/node, @types/react, @types/react-dom, @vitejs/plugin-react, electron, electron-builder, electron-vite …
<!-- /agents-md:auto:tech-stack -->

## Setup Commands

<!-- agents-md:auto:setup-commands -->
- Установить зависимости: `npm install`
- Запустить dev-сервер: `npm run dev`
- Сборка: `npm run build`
- Тесты: `npm run test`
<!-- /agents-md:auto:setup-commands -->

## Development Workflow

<!-- agents-md:auto:development-workflow -->
- Запустить dev-режим: `npm run dev`
<!-- /agents-md:auto:development-workflow -->

## Testing Instructions

<!-- agents-md:auto:testing-instructions -->
- Все тесты: `npm run test`
- Доступны дополнительные скрипты тестирования в package.json.
- Перед коммитом убедитесь, что тесты проходят.
<!-- /agents-md:auto:testing-instructions -->

## Code Style

<!-- agents-md:auto:code-style -->
- Проект на TypeScript (tsconfig.json присутствует).
<!-- /agents-md:auto:code-style -->

## Build and Deployment

<!-- agents-md:auto:build-and-deployment -->
- Сборка: `npm run build`
- Директории сборки: `dist`, `build`, `out`
<!-- /agents-md:auto:build-and-deployment -->

## Project Structure

<!-- agents-md:auto:project-structure -->
- `build/`
- `dist/`
- `docs/`
- `out/`
- `scripts/`
- `src/`
- `tests/`
<!-- /agents-md:auto:project-structure -->

## Версионирование

- Имя установщика формируется из `version` в `package.json` (electron-builder), например `MD Viewer Setup 0.1.0.exe`.
- При выпуске новой версии **обязательно подними `version`** в `package.json` и `package-lock.json` (например, `0.1.0` → `0.2.0`) **до** сборки `npm run build:win`.
- Не собирай установщик с той же версией поверх уже установленной — лучше bump до следующей версии, чтобы не было конфликтов переустановки.
