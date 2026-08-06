# Настройка размера текста (просмотр + редактор) — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить в тулбар mdviewer контроль размера текста: два слайдера («Просмотр» и «Редактор») в поповере за иконкой «Aa», с сохранением в localStorage.

**Architecture:** Масштабы (0.75–1.75) хранятся в localStorage и применяются как CSS-переменные `--font-scale-read` / `--font-scale-editor` на `document.documentElement`. База: у `.markdown-body` — 16px (github-markdown-css), у CodeMirror — 13.5px; обе формулы — `calc(база * var(--scale))`. Чистая логика — в `lib/fontSize.ts` (тестируется в node-окружении, как остальные lib-модули); UI — самодостаточный компонент `TextSizeControl`.

**Tech Stack:** React 19, TypeScript, CSS-переменные, vitest (node env).

## Global Constraints

- Код — TypeScript, стиль проекта: табы, двойные кавычки, точка с запятой, `export function`, компоненты — default export.
- Без новых зависимостей; слайдер — нативный `<input type="range">`.
- Тесты — в `tests/*.test.ts` (vitest, environment: node, без jsdom/DOM).
- Коммиты — conventional (feat:/docs:/style:).
- Версию в package.json не поднимать (установщик не собирается).

---

### Task 1: Чистая логика масштабов + юнит-тесты

**Files:**

- Create: `src/renderer/src/lib/fontSize.ts`
- Test: `tests/fontSize.test.ts`

**Interfaces:**

- Consumes: ничего (зависит только от стандартных глобальных объектов).
- Produces (используется Task 3):
  - `SCALE_MIN = 0.75`, `SCALE_MAX = 1.75`, `SCALE_STEP = 0.05`, `SCALE_DEFAULT = 1`
  - `STORAGE_KEY_READ = "fontScaleRead"`, `STORAGE_KEY_EDITOR = "fontScaleEditor"`
  - `clampScale(value: unknown): number` — число в [SCALE_MIN, SCALE_MAX], нечисловое → SCALE_DEFAULT
  - `roundScale(value: number): number` — округление до сотых
  - `readStoredScale(key: string, storage?: Pick<Storage, "getItem">): number`
  - `writeStoredScale(key: string, value: number, storage?: Pick<Storage, "setItem">): void`
  - `applyFontScale(readScale: number, editorScale: number): void`

- [ ] **Step 1: Написать падающий тест**

`tests/fontSize.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
 SCALE_DEFAULT,
 SCALE_MAX,
 SCALE_MIN,
 clampScale,
 readStoredScale,
 roundScale,
 writeStoredScale,
} from "../src/renderer/src/lib/fontSize";

function mockStorage(initial: Record<string, string> = {}) {
 const data = new Map(Object.entries(initial));
 return {
  getItem: (key: string) => data.get(key) ?? null,
  setItem: (key: string, value: string) => void data.set(key, value),
 };
}

describe("clampScale", () => {
 it("возвращает значение внутри диапазона без изменений", () => {
  expect(clampScale(1)).toBe(1);
  expect(clampScale(1.25)).toBe(1.25);
 });

 it("ограничивает значения снизу и сверху", () => {
  expect(clampScale(0.1)).toBe(SCALE_MIN);
  expect(clampScale(9)).toBe(SCALE_MAX);
 });

 it("возвращает дефолт для нечисловых значений", () => {
  expect(clampScale("1.2" as unknown as number)).toBe(SCALE_DEFAULT);
  expect(clampScale(NaN)).toBe(SCALE_DEFAULT);
  expect(clampScale(Infinity)).toBe(SCALE_DEFAULT);
  expect(clampScale(undefined as unknown as number)).toBe(SCALE_DEFAULT);
  expect(clampScale(null as unknown as number)).toBe(SCALE_DEFAULT);
 });
});

describe("roundScale", () => {
 it("округляет до сотых", () => {
  expect(roundScale(1.1500000000000001)).toBe(1.15);
  expect(roundScale(0.7500000000000001)).toBe(0.75);
  expect(roundScale(1)).toBe(1);
 });
});

describe("readStoredScale", () => {
 it("читает сохранённое значение", () => {
  expect(readStoredScale("read", mockStorage({ read: "1.25" }))).toBe(1.25);
 });

 it("возвращает дефолт при отсутствии значения", () => {
  expect(readStoredScale("read", mockStorage({}))).toBe(SCALE_DEFAULT);
 });

 it("clamp-ит битые и выходящие за диапазон значения", () => {
  expect(readStoredScale("read", mockStorage({ read: "abc" }))).toBe(
   SCALE_DEFAULT,
  );
  expect(readStoredScale("read", mockStorage({ read: "0.1" }))).toBe(
   SCALE_MIN,
  );
  expect(readStoredScale("read", mockStorage({ read: "3" }))).toBe(SCALE_MAX);
 });

 it("не падает при ошибке хранилища", () => {
  const throwing = {
   getItem: () => {
    throw new Error("boom");
   },
  };
  expect(readStoredScale("read", throwing)).toBe(SCALE_DEFAULT);
 });
});

describe("writeStoredScale", () => {
 it("сохраняет значение", () => {
  const store = mockStorage();
  writeStoredScale("read", 1.3, store);
  expect(store.getItem("read")).toBe("1.3");
 });

 it("не падает при ошибке хранилища", () => {
  const throwing = {
   setItem: () => {
    throw new Error("boom");
   },
  };
  expect(() => writeStoredScale("read", 1.3, throwing)).not.toThrow();
 });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `npx vitest run tests/fontSize.test.ts`
Expected: FAIL — `Cannot find module '../src/renderer/src/lib/fontSize'`

- [ ] **Step 3: Реализовать `src/renderer/src/lib/fontSize.ts`**

```ts
// Масштабы размера текста: просмотр (markdown-body) и редактор (CodeMirror).
// Значения хранятся в localStorage и применяются как CSS-переменные
// --font-scale-read / --font-scale-editor на document.documentElement.

