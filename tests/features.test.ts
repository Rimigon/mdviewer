import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../src/renderer/src/lib/markdown";

describe("footnote and math pipeline", () => {
	it("сноска рендерится: ссылка раньше определения, секция с data-footnotes", async () => {
		const html = await renderMarkdown("Сноска тут[^1].\n\n[^1]: Текст сноски.");
		const refId = html.indexOf('id="user-content-fnref-1"');
		const defId = html.indexOf('id="user-content-fn-1"');
		expect(refId).toBeGreaterThanOrEqual(0);
		expect(defId).toBeGreaterThan(refId);
		expect(html).toContain("data-footnotes");
		expect(html).toMatch(/href="#user-content-fn-1"/);
	});

	it("KaTeX генерирует разметку для инлайн- и блочной формул", async () => {
		const html = await renderMarkdown("$E = mc^2$\n\n$$\n\\int_0^1 x^2 dx\n$$");
		expect(html).toContain("katex");
		expect(html.match(/class="katex"/g)?.length).toBeGreaterThanOrEqual(2);
	});
});
