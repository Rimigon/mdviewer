/**
 * Возвращает href ссылки, которую надо открыть вне приложения,
 * или null, если ссылка должна обрабатываться внутри (якорь и т.п.).
 */
export function extractExternalHref(anchor: HTMLAnchorElement): string | null {
	const href = anchor.getAttribute("href");
	if (!href) return null;
	// Якорные ссылки (TOC, заголовки) — внутристраничный переход
	if (href.startsWith("#")) return null;
	return href;
}