export const SCALE_MIN = 0.75;
export const SCALE_MAX = 1.75;
export const SCALE_STEP = 0.05;
export const SCALE_DEFAULT = 1;
export const STORAGE_KEY_READ = "fontScaleRead";
export const STORAGE_KEY_EDITOR = "fontScaleEditor";

/** Приводит произвольное значение к масштабу в [SCALE_MIN, SCALE_MAX]. */
export function clampScale(value: unknown): number {
 if (typeof value !== "number" || !Number.isFinite(value)) {
  return SCALE_DEFAULT;
 }
 return Math.min(SCALE_MAX, Math.max(SCALE_MIN, value));
}

/** Округление до сотых — защита от float-артефактов шага 0.05. */
export function roundScale(value: number): number {
 return Math.round(value * 100) / 100;
}

/** Читает сохранённый масштаб; отсутствующее/битое значение → SCALE_DEFAULT. */
export function readStoredScale(
 key: string,
 storage?: Pick<Storage, "getItem">,
): number {
 const store =
  storage ?? (typeof localStorage !== "undefined" ? localStorage : null);
 try {
  const raw = store?.getItem(key) ?? null;
  if (raw == null) return SCALE_DEFAULT;
  return clampScale(Number(raw));
 } catch {
  return SCALE_DEFAULT;
 }
}

/** Пишет масштаб в хранилище; ошибки (quota/security) молча игнорируются. */
export function writeStoredScale(
 key: string,
 value: number,
 storage?: Pick<Storage, "setItem">,
): void {
 const store =
  storage ?? (typeof localStorage !== "undefined" ? localStorage : null);
 try {
  store?.setItem(key, String(value));
 } catch {
  // ignore
 }
}

