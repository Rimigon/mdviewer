# Редактирование Markdown + современный тёмный UI — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить в mdviewer split-view редактирование Markdown (CodeMirror 6 + живое превью) с явным сохранением и переработать UI в современный тёмный стиль без эмодзи.

**Architecture:** Renderer (React) владеет текстом (`source`) и состоянием dirty; main-процесс получает IPC `fs:writeFile` и зеркалит dirty-флаг для защиты при закрытии окна. Режимы «Правка» (редактор + превью) и «Просмотр» (полный рендер + оглавление) переключаются в тулбаре. Дизайн — CSS-токены в `:root`/`[data-theme]`, тёмная тема по умолчанию, все иконки — inline SVG.

**Tech Stack:** Electron 43, React 19, CodeMirror 6 (`codemirror`, `@codemirror/lang-markdown`, `@codemirror/language`, `@codemirror/state`, `@codemirror/view`, `@codemirror/commands`, `@codemirror/search`, `@lezer/highlight`), TypeScript, vitest.

## Global Constraints

- Никаких эмодзи в UI: ни в разметке, ни в иконках, ни в текстах. Все иконки — inline SVG-компоненты из `icons.tsx`.
- Тёмная тема — по умолчанию; светлая остаётся переключаемой и запоминается (`localStorage`).
- Подписи UI — на русском (как в текущем приложении).
- Безопасность не трогаем: `contextIsolation: true`, `sandbox: true`, весь доступ к файлам — через IPC.
- `npm run test`, `npm run typecheck`, `npm run build` должны быть зелёными после каждого таска.
- Стиль кода — как в текущем файле: `src/renderer/**` использует 4 пробела, `src/main/**` — табы.
- `rehype-sanitize` не трогаем: превью всегда строится из отсанитизированного HTML.

---

### Task 1: IPC — сохранение файла, dirty-флаг, защита при закрытии

**Files:**

- Modify: `src/shared/types.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`

**Interfaces:**

- Consumes: существующие `FileContent`, `DirEntry`, `PathStat` из `src/shared/types.ts`.
- Produces:
  - `window.api.saveFile(path: string, content: string): Promise<{ ok: boolean }>`
  - `window.api.setDirty(dirty: boolean): void`
  - `window.api.confirmClose(): void`
  - `window.api.onSaveAction(cb: () => void): () => void` (событие `menu:save`)
  - `window.api.onSaveBeforeClose(cb: () => void): () => void` (событие `app:save-before-close`)
  - `onMenuAction` — расширенный union `"open-file" | "open-folder" | "save"`

- [ ] **Step 1: Добавить тип результата записи в `src/shared/types.ts`**

Добавить в конец файла:

```ts
export interface WriteResult {
  ok: boolean
}
```

- [ ] **Step 2: Добавить IPC-обработчики в `src/main/index.ts`**

В импорте из `node:fs/promises` добавить `writeFile`:

```ts
import { readFile, readdir, stat as fsStat, writeFile } from "node:fs/promises";
```

Внутри `registerIpc()` (после обработчика `fs:stat`) добавить:

```ts
 ipcMain.handle(
  "fs:writeFile",
  async (_e, p: string, content: string): Promise<WriteResult> => {
   await writeFile(p, content, "utf8");
   return { ok: true };
  },
 );

 ipcMain.on("app:set-dirty", (_e, dirty: boolean) => {
  isDirty = dirty;
 });

 ipcMain.on("app:confirm-close", () => {
  closeConfirmed = true;
  mainWindow?.close();
 });
```

Добавить в импорт типа: `import type { DirEntry, FileContent, PathStat, WriteResult } from "../shared/types";`

В верхнем уровне main-файла добавить переменные (рядом с `let mainWindow`):

```ts
let isDirty = false;
let closeConfirmed = false;
```

В `createWindow()`, после `mainWindow = win;`, добавить перехват закрытия:

```ts
 // Защита от потери несохранённых изменений
 win.on("close", (e) => {
  if (!isDirty || closeConfirmed) return;
  e.preventDefault();
  const choice = dialog.showMessageBoxSync(win, {
   type: "warning",
   buttons: ["Сохранить и закрыть", "Не сохранять", "Отмена"],
   defaultId: 0,
   cancelId: 2,
   message: "Несохранённые изменения",
   detail: "Файл был изменён. Сохранить изменения перед закрытием?",
  });
  if (choice === 0) {
   win.webContents.send("app:save-before-close");
  } else if (choice === 1) {
   isDirty = false;
   closeConfirmed = true;
   win.close();
  }
 });
```

В `buildRussianMenu()` в меню «Файл», после пункта «Открыть папку…» и разделителя, добавить пункт «Сохранить»:

```ts
    {
     label: "Сохранить",
     accelerator: "CmdOrCtrl+S",
     click: () => send("menu:save"),
    },
```

(между «Открыть папку…» и `{ type: "separator" }`, либо после separator — на выбор исполнителя, главное чтобы пункт был в подменю «Файл»).

- [ ] **Step 3: Добавить методы в `src/preload/index.ts`**

В объект `api` добавить:

```ts
 saveFile: (path: string, content: string): Promise<{ ok: boolean }> =>
  ipcRenderer.invoke("fs:writeFile", path, content),
 setDirty: (dirty: boolean): void => ipcRenderer.send("app:set-dirty", dirty),
 confirmClose: (): void => ipcRenderer.send("app:confirm-close"),
 onSaveAction: (cb: () => void): (() => void) => {
  const listener = (): void => cb();
  ipcRenderer.on("menu:save", listener);
  return () => ipcRenderer.removeListener("menu:save", listener);
 },
 onSaveBeforeClose: (cb: () => void): (() => void) => {
  const listener = (): void => cb();
  ipcRenderer.on("app:save-before-close", listener);
  return () => ipcRenderer.removeListener("app:save-before-close", listener);
 },
```

В `onMenuAction` расширить обработку каналов:

```ts
 onMenuAction: (
  cb: (action: "open-file" | "open-folder" | "save") => void,
 ): (() => void) => {
  const listener = (_e: Electron.IpcRendererEvent, channel: string): void => {
   if (channel === "menu:open-file") cb("open-file");
   else if (channel === "menu:open-folder") cb("open-folder");
   else if (channel === "menu:save") cb("save");
  };
  ipcRenderer.on("menu:open-file", listener);
  ipcRenderer.on("menu:open-folder", listener);
  ipcRenderer.on("menu:save", listener);
  return () => {
   ipcRenderer.removeListener("menu:open-file", listener);
   ipcRenderer.removeListener("menu:open-folder", listener);
   ipcRenderer.removeListener("menu:save", listener);
  };
 },
```

