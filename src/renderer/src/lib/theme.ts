import markdownLight from "github-markdown-css/github-markdown-light.css?inline";
import markdownDark from "github-markdown-css/github-markdown-dark.css?inline";
import hljsLight from "highlight.js/styles/github.css?inline";
import hljsDark from "highlight.js/styles/github-dark.css?inline";

let styleEl: HTMLStyleElement | null = null;

// Убираем собственный фон .markdown-body (github-markdown-css ставит #0d1117),
// чтобы контент лежал на едином фоне приложения без более тёмной плашки.
const bodyOverride = "\n.markdown-body{background-color:transparent}";

export function applyTheme(dark: boolean): void {
	if (!styleEl) {
		styleEl = document.createElement("style");
		styleEl.id = "theme-css";
		document.head.appendChild(styleEl);
	}
	styleEl.textContent = dark
		? `${markdownDark}\n${hljsDark}${bodyOverride}`
		: `${markdownLight}\n${hljsLight}${bodyOverride}`;
	document.documentElement.classList.toggle("dark", dark);
}
