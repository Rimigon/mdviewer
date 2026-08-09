import { describe, expect, it } from "vitest";
import { copyText, normalizeCodeText } from "../src/renderer/src/lib/copyCode";

describe("normalizeCodeText", () => {
	it("обрезает хвостовой перенос строки", () => {
		expect(normalizeCodeText("const a = 1;\n")).toBe("const a = 1;");
	});

	it("обрезает несколько хвостовых переносов и CRLF", () => {
		expect(normalizeCodeText("a\nb\r\n\r\n")).toBe("a\nb");
	});

	it("оставляет текст без переносов как есть", () => {
		expect(normalizeCodeText("const a = 1;")).toBe("const a = 1;");
	});

	it("сохраняет начальные пробелы и отступы", () => {
		expect(normalizeCodeText("  function() {\n    return 1;\n  }\n")).toBe(
			"  function() {\n    return 1;\n  }",
		);
	});

	it("не трогает внутренние пустые строки", () => {
		expect(normalizeCodeText("a\n\nb\n")).toBe("a\n\nb");
	});

	it("пустая строка остаётся пустой", () => {
		expect(normalizeCodeText("")).toBe("");
	});
});

describe("copyText", () => {
	it("в среде без navigator/document возвращает false", async () => {
		// vitest environment: 'node' — ни clipboard, ни DOM нет
		await expect(copyText("test")).resolves.toBe(false);
	});
});
