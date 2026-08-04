// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { extractExternalHref } from "../src/renderer/src/lib/links";

function anchor(html: string): HTMLAnchorElement {
	const body = new DOMParser().parseFromString(html, "text/html").body;
	return body.querySelector("a") as HTMLAnchorElement;
}

describe("extractExternalHref", () => {
	it("возвращает http-ссылку", () => {
		expect(
			extractExternalHref(anchor('<a href="https://github.com">x</a>')),
		).toBe("https://github.com");
	});

	it("возвращает mailto-ссылку", () => {
		expect(extractExternalHref(anchor('<a href="mailto:a@b.c">x</a>'))).toBe(
			"mailto:a@b.c",
		);
	});

	it("возвращает относительную ссылку", () => {
		expect(extractExternalHref(anchor('<a href="README.md">x</a>'))).toBe(
			"README.md",
		);
	});

	it("пропускает якорные ссылки", () => {
		expect(extractExternalHref(anchor('<a href="#section">x</a>'))).toBeNull();
	});

	it("пропускает ссылки без href", () => {
		expect(extractExternalHref(anchor("<a>x</a>"))).toBeNull();
	});

	it("пропускает пустой href", () => {
		expect(extractExternalHref(anchor('<a href="">x</a>'))).toBeNull();
	});
});