- [ ] **Step 4: Проверка типов и сборки**

Run: `npm run typecheck`
Expected: без ошибок.

Run: `npm run build`
Expected: успешная сборка (`out/main/index.js`, `out/preload/index.js`).

- [ ] **Step 5: Commit**

```bash
git add src/shared/types.ts src/main/index.ts src/preload/index.ts
git commit -m "feat: ipc for file save, dirty flag and close guard"
```

---

### Task 2: Дизайн-система — полный пересмотр `global.css`

**Files:**

- Modify: `src/renderer/src/styles/global.css` (полная замена)

**Interfaces:**

- Consumes: ничего (классы описаны ниже — их используют таски 4–8).
- Produces: CSS-токены `--color-*`, `--space-*`, `--radius-*`; классы `.toolbar`, `.icon-btn`, `.path`, `.path-dirty`, `.search`, `.tree`, `.tree-row`, `.tree-row.active`, `.tree-icon`, `.tree-chevron`, `.toc`, `.source-view`, `.status`, `.content`, `.content-inner.read`, `.split`, `.editor-pane`, `.preview-pane`, `.empty`.

- [ ] **Step 1: Заменить содержимое `src/renderer/src/styles/global.css` целиком**

Полный файл:

```css
:root {
 font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
 --font-mono: ui-monospace, "Cascadia Code", SFMono-Regular, Consolas, monospace;
 --radius-sm: 6px;
 --radius-md: 8px;
 --transition: 120ms ease;
}
* {
 box-sizing: border-box;
}
html[data-theme="dark"] {
 --bg: #16181d;
 --bg-panel: #1b1e24;
 --bg-hover: rgba(255, 255, 255, 0.06);
 --bg-active: rgba(255, 255, 255, 0.1);
 --border: #2a2f3a;
 --border-strong: #3a4150;
 --text: #e8eaed;
 --text-muted: #9aa4b2;
 --accent: #4c8bf5;
 --accent-hover: #6a9df7;
 --danger: #f47067;
 --shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
 color-scheme: dark;
}
html[data-theme="light"] {
 --bg: #ffffff;
 --bg-panel: #f6f8fa;
 --bg-hover: rgba(9, 30, 66, 0.06);
 --bg-active: rgba(9, 30, 66, 0.1);
 --border: #d0d7de;
 --border-strong: #afb8c1;
 --text: #1f2328;
 --text-muted: #57606a;
 --accent: #0969da;
 --accent-hover: #0a7be0;
 --danger: #cf222e;
 --shadow: 0 8px 24px rgba(31, 35, 40, 0.12);
 color-scheme: light;
}
body {
 margin: 0;
 background: var(--bg);
 color: var(--text);
}
.app {
 display: flex;
 flex-direction: column;
 height: 100vh;
}

/* ---- Тулбар ---- */
.toolbar {
 display: flex;
 align-items: center;
 gap: 4px;
 height: 44px;
 padding: 0 12px;
 border-bottom: 1px solid var(--border);
 background: var(--bg-panel);
 flex-shrink: 0;
}
.toolbar-divider {
 width: 1px;
 height: 20px;
 background: var(--border);
 margin: 0 6px;
}
.path {
 flex: 1;
 min-width: 0;
 display: flex;
 align-items: center;
 gap: 8px;
 overflow: hidden;
 white-space: nowrap;
 text-overflow: ellipsis;
 color: var(--text-muted);
 font-size: 12.5px;
 padding: 0 10px;
}
.path-dirty::before {
 content: "";
 width: 7px;
 height: 7px;
 border-radius: 50%;
 background: var(--accent);
 flex-shrink: 0;
}

/* ---- Кнопки ---- */
button {
 font: inherit;
 cursor: pointer;
}
.icon-btn {
 display: inline-flex;
 align-items: center;
 justify-content: center;
 width: 30px;
 height: 30px;
 padding: 0;
 border: none;
 border-radius: var(--radius-sm);
 background: transparent;
 color: var(--text-muted);
 transition: background var(--transition), color var(--transition);
}
.icon-btn:hover {
 background: var(--bg-hover);
 color: var(--text);
}
.icon-btn:active {
 background: var(--bg-active);
}
.icon-btn:disabled {
 opacity: 0.4;
 cursor: default;
}
.icon-btn:disabled:hover {
 background: transparent;
 color: var(--text-muted);
}
.icon-btn.active {
 color: var(--accent);
 background: var(--bg-active);
}
.icon-btn.active:hover {
 color: var(--accent);
}

/* ---- Поиск ---- */
.search {
 display: flex;
 align-items: center;
 gap: 6px;
 background: var(--bg);
 border: 1px solid var(--border);
 border-radius: var(--radius-sm);
 padding: 0 8px;
 height: 28px;
 width: 220px;
 transition: border-color var(--transition), box-shadow var(--transition);
}
.search:focus-within {
 border-color: var(--accent);
 box-shadow: 0 0 0 2px rgba(76, 139, 245, 0.25);
}
.search .search-icon {
 color: var(--text-muted);
 flex-shrink: 0;
 display: flex;
}
.search input {
 flex: 1;
 min-width: 0;
 border: none;
 outline: none;
 background: transparent;
 color: var(--text);
 font: inherit;
 font-size: 13px;
}
.search input::placeholder {
 color: var(--text-muted);
}
.search-count {
 font-size: 11px;
 color: var(--text-muted);
 flex-shrink: 0;
 font-variant-numeric: tabular-nums;
}

/* ---- Контент ---- */
.content {
 flex: 1;
 min-height: 0;
 display: flex;
}
.content-inner.read {
 flex: 1;
 min-width: 0;
 overflow: auto;
 padding: 24px;
 display: flex;
 gap: 24px;
 max-width: 1100px;
 width: 100%;
 margin: 0 auto;
}
.content-inner.read .markdown-body {
 flex: 1;
 min-width: 0;
}
.split {
 flex: 1;
 min-width: 0;
 display: flex;
 overflow: hidden;
}
.editor-pane {
 flex: 1 1 50%;
 min-width: 0;
 overflow: hidden;
 border-right: 1px solid var(--border);
 background: var(--bg-panel);
 display: flex;
}
.preview-pane {
 flex: 1 1 50%;
 min-width: 0;
 overflow: auto;
 padding: 24px;
}

/* ---- Редактор ---- */
.editor-pane .cm-editor {
 height: 100%;
 width: 100%;
 font-size: 13.5px;
}
.editor-pane .cm-scroller {
 font-family: var(--font-mono);
 line-height: 1.6;
}

/* ---- Пустое состояние ---- */
.empty {
 flex: 1;
 display: flex;
 flex-direction: column;
 align-items: center;
 justify-content: center;
 gap: 14px;
 color: var(--text-muted);
 text-align: center;
 padding: 24px;
}
.empty h2 {
 margin: 0;
 font-weight: 600;
 font-size: 17px;
 color: var(--text);
}
.empty p {
 margin: 0;
 font-size: 13px;
 max-width: 380px;
}
.empty .icon-btn {
 width: 36px;
 height: 36px;
}

/* ---- Дерево файлов ---- */
.tree {
 width: 240px;
 flex-shrink: 0;
 border-right: 1px solid var(--border);
 background: var(--bg-panel);
 overflow: auto;
 font-size: 13px;
}
.tree-root {
 padding: 10px 12px;
 font-weight: 600;
 color: var(--text);
 border-bottom: 1px solid var(--border);
 overflow: hidden;
 text-overflow: ellipsis;
 white-space: nowrap;
 position: sticky;
 top: 0;
 background: var(--bg-panel);
 z-index: 1;
}
.tree-row {
 padding: 4px 8px;
 cursor: pointer;
 white-space: nowrap;
 display: flex;
 gap: 6px;
 align-items: center;
 user-select: none;
 color: var(--text-muted);
 border-left: 2px solid transparent;
}
.tree-row:hover {
 background: var(--bg-hover);
 color: var(--text);
}
.tree-row.active {
 background: var(--bg-active);
 color: var(--text);
 border-left-color: var(--accent);
}
.tree-row.active .tree-name {
 color: var(--accent);
}
.tree-icon {
 flex-shrink: 0;
 display: flex;
 align-items: center;
 color: var(--text-muted);
}
.tree-row.active .tree-icon {
 color: var(--accent);
}
.tree-chevron {
 flex-shrink: 0;
 display: flex;
 align-items: center;
 color: var(--text-muted);
 transition: transform var(--transition);
 width: 14px;
 justify-content: center;
}
.tree-chevron.expanded {
 transform: rotate(90deg);
}
.tree-name {
 overflow: hidden;
 text-overflow: ellipsis;
}
.tree-loading {
 color: var(--text-muted);
 font-size: 11px;
}

/* ---- Оглавление ---- */
.toc {
 position: sticky;
 top: 0;
 align-self: flex-start;
 width: 220px;
 max-height: calc(100vh - 120px);
 overflow: auto;
 font-size: 13px;
 flex-shrink: 0;
}
.toc-title {
 font-weight: 600;
 margin-bottom: 6px;
 color: var(--text);
 font-size: 12px;
 text-transform: uppercase;
 letter-spacing: 0.05em;
}
.toc-link {
 display: block;
 color: var(--text-muted);
 text-decoration: none;
 padding: 3px 8px;
 border-radius: var(--radius-sm);
 overflow: hidden;
 text-overflow: ellipsis;
 white-space: nowrap;
}
.toc-link:hover {
 background: var(--bg-hover);
 color: var(--accent);
}
.toc-empty {
 color: var(--text-muted);
 font-size: 12px;
}

/* ---- Статус-бар ---- */
.status {
 height: 24px;
 display: flex;
 align-items: center;
 gap: 16px;
 padding: 0 12px;
 font-size: 11.5px;
 color: var(--text-muted);
 border-top: 1px solid var(--border);
 background: var(--bg-panel);
 flex-shrink: 0;
 font-variant-numeric: tabular-nums;
}
.status .status-path {
 flex: 1;
 overflow: hidden;
 text-overflow: ellipsis;
 white-space: nowrap;
}
.status .status-dirty {
 color: var(--accent);
}

/* ---- Ошибки mermaid ---- */
.mermaid-error {
 padding: 12px;
 border: 1px solid var(--danger);
 border-radius: var(--radius-md);
 color: var(--danger);
 background: var(--bg-hover);
 font-size: 13px;
}

/* ---- Подсветка поиска ---- */
.markdown-body mark {
 background: rgba(255, 213, 79, 0.4);
 color: inherit;
 padding: 0;
 border-radius: 2px;
}
html[data-theme="dark"] .markdown-body mark {
 background: rgba(255, 213, 79, 0.25);
}
```

