// Копирование кода из блока превью в буфер обмена.

// Обрезает хвостовые переносы (\n и \r\n): копируем ровно код,
// без пустой строки в конце. Начальные пробелы/переносы сохраняем как есть.
export function normalizeCodeText(text: string): string {
	return text.replace(/[\r\n]+$/, "");
}

// Копирование в буфер: navigator.clipboard, фолбэк на execCommand
// (нужен, если clipboard API недоступен). Возвращает успех операции.
export async function copyText(text: string): Promise<boolean> {
	try {
		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(text);
			return true;
		}
	} catch {
		// падаем в фолбэк ниже
	}
	try {
		if (typeof document === "undefined") return false;
		const ta = document.createElement("textarea");
		ta.value = text;
		ta.style.position = "fixed";
		ta.style.opacity = "0";
		document.body.append(ta);
		ta.select();
		const ok = document.execCommand("copy");
		ta.remove();
		return ok;
	} catch {
		return false;
	}
}

const SVG_NS = "http://www.w3.org/2000/svg";

// Иконка копирования в стиле остальных иконок приложения (inline SVG).
function copyIcon(): SVGSVGElement {
	const svg = document.createElementNS(SVG_NS, "svg");
	svg.setAttribute("width", "14");
	svg.setAttribute("height", "14");
	svg.setAttribute("viewBox", "0 0 24 24");
	svg.setAttribute("fill", "none");
	svg.setAttribute("stroke", "currentColor");
	svg.setAttribute("stroke-width", "2");
	svg.setAttribute("stroke-linecap", "round");
	svg.setAttribute("stroke-linejoin", "round");
	svg.setAttribute("aria-hidden", "true");
	const rect = document.createElementNS(SVG_NS, "rect");
	rect.setAttribute("width", "14");
	rect.setAttribute("height", "14");
	rect.setAttribute("x", "8");
	rect.setAttribute("y", "8");
	rect.setAttribute("rx", "2");
	rect.setAttribute("ry", "2");
	const path = document.createElementNS(SVG_NS, "path");
	path.setAttribute(
		"d",
		"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",
	);
	svg.append(rect, path);
	return svg;
}

// Вешает кнопку копирования на каждый <pre> внутри container.
// Mermaid-блоки к этому моменту уже заменены на SVG (renderMermaid),
// поэтому им кнопка не достаётся автоматически.
// Кнопка кладётся в обёртку рядом с pre, а не внутрь него: pre скроллится
// (overflow: auto), а кнопка должна оставаться в углу блока при любой прокрутке.
export function installCopyButtons(
	container: HTMLElement,
	onCopy: (text: string) => void,
): void {
	for (const pre of container.querySelectorAll("pre")) {
		if (pre.parentElement?.classList.contains("code-block-wrap")) continue;
		const code = pre.querySelector("code");
		if (!code) continue;
		const btn = document.createElement("button");
		btn.type = "button";
		btn.className = "code-copy-btn";
		btn.title = "Скопировать код";
		btn.setAttribute("aria-label", "Скопировать код");
		btn.append(copyIcon());
		btn.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			onCopy(normalizeCodeText(code.textContent ?? ""));
		});
		// data-src-line переносим на обёртку: синхронный скролл (collectBlocks)
		// читает srcLine у верхнеуровневых детей .markdown-body
		const wrapper = document.createElement("div");
		wrapper.className = "code-block-wrap";
		if (pre.dataset.srcLine) wrapper.dataset.srcLine = pre.dataset.srcLine;
		pre.replaceWith(wrapper);
		wrapper.append(pre, btn);
	}
}
