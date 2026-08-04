function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function clearHighlights(container: HTMLElement): void {
	for (const mark of Array.from(container.querySelectorAll("mark"))) {
		const parent = mark.parentNode;
		if (!parent) continue;
		parent.replaceChild(document.createTextNode(mark.textContent ?? ""), mark);
		parent.normalize();
	}
}

export function highlightMatches(
	container: HTMLElement,
	query: string,
): number {
	clearHighlights(container);
	const q = query.trim();
	if (!q) return 0;

	const re = new RegExp(escapeRegExp(q), "gi");
	const textNodes: Text[] = [];
	const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
		acceptNode(node) {
			const p = (node as Text).parentElement;
			if (
				p &&
				(p.tagName === "SCRIPT" ||
					p.tagName === "STYLE" ||
					p.tagName === "MARK")
			) {
				return NodeFilter.FILTER_REJECT;
			}
			return NodeFilter.FILTER_ACCEPT;
		},
	});
	while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

	let count = 0;
	for (const node of textNodes) {
		const text = node.nodeValue ?? "";
		if (!re.test(text)) continue;
		re.lastIndex = 0;
		const frag = document.createDocumentFragment();
		let last = 0;
		let m: RegExpExecArray | null;
		while ((m = re.exec(text)) !== null) {
			if (m.index > last)
				frag.appendChild(document.createTextNode(text.slice(last, m.index)));
			const mark = document.createElement("mark");
			mark.textContent = m[0];
			frag.appendChild(mark);
			count++;
			last = m.index + m[0].length;
		}
		if (last < text.length)
			frag.appendChild(document.createTextNode(text.slice(last)));
		node.replaceWith(frag);
	}
	return count;
}