- [ ] **Step 2: Проверка сборки**

Run: `npm run build`
Expected: успешная сборка.

Run: `npm run dev` (визуально: приложение открывается с тёмным фоном; кнопки тулбара пока «голые» — это нормально до Task 4).
Expected: окно открывается, рендер работает, тёмный фон.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/styles/global.css
git commit -m "style: design system with dark theme tokens and modern components"
```

---

### Task 3: Набор SVG-иконок

**Files:**

- Create: `src/renderer/src/components/icons.tsx`

**Interfaces:**

- Consumes: React.
- Produces: компоненты `OpenFileIcon`, `FolderIcon`, `SaveIcon`, `EditIcon`, `EyeIcon`, `ListIcon`, `SunIcon`, `MoonIcon`, `SearchIcon`, `ChevronIcon`, `FolderOpenIcon`, `FolderClosedIcon`, `FileIcon`. Все — `(props: { size?: number; className?: string }) => JSX.Element`, рисуют stroke-иконки текущим цветом (`currentColor`), размер по умолчанию 16.

- [ ] **Step 1: Создать `src/renderer/src/components/icons.tsx`**

```tsx
interface IconProps {
 size?: number;
 className?: string;
}

function svgProps(size: number, className?: string) {
 return {
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className,
  "aria-hidden": true,
 };
}

export function OpenFileIcon({ size = 16, className }: IconProps) {
 return (
  <svg {...svgProps(size, className)}>
   <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
   <polyline points="14 2 14 8 20 8" />
  </svg>
 );
}

export function FolderIcon({ size = 16, className }: IconProps) {
 return (
  <svg {...svgProps(size, className)}>
   <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
  </svg>
 );
}

export function SaveIcon({ size = 16, className }: IconProps) {
 return (
  <svg {...svgProps(size, className)}>
   <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
   <polyline points="17 21 17 13 7 13 7 21" />
   <polyline points="7 3 7 8 15 8" />
  </svg>
 );
}

export function EditIcon({ size = 16, className }: IconProps) {
 return (
  <svg {...svgProps(size, className)}>
   <path d="M12 20h9" />
   <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
 );
}

export function EyeIcon({ size = 16, className }: IconProps) {
 return (
  <svg {...svgProps(size, className)}>
   <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
   <circle cx="12" cy="12" r="3" />
  </svg>
 );
}