/** Применяет масштабы к CSS-переменным на корне документа. */
export function applyFontScale(readScale: number, editorScale: number): void {
 const root = document.documentElement;
 root.style.setProperty("--font-scale-read", String(readScale));
 root.style.setProperty("--font-scale-editor", String(editorScale));
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `npx vitest run tests/fontSize.test.ts`
Expected: PASS (4 describe, 11 тестов)

- [ ] **Step 5: Прогнать весь набор**

Run: `npm run test`
Expected: все тесты зелёные (старые + новые)

- [ ] **Step 6: Коммит**

```bash
git add tests/fontSize.test.ts src/renderer/src/lib/fontSize.ts
git commit -m "feat: font size scale helpers with storage"
```

---

### Task 2: Иконка «Aa»

**Files:**

- Modify: `src/renderer/src/components/icons.tsx` (добавить `TextSizeIcon` в конец файла)

**Interfaces:**

- Consumes: существующие `IconProps`, `svgProps` из того же файла.
- Produces: `export function TextSizeIcon({ size = 16, className }: IconProps)` — используется в Task 3.

- [ ] **Step 1: Добавить иконку в конец `icons.tsx`**

```tsx
export function TextSizeIcon({ size = 16, className }: IconProps) {
 return (
  <svg {...svgProps(size, className)}>
   <path d="M5 20 9.5 6 14 20" />
   <path d="M6.9 14.8h5.2" />
   <path d="M19 15.4a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 1 0 0-4.6Z" />
   <path d="M19 20v-6.5" />
  </svg>
 );
}
```

Большая «A» слева (грани 5,20→9.5,6→14,20 + перекладина), маленькая «a» справа (круг + стебель). Стиль — как у остальных: stroke-based, 24×24.

- [ ] **Step 2: Проверить типы**

Run: `npx tsc --noEmit -p tsconfig.web.json`
Expected: без ошибок

- [ ] **Step 3: Коммит**

```bash
git add src/renderer/src/components/icons.tsx
git commit -m "feat: text size icon"
```

---

### Task 3: Компонент TextSizeControl + CSS + подключение в App

**Files:**

- Create: `src/renderer/src/components/TextSizeControl.tsx`
- Modify: `src/renderer/src/styles/global.css`
  - `:root` (строки 1–6): добавить `--font-scale-read: 1; --font-scale-editor: 1;`
  - `.editor-pane .cm-editor` (строки ~158–161): заменить `font-size: 13.5px;` на `font-size: calc(13.5px * var(--font-scale-editor));`
  - конец файла: стили поповера/слайдера и перекрытие font-size markdown-body
- Modify: `src/renderer/src/App.tsx` — импорт + рендер компонента рядом с кнопкой темы

**Interfaces:**

- Consumes: из Task 1 — `SCALE_MIN`, `SCALE_MAX`, `SCALE_STEP`, `STORAGE_KEY_READ`, `STORAGE_KEY_EDITOR`, `readStoredScale`, `writeStoredScale`, `roundScale`, `applyFontScale`; из Task 2 — `TextSizeIcon`.
- Produces: `TextSizeControl` (default export, props нет) — рендерится в тулбаре App.

- [ ] **Step 1: Создать `TextSizeControl.tsx`**

```tsx
import { useEffect, useState } from "react";
import {
 SCALE_MAX,
 SCALE_MIN,
 SCALE_STEP,
 STORAGE_KEY_EDITOR,
 STORAGE_KEY_READ,
 applyFontScale,
 readStoredScale,
 roundScale,
 writeStoredScale,
} from "../lib/fontSize";
import { TextSizeIcon } from "./icons";

interface ScaleRowProps {
 label: string;
 value: number;
 onChange: (next: number) => void;
}

function ScaleRow({ label, value, onChange }: ScaleRowProps) {
 return (
  <label className="text-size-row">
   <span className="text-size-row-head">
    <span className="text-size-label">{label}</span>
    <span className="text-size-value">{Math.round(value * 100)}%</span>
   </span>
   <input
    className="text-size-range"
    type="range"
    min={SCALE_MIN}
    max={SCALE_MAX}
    step={SCALE_STEP}
    value={value}
    onChange={(e) => onChange(roundScale(Number(e.target.value)))}
   />
  </label>
 );
}

export default function TextSizeControl() {
 const [open, setOpen] = useState(false);
 const [readScale, setReadScale] = useState(() =>
  readStoredScale(STORAGE_KEY_READ),
 );
 const [editorScale, setEditorScale] = useState(() =>
  readStoredScale(STORAGE_KEY_EDITOR),
 );

 useEffect(() => {
  applyFontScale(readScale, editorScale);
 }, [readScale, editorScale]);

 useEffect(() => {
  if (!open) return;
  const onKeyDown = (e: KeyboardEvent) => {
   if (e.key === "Escape") setOpen(false);
  };
  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
 }, [open]);

 function handleReadChange(next: number): void {
  setReadScale(next);
  writeStoredScale(STORAGE_KEY_READ, next);
 }

 function handleEditorChange(next: number): void {
  setEditorScale(next);
  writeStoredScale(STORAGE_KEY_EDITOR, next);
 }

 return (
  <div className="text-size">
   <button
    className={`icon-btn${open ? " active" : ""}`}
    title="Размер текста"
    aria-label="Размер текста"
    aria-expanded={open}
    aria-controls="text-size-popover"
    onClick={() => setOpen((v) => !v)}
   >
    <TextSizeIcon />
   </button>
   {open && (
    <>
     <div
      className="text-size-backdrop"
      onClick={() => setOpen(false)}
      aria-hidden
     />
     <div
      id="text-size-popover"
      className="text-size-popover"
      role="dialog"
      aria-label="Размер текста"
     >
      <ScaleRow
       label="Просмотр"
       value={readScale}
       onChange={handleReadChange}
      />
      <ScaleRow
       label="Редактор"
       value={editorScale}
       onChange={handleEditorChange}
      />
     </div>
    </>
   )}
  </div>
 );
}
```

- [ ] **Step 2: CSS — переменные в `:root`**

В `:root` (верх `global.css`) добавить после `--transition`:

```css
 --font-scale-read: 1;
 --font-scale-editor: 1;
```

- [ ] **Step 3: CSS — масштаб редактора**

Заменить в `.editor-pane .cm-editor`:

```css
.editor-pane .cm-editor {
 height: 100%;
 width: 100%;
 font-size: calc(13.5px * var(--font-scale-editor));
}
```

- [ ] **Step 4: CSS — масштаб просмотра и стили поповера**

Добавить в конец `global.css`:

```css
/* ---- Масштаб текста ---- */
/* `body` поднимает специфичность выше инжектируемого темой github-markdown-css */
body .markdown-body {
 font-size: calc(16px * var(--font-scale-read));
}
.text-size {
 position: relative;
 display: inline-flex;
}
.text-size-backdrop {
 position: fixed;
 inset: 0;
 z-index: 40;
}
.text-size-popover {
 position: absolute;
 top: calc(100% + 8px);
 right: 0;
 z-index: 50;
 width: 220px;
 padding: 12px;
 display: flex;
 flex-direction: column;
 gap: 14px;
 background: var(--bg-panel);
 border: 1px solid var(--border);
 border-radius: var(--radius-md);
 box-shadow: var(--shadow);
}
.text-size-row {
 display: flex;
 flex-direction: column;
 gap: 6px;
 cursor: default;
}
.text-size-row-head {
 display: flex;
 justify-content: space-between;
 align-items: baseline;
}
.text-size-label {
 font-size: 12.5px;
 color: var(--text);
}
.text-size-value {
 font-size: 12px;
 color: var(--text-muted);
 font-variant-numeric: tabular-nums;
}
.text-size-range {
 width: 100%;
 accent-color: var(--accent);
 cursor: pointer;
}
```

- [ ] **Step 5: Подключить в `App.tsx`**

Импорт (после `import EditorPane...`):

```tsx
import TextSizeControl from "./components/TextSizeControl";
```

Рендер — между разделителем и кнопкой темы (сейчас там:

```tsx
    <span className="toolbar-divider" />
    <button
     className="icon-btn"
     title={dark ? "Светлая тема" : "Тёмная тема"}
```

):

```tsx
    <span className="toolbar-divider" />
    <TextSizeControl />
    <button
     className="icon-btn"
     title={dark ? "Светлая тема" : "Тёмная тема"}
```

- [ ] **Step 6: Проверить типы**

Run: `npm run typecheck`
Expected: без ошибок (node + web)

- [ ] **Step 7: Собрать**

Run: `npm run build`
Expected: сборка успешна (out/main, out/preload, out/renderer)

- [ ] **Step 8: Ручной smoke-тест**

Run: `npm run dev`
Проверить:

1. Открыть файл Markdown → в тулбаре появилась иконка «Aa» рядом с темой.
2. Клик по «Aa» → поповер с двумя слайдерами («Просмотр», «Редактор») и процентами.
3. Сдвиг «Просмотр» → меняется размер текста в режиме чтения И в превью режима правки; заголовки масштабируются пропорционально.
4. В режиме правки: сдвинуть «Просмотр» и поскроллить редактор — синхронный скролл превью продолжает работать (позиции не прыгают).
5. Сдвиг «Редактор» → меняется шрифт CodeMirror.
6. Проценты рядом со слайдерами обновляются.
7. Клик мимо и Esc закрывают поповер.
8. Перезапуск приложения → размеры сохранены.
9. В DevTools переключить тему туда-обратно — размеры не сбрасываются.

- [ ] **Step 9: Коммит**

```bash
git add src/renderer/src/components/TextSizeControl.tsx src/renderer/src/styles/global.css src/renderer/src/App.tsx
git commit -m "feat: font size control for preview and editor"
```
