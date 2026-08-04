import { useEffect, useRef } from "react";
import { resolveImageSrcs } from "../lib/resolveImages";
import { renderMermaid } from "../lib/mermaid";
import { extractToc, type TocEntry } from "../lib/toc";
import { highlightMatches } from "../lib/search";
import { extractExternalHref } from "../lib/links";

interface Props {
	html: string;
	baseDir: string;
	dark: boolean;
	query: string;
	onRendered?: (el: HTMLElement) => void;
	onToc?: (entries: TocEntry[]) => void;
	onSearchCount?: (n: number) => void;
}

export default function MarkdownView({
	html,
	baseDir,
	dark,
	query,
	onRendered,
	onToc,
	onSearchCount,
}: Props) {
	const ref = useRef<HTMLDivElement>(null);
	const onRenderedRef = useRef(onRendered);
	const onTocRef = useRef(onToc);
	const onSearchCountRef = useRef(onSearchCount);
	onRenderedRef.current = onRendered;
	onTocRef.current = onToc;
	onSearchCountRef.current = onSearchCount;

	function handleClick(e: React.MouseEvent<HTMLDivElement>): void {
		const target = e.target as HTMLElement;
		const anchor = target.closest("a");
		if (!anchor) return;
		const href = extractExternalHref(anchor);
		if (!href) return;
		// Внешние ссылки открываются вне приложения (браузер по умолчанию и т.п.)
		e.preventDefault();
		void window.api.openLink(href, baseDir);
	}

	useEffect(() => {
		let cancelled = false;
		const el = ref.current;
		if (!el) return;
		// html уже прошёл rehype-sanitize; DOMParser не исполняет скрипты
		const doc = new DOMParser().parseFromString(html, "text/html");
		el.replaceChildren(...Array.from(doc.body.childNodes));
		resolveImageSrcs(el, baseDir, window.api.resolveImage).then(async () => {
			await renderMermaid(el, dark);
			if (!cancelled) {
				onRenderedRef.current?.(el);
				onTocRef.current?.(extractToc(el));
				onSearchCountRef.current?.(highlightMatches(el, query));
			}
		});
		return () => {
			cancelled = true;
		};
	}, [html, baseDir, dark, query]);

	return (
		<div className="markdown-body" ref={ref} onClick={handleClick} />
	);
}