export function ListIcon({ size = 16, className }: IconProps) {
 return (
  <svg {...svgProps(size, className)}>
   <line x1="8" y1="6" x2="21" y2="6" />
   <line x1="8" y1="12" x2="21" y2="12" />
   <line x1="8" y1="18" x2="21" y2="18" />
   <line x1="3" y1="6" x2="3.01" y2="6" />
   <line x1="3" y1="12" x2="3.01" y2="12" />
   <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
 );
}

export function SunIcon({ size = 16, className }: IconProps) {
 return (
  <svg {...svgProps(size, className)}>
   <circle cx="12" cy="12" r="4" />
   <path d="M12 2v2" />
   <path d="M12 20v2" />
   <path d="m4.93 4.93 1.41 1.41" />
   <path d="m17.66 17.66 1.41 1.41" />
   <path d="M2 12h2" />
   <path d="M20 12h2" />
   <path d="m6.34 17.66-1.41 1.41" />
   <path d="m19.07 4.93-1.41 1.41" />
  </svg>
 );
}

export function MoonIcon({ size = 16, className }: IconProps) {
 return (
  <svg {...svgProps(size, className)}>
   <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
 );
}

export function SearchIcon({ size = 16, className }: IconProps) {
 return (
  <svg {...svgProps(size, className)}>
   <circle cx="11" cy="11" r="7" />
   <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
 );
}

export function ChevronIcon({ size = 14, className }: IconProps) {
 return (
  <svg {...svgProps(size, className)}>
   <polyline points="9 6 15 12 9 18" />
  </svg>
 );
}

export function FolderOpenIcon({ size = 16, className }: IconProps) {
 return (
  <svg {...svgProps(size, className)}>
   <path d="M6 14l1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
  </svg>
 );
}

export function FolderClosedIcon({ size = 16, className }: IconProps) {
 return (
  <svg {...svgProps(size, className)}>
   <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
   <path d="M2 7v13" />
  </svg>
 );
}

export function FileIcon({ size = 16, className }: IconProps) {
 return (
  <svg {...svgProps(size, className)}>
   <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
   <path d="M14 2v6h6" />
   <path d="M9 13h6" />
   <path d="M9 17h4" />
  </svg>
 );
}
```

- [ ] **Step 2: Проверка**

Run: `npm run typecheck`
Expected: без ошибок.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/icons.tsx
git commit -m "feat: svg icon set"
```

---

### Task 4: Дерево файлов — SVG-иконки и подсветка активного файла

**Files:**

- Modify: `src/renderer/src/components/FileTree.tsx` (полная замена)

**Interfaces:**

- Consumes: `DirEntry` из `@shared/types`; иконки из Task 3.
- Produces: пропсы `FileTree({ root, activePath, onOpenFile })`, где `activePath: string | null` — путь активного файла (для подсветки).

- [ ] **Step 1: Заменить содержимое `FileTree.tsx`**

```tsx
import { useState } from "react";
import type { DirEntry } from "@shared/types";
import {
 ChevronIcon,
 FileIcon,
 FolderClosedIcon,
 FolderOpenIcon,
} from "./icons";

interface Props {
 root: string;
 activePath: string | null;
 onOpenFile: (path: string) => void;
}

interface NodeState {
 entry: DirEntry;
 expanded: boolean;
 children: DirEntry[] | null;
 loading: boolean;
}

function TreeNode({
 node,
 depth,
 activePath,
 onOpenFile,
}: {
 node: NodeState;
 depth: number;
 activePath: string | null;
 onOpenFile: (path: string) => void;
}) {
 const [state, setState] = useState(node);

 async function toggle(): Promise<void> {
  if (!node.entry.isDir) {
   onOpenFile(node.entry.path);
   return;
  }
  if (state.children === null) {
   setState((s) => ({ ...s, loading: true }));
   try {
    const children = await window.api.readDir(node.entry.path);
    setState((s) => ({ ...s, children, loading: false, expanded: true }));
   } catch {
    setState((s) => ({ ...s, loading: false }));
   }
  } else {
   setState((s) => ({ ...s, expanded: !s.expanded }));
  }
 }

 const isMd = /\.(md|markdown|mdown|mkd)$/i.test(node.entry.name);
 const isActive = node.entry.path === activePath;

 return (
  <div>
   <div
    className={`tree-row${node.entry.isDir ? " dir" : ""}${isMd ? " md" : ""}${isActive ? " active" : ""}`}
    style={{ paddingLeft: `${8 + depth * 14}px` }}
    onClick={() => void toggle()}
    title={node.entry.path}
   >
    {node.entry.isDir && (
     <span
      className={`tree-chevron${state.expanded ? " expanded" : ""}`}
      style={{ visibility: state.expanded ? "visible" : "visible" }}
     >
      <ChevronIcon />
     </span>
    )}
    <span className="tree-icon">
     {node.entry.isDir ? (
      state.expanded ? (
       <FolderOpenIcon />
      ) : (
       <FolderClosedIcon />
      )
     ) : (
      <FileIcon />
     )}
    </span>
    <span className="tree-name">{node.entry.name}</span>
    {state.loading && <span className="tree-loading">…</span>}
   </div>
   {node.entry.isDir && state.expanded && state.children && (
    <div>
     {state.children.map((c) => (
      <TreeNode
       key={c.path}
       node={{
        entry: c,
        expanded: false,
        children: null,
        loading: false,
       }}
       depth={depth + 1}
       activePath={activePath}
       onOpenFile={onOpenFile}
      />
     ))}
    </div>
   )}
  </div>
 );
}

export default function FileTree({ root, activePath, onOpenFile }: Props) {
 const rootEntry: DirEntry = {
  name: root.split(/[\\/]/).pop() ?? root,
  path: root,
  isDir: true,
 };
 return (
  <aside className="tree">
   <div className="tree-root" title={root}>
    {rootEntry.name}
   </div>
   <TreeNode
    node={{
     entry: rootEntry,
     expanded: true,
     children: null,
     loading: false,
    }}
    depth={0}
    activePath={activePath}
    onOpenFile={onOpenFile}
   />
  </aside>
 );
}
```

Примечание: `style={{ visibility: ... }}` — константа, оставлена для ясности; можно убрать вовсе, если строка `<span className="tree-chevron">` без неё читается лучше — решает исполнитель (визуально шеврон у свёрнутых папок остаётся на месте, чтобы иконки были выровнены по колонкам).

- [ ] **Step 2: Проверка**

Run: `npm run typecheck`
Expected: ошибка типов нет (App ещё передаёт старое API — временно сломается; чинится в Task 7). Если typecheck падает из-за `App.tsx`, это ожидаемо — проверь, что ошибки только в `App.tsx`:

