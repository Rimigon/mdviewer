# MD Viewer

Красивый просмотрщик Markdown-файлов в стиле GitHub для Windows.

## Возможности

- **Рендер как на github.com** — оригинальные стили `github-markdown-css`, GFM-таблицы, task-листы, зачёркивание, автолинки
- **Подсветка кода** — highlight.js с темой GitHub
- **Математика** — LaTeX через KaTeX (`$...$`, `$$...$$`)
- **Диаграммы Mermaid** — блоки ` ```mermaid `
- **Оглавление** — по заголовкам H1–H4, плавный скролл
- **Поиск по документу** — подсветка совпадений и счётчик
- **Тёмная и светлая темы** — переключатель в панели (запоминается)
- **Рендер / Исходник** — переключатель вида
- **Дерево папок** — навигация по `.md`-файлам
- **Открытие файлов** — кнопки, drag&drop, двойной клик по `.md` в проводнике (после установки или `npm run register-assoc`)
- **Безопасно** — `contextIsolation` + `sandbox`, HTML проходит `rehype-sanitize`

## Запуск (разработка)

```bash
npm install
npm run dev
```

Автоматически откроется окно с `demo.md` — демонстрацией всех фич.

## Сборка установщика

```bash
npm run build:win
```

Установщик: `dist/MD Viewer Setup 0.1.0.exe` (NSIS). При установке регистрируется
ассоциация `.md` — двойной клик по файлу открывает его в MD Viewer.

### Dev-ассоциация .md (без установки)

```bash
npm run build        # собрать out/main
npm run register-assoc
```

Удалить: `npm run unregister-assoc`.

## Тесты

```bash
npm test
```

Юнит-тесты: конвейер рендеринга, TOC, поиск (vitest + jsdom).

## Структура

```text
src/
├─ main/        # Electron main-процесс (окна, IPC, файловая система)
├─ preload/     # contextBridge-мост
├─ shared/      # общие типы
└─ renderer/    # React-приложение
   ├─ components/  # Toolbar, FileTree, MarkdownView, TocSidebar, SearchBar, SourceView
   └─ lib/         # markdown-конвейер, mermaid, toc, search, темы
```
