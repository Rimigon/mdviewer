import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../src/renderer/src/lib/markdown";

describe("renderMarkdown", () => {
	it("рендерит GFM-таблицу", async () => {
		const html = await renderMarkdown("| a | b |\n|---|---|\n| 1 | 2 |");
		expect(html).toContain("<table");
		expect(html).toContain("<th>");
	});

	it("рендерит task-лист", async () => {
		const html = await renderMarkdown("- [x] done\n- [ ] todo");
		expect(html).toContain('type="checkbox"');
		expect(html).toContain("checked");
	});

	it("рендерит LaTeX через KaTeX", async () => {
		const html = await renderMarkdown("$x^2 + y^2 = z^2$");
		expect(html).toContain("katex");
	});

	it("подсвечивает код через highlight.js", async () => {
		const html = await renderMarkdown("```js\nconst a = 1\n```");
		expect(html).toContain('class="hljs');
		expect(html).toContain("language-js");
		expect(html).toContain("hljs-keyword");
	});

	it("добавляет якорь с классом anchor к заголовку", async () => {
		const html = await renderMarkdown("## Привет мир");
		expect(html).toContain('<a class="anchor"');
		expect(html).toContain('href="#');
	});

	it("добавляет id заголовкам (для якорей и TOC)", async () => {
		const html = await renderMarkdown("## Привет мир");
		expect(html).toMatch(/<h2 id="[^"]+"/);
	});

	it("вырезает скрипты и обработчики событий", async () => {
		const html = await renderMarkdown(
			'<script>alert(1)</script>\n<img src="x" onerror="alert(2)">',
		);
		expect(html).not.toContain("<script");
		expect(html).not.toContain("onerror");
	});

	it("сохраняет блок mermaid нетронутым", async () => {
		const html = await renderMarkdown("```mermaid\ngraph TD; A-->B;\n```");
		expect(html).toContain("language-mermaid");
		expect(html).toContain("graph TD");
	});

	it("рендерит инлайн-HTML (details/summary)", async () => {
		const html = await renderMarkdown(
			"<details><summary>спойлер</summary>текст</details>",
		);
		expect(html).toContain("<details");
	});
});