Run: `npx tsc --noEmit -p tsconfig.web.json 2>&1 | grep -v "App.tsx" | head`
Expected: без вывода (кроме App.tsx).

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/FileTree.tsx
git commit -m "feat: file tree svg icons and active file highlight"
```

---

### Task 5: SearchBar и TocSidebar под новую дизайн-систему

**Files:**

- Modify: `src/renderer/src/components/SearchBar.tsx` (полная замена)
- Modify: `src/renderer/src/components/TocSidebar.tsx` (полная замена)

**Interfaces:**

- Consumes: иконки из Task 3.
- Produces: `SearchBar({ query, onChange, count })` — без изменений сигнатуры; `TocSidebar({ entries, onNavigate })` — без изменений сигнатуры.

- [ ] **Step 1: Заменить `SearchBar.tsx`**

```tsx
import { SearchIcon } from "./icons";

interface Props {
 query: string;
 onChange: (q: string) => void;
 count: number;
}

export default function SearchBar({ query, onChange, count }: Props) {
 return (
  <div className="search">
   <span className="search-icon">
    <SearchIcon />
   </span>
   <input
    type="search"
    placeholder="Поиск…"
    value={query}
    onChange={(e) => onChange(e.target.value)}
    aria-label="Поиск по документу"
   />
   {query.trim() !== "" && (
    <span className="search-count">{count}</span>
   )}
  </div>
 );
}
```

- [ ] **Step 2: Заменить `TocSidebar.tsx`**

```tsx
import type { TocEntry } from "../lib/toc";

interface Props {
 entries: TocEntry[];
 onNavigate: (id: string) => void;
}

export default function TocSidebar({ entries, onNavigate }: Props) {
 if (entries.length === 0) {
  return (
   <aside className="toc">
    <span className="toc-empty">Нет заголовков</span>
   </aside>
  );
 }
 return (
  // pi-lens-ignore: no-nested-links
  <aside className="toc" role="navigation" aria-label="Оглавление">
   <div className="toc-title">Оглавление</div>
   {entries.map((e) => (
    <a
     key={e.id}
     href={`#${e.id}`}
     className="toc-link"
     style={{ paddingLeft: `${(e.level - 1) * 12}px` }}
     onClick={(ev) => {
      ev.preventDefault();
      onNavigate(e.id);
     }}
    >
     {e.text}
    </a>
   ))}
  </aside>
 );
}
```

- [ ] **Step 3: Проверка**

Run: `npm run build`
Expected: успешная сборка (App.tsx не зависит от изменённых сигнатур, поэтому тип-ошибок нет; сборка renderer пройдёт, но `tsc` может ругаться на App.tsx — см. ниже).

Run: `npm run typecheck`
Expected: ошибки (если есть) только в `App.tsx` — там `FileTree` вызывается со старыми пропсами; это чинится в Task 7.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/components/SearchBar.tsx src/renderer/src/components/TocSidebar.tsx
git commit -m "feat: search bar and toc under new design system"
```

---

### Task 6: CodeMirror-редактор `EditorPane` + темы

**Files:**

- Create: `src/renderer/src/lib/cmTheme.ts`
- Create: `src/renderer/src/components/EditorPane.tsx`
- Modify: `package.json` (зависимости)

**Interfaces:**

- Consumes: React; CodeMirror 6.
- Produces:
  - `EditorPane({ source, onChange, onCursor, onSave, dark })`:
    - `source: string` — внешний текст (для синхронизации при загрузке файла)
    - `onChange: (value: string) => void`
    - `onCursor: (pos: { line: number; col: number }) => void`
    - `onSave: () => void`
    - `dark: boolean`
  - `cmTheme.ts` экспортирует `darkEditorTheme`, `lightEditorTheme` (`EditorView.theme`) и `darkHighlightStyle`, `lightHighlightStyle` (`HighlightStyle`).

- [ ] **Step 1: Установить зависимости**

Run: `npm i codemirror @codemirror/lang-markdown @codemirror/language @codemirror/state @codemirror/view @codemirror/commands @codemirror/search @lezer/highlight`
Expected: пакеты установлены, `package.json` и `package-lock.json` обновлены.

- [ ] **Step 2: Создать `src/renderer/src/lib/cmTheme.ts`**

```ts
import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

export const darkEditorTheme = EditorView.theme({
 "&": {
  backgroundColor: "transparent",
  color: "#e8eaed",
  fontSize: "13.5px",
 },
 ".cm-content": {
  caretColor: "#4c8bf5",
  padding: "12px 0 12px 4px",
 },
 "&.cm-focused": { outline: "none" },
 ".cm-cursor": { borderLeftColor: "#4c8bf5" },
 "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
  { backgroundColor: "rgba(76, 139, 245, 0.3)" },
 ".cm-activeLine": { backgroundColor: "rgba(255, 255, 255, 0.04)" },
 ".cm-gutters": {
  backgroundColor: "transparent",
  color: "#5c6672",
  border: "none",
 },
 ".cm-activeLineGutter": { backgroundColor: "transparent", color: "#8b95a5" },
 ".cm-searchMatch": { backgroundColor: "rgba(255, 213, 79, 0.3)", outline: "none" },
 ".cm-searchMatch.cm-searchMatch-selected": {
  backgroundColor: "rgba(255, 213, 79, 0.5)",
 },
});

export const lightEditorTheme = EditorView.theme({
 "&": {
  backgroundColor: "transparent",
  color: "#1f2328",
  fontSize: "13.5px",
 },
 ".cm-content": {
  caretColor: "#0969da",
  padding: "12px 0 12px 4px",
 },
 "&.cm-focused": { outline: "none" },
 ".cm-cursor": { borderLeftColor: "#0969da" },
 "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
  { backgroundColor: "rgba(9, 105, 218, 0.2)" },
 ".cm-activeLine": { backgroundColor: "rgba(9, 30, 66, 0.04)" },
 ".cm-gutters": {
  backgroundColor: "transparent",
  color: "#8c959f",
  border: "none",
 },
 ".cm-activeLineGutter": { backgroundColor: "transparent", color: "#57606a" },
 ".cm-searchMatch": { backgroundColor: "rgba(255, 213, 79, 0.5)", outline: "none" },
});

export const darkHighlightStyle = HighlightStyle.define([
 { tag: t.heading, color: "#e8eaed", fontWeight: "bold" },
 { tag: t.heading1, fontSize: "1.35em" },
 { tag: t.heading2, fontSize: "1.22em" },
 { tag: t.heading3, fontSize: "1.1em" },
 { tag: t.strong, fontWeight: "bold" },
 { tag: t.emphasis, fontStyle: "italic" },
 { tag: t.strikethrough, textDecoration: "line-through", color: "#8b949e" },
 { tag: t.link, color: "#6a9df7", textDecoration: "underline" },
 { tag: t.url, color: "#8b949e", textDecoration: "underline" },
 { tag: t.monospace, fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace" },
 { tag: t.quote, color: "#8b949e", fontStyle: "italic" },
 { tag: t.contentSeparator, color: "#6a9df7" },
 { tag: t.list, color: "#8b949e" },
 { tag: t.invalid, color: "#f47067" },
]);

export const lightHighlightStyle = HighlightStyle.define([
 { tag: t.heading, color: "#1f2328", fontWeight: "bold" },
 { tag: t.heading1, fontSize: "1.35em" },
 { tag: t.heading2, fontSize: "1.22em" },
 { tag: t.heading3, fontSize: "1.1em" },
 { tag: t.strong, fontWeight: "bold" },
 { tag: t.emphasis, fontStyle: "italic" },
 { tag: t.strikethrough, textDecoration: "line-through", color: "#57606a" },
 { tag: t.link, color: "#0969da", textDecoration: "underline" },
 { tag: t.url, color: "#57606a", textDecoration: "underline" },
 { tag: t.monospace, fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace" },
 { tag: t.quote, color: "#57606a", fontStyle: "italic" },
 { tag: t.contentSeparator, color: "#0969da" },
 { tag: t.list, color: "#57606a" },
 { tag: t.invalid, color: "#cf222e" },
]);

export function editorThemeExtensions(dark: boolean) {
 return dark
  ? [darkEditorTheme, syntaxHighlighting(darkHighlightStyle)]
  : [lightEditorTheme, syntaxHighlighting(lightHighlightStyle)];
}
```

