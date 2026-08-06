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