- [ ] **Step 3: Создать `src/renderer/src/components/EditorPane.tsx`**

```tsx
import { useEffect, useRef } from "react";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, highlightSpecialChars, drawSelection } from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, closeBrackets, closeBracketsKeymap, indentOnInput } from "@codemirror/language";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { editorThemeExtensions } from "../lib/cmTheme";

interface Props {
 source: string;
 onChange: (value: string) => void;
 onCursor: (pos: { line: number; col: number }) => void;
 onSave: () => void;
 dark: boolean;
}

export default function EditorPane({ source, onChange, onCursor, onSave, dark }: Props) {
 const containerRef = useRef<HTMLDivElement>(null);
 const viewRef = useRef<EditorView | null>(null);
 const onChangeRef = useRef(onChange);
 const onCursorRef = useRef(onCursor);
 const onSaveRef = useRef(onSave);
 onChangeRef.current = onChange;
 onCursorRef.current = onCursor;
 onSaveRef.current = onSave;

 // Создание редактора один раз
 useEffect(() => {
  const container = containerRef.current;
  if (!container) return;

  const themeCompartment = new Compartment();

  const state = EditorState.create({
   doc: source,
   extensions: [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    drawSelection(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    keymap.of([
     { key: "Mod-s", preventDefault: true, run: () => { onSaveRef.current(); return true; } },
     ...closeBracketsKeymap,
     ...defaultKeymap,
     ...searchKeymap,
     ...historyKeymap,
     indentWithTab,
    ]),
    markdown({ base: markdownLanguage }),
    themeCompartment.of(editorThemeExtensions(dark)),
    EditorView.updateListener.of((update) => {
     if (update.docChanged) {
      onChangeRef.current(update.state.doc.toString());
     }
     if (update.selectionSet || update.docChanged) {
      const head = update.state.selection.main.head;
      const line = update.state.doc.lineAt(head);
      onCursorRef.current({ line: line.number, col: head - line.from + 1 });
     }
    }),
   ],
  });

  const view = new EditorView({ state, parent: container });
  viewRef.current = view;
  onCursorRef.current({ line: 1, col: 1 });

  return () => {
   view.destroy();
   viewRef.current = null;
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 // Синхронизация внешнего текста (загрузка файла) — только если реально изменился
 useEffect(() => {
  const view = viewRef.current;
  if (!view) return;
  if (view.state.doc.toString() === source) return;
  view.dispatch({
   changes: { from: 0, to: view.state.doc.length, insert: source },
  });
 }, [source]);

 // Переключение темы
 useEffect(() => {
  const view = viewRef.current;
  if (!view) return;
  const effect = themeCompartmentRef.current?.reconfigure(editorThemeExtensions(dark));
  if (effect) view.dispatch({ effects: effect });
 }, [dark]);

 const themeCompartmentRef = useRef<Compartment | null>(null);

 return <div className="editor-pane" ref={containerRef} />;
}
```

Примечание для исполнителя: `themeCompartmentRef` объявлен после использования в эффектах — это корректно для React (useRef вызывается до рендера), но если линтер ругается на порядок объявления — перенеси объявление `themeCompartmentRef` выше эффектов. Логика: compartment создаётся в mount-эффекте, сохраняется в ref, затем `dark`-эффект через него делает `reconfigure`.

- [ ] **Step 4: Проверка**

Run: `npm run typecheck`
Expected: без ошибок (App.tsx не использует EditorPane — ещё; подключение в Task 7).

Run: `npm run build`
Expected: успешная сборка.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/renderer/src/lib/cmTheme.ts src/renderer/src/components/EditorPane.tsx
git commit -m "feat: codemirror editor pane with custom themes"
```

---

### Task 7: App — режимы, split-макет, dirty, сохранение, статус-бар

**Files:**

- Modify: `src/renderer/src/App.tsx` (полная замена)
- Delete: `src/renderer/src/components/SourceView.tsx`

**Interfaces:**

- Consumes: `EditorPane` (Task 6), `FileTree` (Task 4, пропсы `root/activePath/onOpenFile`), `SearchBar`, `TocSidebar`, иконки (Task 3), `window.api` (Task 1).
- Produces: рабочий экран приложения: режимы «Правка»/«Просмотр», сохранение, dirty-индикатор, статус-бар с позицией курсора, пустое состояние.

- [ ] **Step 1: Заменить `src/renderer/src/App.tsx`**

```tsx
import { useEffect, useRef, useState } from "react";
import { renderMarkdown } from "./lib/markdown";
import { applyTheme } from "./lib/theme";
import type { TocEntry } from "./lib/toc";
import MarkdownView from "./components/MarkdownView";
import TocSidebar from "./components/TocSidebar";
import FileTree from "./components/FileTree";
import SearchBar from "./components/SearchBar";
import EditorPane from "./components/EditorPane";
import {
 EditIcon,
 EyeIcon,
 FolderIcon,
 ListIcon,
 MoonIcon,
 OpenFileIcon,
 SaveIcon,
 SunIcon,
} from "./components/icons";

const PREVIEW_DEBOUNCE_MS = 300;

export default function App() {
 const [source, setSource] = useState("");
 const [savedSource, setSavedSource] = useState("");
 const [baseDir, setBaseDir] = useState("");
 const [filePath, setFilePath] = useState("");
 const [status, setStatus] = useState("");
 const [dark, setDark] = useState(
  () => localStorage.getItem("theme") === "dark",
 );
 const [renderedHtml, setRenderedHtml] = useState("");
 const [toc, setToc] = useState<TocEntry[]>([]);
 const [tocOpen, setTocOpen] = useState(true);
 const [root, setRoot] = useState<string | null>(null);
 const [query, setQuery] = useState("");
 const [searchCount, setSearchCount] = useState(0);
 const [mode, setMode] = useState<"edit" | "read">("read");
 const [cursor, setCursor] = useState<{ line: number; col: number } | null>(null);

 const dirty = filePath !== "" && source !== savedSource;
 const previewTimer = useRef<number | null>(null);

 // ---- Загрузка файла ----
 async function loadFile(path: string): Promise<void> {
  try {
   const { content, baseDir } = await window.api.readFile(path);
   setSource(content);
   setSavedSource(content);
   setBaseDir(baseDir);
   setFilePath(path);
   setCursor(null);
   setStatus(path);
  } catch (err) {
   setStatus(`Ошибка чтения: ${String(err)}`);
  }
 }

 async function handleOpenFile(): Promise<void> {
  const p = await window.api.openFile();
  if (p) await loadFile(p);
 }

 async function handleOpenFolder(): Promise<void> {
  const p = await window.api.openFolder();
  if (p) {
   setRoot(p);
   setStatus(p);
  }
 }

 async function handleDrop(e: React.DragEvent): Promise<void> {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (!file) return;
  const path = (file as File & { path?: string }).path;
  if (!path) return;
  const st = await window.api.stat(path);
  if (st.isDir) {
   setRoot(path);
   setStatus(path);
  } else if (st.isFile) {
   await loadFile(path);
  }
 }

 function scrollToId(id: string): void {
  document
   .getElementById(id)
   ?.scrollIntoView({ behavior: "smooth", block: "start" });
 }

 // ---- Сохранение ----
 async function save(): Promise<boolean> {
  if (!filePath) return true;
  if (source === savedSource) return true;
  try {
   await window.api.saveFile(filePath, source);
   setSavedSource(source);
   setStatus("Сохранено");
   return true;
  } catch (err) {
   setStatus(`Ошибка сохранения: ${String(err)}`);
   return false;
  }
 }

 // ---- Меню приложения ----
 useEffect(() => {
  return window.api.onMenuAction((action) => {
   if (action === "open-file") void handleOpenFile();
   else if (action === "open-folder") void handleOpenFolder();
   else if (action === "save") void save();
  });
 }, []);

 // ---- Закрытие с несохранёнными изменениями ----
 useEffect(() => {
  return window.api.onSaveBeforeClose(() => {
   void (async () => {
    const ok = await save();
    if (ok) window.api.confirmClose();
   })();
  });
 });

 // ---- Тема ----
 useEffect(() => {
  applyTheme(dark);
  localStorage.setItem("theme", dark ? "dark" : "light");
  document.documentElement.dataset.theme = dark ? "dark" : "light";
 }, [dark]);

 // ---- Превью с debounce ----
 useEffect(() => {
  if (previewTimer.current !== null) window.clearTimeout(previewTimer.current);
  previewTimer.current = window.setTimeout(() => {
   renderMarkdown(source).then(setRenderedHtml);
  }, PREVIEW_DEBOUNCE_MS);
  return () => {
   if (previewTimer.current !== null) {
    window.clearTimeout(previewTimer.current);
    previewTimer.current = null;
   }
  };
 }, [source]);

 // ---- Зеркало dirty-флага в main ----
 useEffect(() => {
  window.api.setDirty(dirty);
 }, [dirty]);

 // ---- Файл при старте / по second-instance ----
 useEffect(() => {
  return window.api.onOpenPath((p) => void loadFile(p));
 }, []);

 useEffect(() => {
  window.api.startFile().then((p) => {
   if (p) return loadFile(p);
  });
 }, []);

 return (
  <div
   className="app"
   onDragOver={(e) => e.preventDefault()}
   onDrop={(e) => void handleDrop(e)}
  >
   <header className="toolbar">
    <button
     className="icon-btn"
     title="Открыть файл (Ctrl+O)"
     onClick={() => void handleOpenFile()}
    >
     <OpenFileIcon />
    </button>
    <button
     className="icon-btn"
     title="Открыть папку (Ctrl+Shift+O)"
     onClick={() => void handleOpenFolder()}
    >
     <FolderIcon />
    </button>
    <button
     className="icon-btn"
     title="Сохранить (Ctrl+S)"
     disabled={!filePath || !dirty}
     onClick={() => void save()}
    >
     <SaveIcon />
    </button>
    <span className="toolbar-divider" />
    <button
     className={`icon-btn${mode === "edit" ? " active" : ""}`}
     title={mode === "edit" ? "Режим правки" : "Включить режим правки"}
     onClick={() => setMode((m) => (m === "edit" ? "read" : "edit"))}
    >
     {mode === "edit" ? <EditIcon /> : <EyeIcon />}
    </button>
    {mode === "read" && (
     <button
      className={`icon-btn${tocOpen ? " active" : ""}`}
      title="Оглавление"
      onClick={() => setTocOpen((v) => !v)}
     >
      <ListIcon />
     </button>
    )}
    <span className="toolbar-divider" />
    <SearchBar query={query} onChange={setQuery} count={searchCount} />
    <span className="toolbar-divider" />
    <button
     className="icon-btn"
     title={dark ? "Светлая тема" : "Тёмная тема"}
     onClick={() => setDark((d) => !d)}
    >
     {dark ? <SunIcon /> : <MoonIcon />}
    </button>
    <span
     className={`path${dirty ? " path-dirty" : ""}`}
     title={filePath || status}
    >
     {filePath || status || "MD Viewer"}
    </span>
   </header>
   <main className="content">
    {root && (
     <FileTree
      root={root}
      activePath={filePath || null}
      onOpenFile={loadFile}
     />
    )}
    {filePath ? (
     mode === "edit" ? (
      <div className="split">
       <EditorPane
        source={source}
        onChange={setSource}
        onCursor={setCursor}
        onSave={() => void save()}
        dark={dark}
       />
       <div className="preview-pane">
        <MarkdownView
         html={renderedHtml}
         baseDir={baseDir}
         dark={dark}
         query={query}
         onToc={setToc}
         onSearchCount={setSearchCount}
        />
       </div>
      </div>
     ) : (
      <div className="content-inner read">
       <MarkdownView
        html={renderedHtml}
        baseDir={baseDir}
        dark={dark}
        query={query}
        onToc={setToc}
        onSearchCount={setSearchCount}
       />
       {tocOpen && <TocSidebar entries={toc} onNavigate={scrollToId} />}
      </div>
     )
    ) : (
     <div className="empty">
      <h2>Откройте файл Markdown</h2>
      <p>Файл можно открыть кнопкой выше, перетащить в окно или выбрать папку для навигации по дереву.</p>
      <button
       className="icon-btn"
       title="Открыть файл"
       onClick={() => void handleOpenFile()}
      >
       <OpenFileIcon />
      </button>
     </div>
    )}
   </main>
   <footer className="status">
    <span className="status-path">{filePath || status}</span>
    {dirty && <span className="status-dirty">Несохранённые изменения</span>}
    {mode === "edit" && cursor && (
     <span>
      Строка {cursor.line}, колонка {cursor.col}
     </span>
    )}
   </footer>
  </div>
 );
}
```

- [ ] **Step 2: Удалить `SourceView.tsx`**

```bash
git rm src/renderer/src/components/SourceView.tsx
```

(`SourceView` больше нигде не импортируется — его полностью заменяет `EditorPane`.)

- [ ] **Step 3: Проверка**

Run: `npm run typecheck`
Expected: без ошибок.

Run: `npm test`
Expected: все существующие тесты зелёные.

Run: `npm run build`
Expected: успешная сборка.

- [ ] **Step 4: Ручная проверка в dev-режиме**

Run: `npm run dev`
Checklist:

1. Приложение открывается, загружается `demo.md`, тема тёмная по умолчанию.
2. Режим «Просмотр» — рендер как раньше, оглавление работает.
3. Переключение в «Правку»: слева редактор с номерами строк и подсветкой markdown, справа живое превью; правка текста обновляет превью с задержкой ~300 мс.
4. Появляется точка у имени файла и «Несохранённые изменения» в статус-баре; кнопка «Сохранить» активна.
5. Ctrl+S сохраняет файл на диск (проверить содержимое файла), индикатор гаснет.
6. Правка + закрытие окна → диалог «Сохранить и закрыть / Не сохранять / Отмена»: каждый вариант работает корректно (Сохранить → файл записан и окно закрыто; Не сохранять → изменения потеряны; Отмена → окно осталось).
7. Поиск работает в обоих режимах; переход по оглавлению — только в «Просмотре».
8. Переключение темы (иконка луна/солнце) — тёмная/светлая, запоминается.
9. В дереве папок активный файл подсвечен; иконки SVG, эмодзи нет нигде.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/App.tsx
git commit -m "feat: split editor with live preview, save and dirty state"
```

---

### Task 8: Финальная проверка и документация

**Files:**

- Modify: `README.md` (раздел «Возможности»)
- Modify: `AGENTS.md` (список зависимостей)

- [ ] **Step 1: Обновить README**

В `README.md` в раздел «Возможности» добавить строки (после «Рендер / Исходник — переключатель вида»):

```markdown
- **Редактирование** — split-view редактор (CodeMirror): исходник слева, живое превью справа
- **Сохранение** — Ctrl+S или кнопка, индикатор несохранённых изменений, защита при закрытии окна
- **Современный тёмный интерфейс** — тёмная тема по умолчанию, SVG-иконки
```

Строку «**Рендер / Исходник** — переключатель вида» заменить на «**Правка / Просмотр** — переключатель режима (split-редактор с живым превью / чистый рендер)».

- [ ] **Step 2: Обновить AGENTS.md**

В секции `tech-stack`, в списке «Основные зависимости», добавить: `codemirror`, `@codemirror/lang-markdown`, `@codemirror/language`, `@codemirror/state`, `@codemirror/view`, `@codemirror/commands`, `@codemirror/search`, `@lezer/highlight` (через запятую в существующем списке).

- [ ] **Step 3: Полный прогон проверок**

Run: `npm run typecheck`
Expected: без ошибок.

Run: `npm test`
Expected: все тесты зелёные.

Run: `npm run build`
Expected: успешная сборка.

Run: `npx vitest run --coverage 2>/dev/null || true` — не требуется; пропустить.

- [ ] **Step 4: Ручной смоук-тест**

Run: `npm run dev`
Checklist (краткий):

1. Открытие, редактирование, Ctrl+S, dirty-индикатор, диалог закрытия — всё работает (повтор пунктов 1–9 Task 7).
2. Открыть второй файл из дерева с несохранёнными изменениями в первом — переключение файла сбрасывает dirty корректно (savedSource переустанавливается в loadFile).
3. Светлая тема выглядит целостно (тулбар, дерево, редактор, превью).

- [ ] **Step 5: Commit**

```bash
git add README.md AGENTS.md
git commit -m "docs: update readme and agent summary for editing and new UI"
```

---

## Self-Review (проведено)

- **Покрытие спеки:** split-редактор → Task 6–7; явное сохранение + Ctrl+S → Task 1, 7; dirty-индикатор → Task 7 (CSS Task 2); защита закрытия → Task 1; тёмная тема по умолчанию → Task 2, 7 (`data-theme` + `localStorage`); без эмодзи → Task 3–5, 7; SVG-иконки → Task 3; статус-бар с курсором → Task 7; пустое состояние → Task 7; TOC только в «Просмотре» → Task 7; обновление README/AGENTS → Task 8.
- **Плейсхолдеры:** нет TBD/TODO; все шаги содержат код или точные команды.
- **Консистентность типов:** `EditorPane({ source, onChange, onCursor, onSave, dark })` совпадает в Task 6 и Task 7; `FileTree({ root, activePath, onOpenFile })` — Task 4 и 7; `onMenuAction("open-file"|"open-folder"|"save")` — Task 1 и 7; `saveFile/setDirty/confirmClose/onSaveAction/onSaveBeforeClose` — Task 1, 7, 8.
- **Известное отклонение от спеки:** вместо hash для dirty используется точное сравнение строк `source !== savedSource` (проще и эквивалентно для markdown-файлов).
