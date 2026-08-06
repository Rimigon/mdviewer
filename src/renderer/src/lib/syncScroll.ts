// Синхронный скролл редактор-превью.
// Каждый верхнеуровневый блок превью несёт data-src-line — номер строки
// исходника, с которой он начинается (см. rehypeSourceLines в markdown.ts).

export interface SyncBlock {
	el: HTMLElement;
	line: number;
}

/** Собирает блоки превью с их строками исходника (в DOM-порядке). */
export function collectBlocks(root: HTMLElement): SyncBlock[] {
	const blocks: SyncBlock[] = [];
	for (const el of Array.from(root.children)) {
		if (!(el instanceof HTMLElement)) continue;
		const line = Number(el.dataset.srcLine);
		if (Number.isFinite(line)) blocks.push({ el, line });
	}
	return blocks;
}

/**
 * Бинарный поиск: последний блок с line <= target.
 * Возвращает null, если все блоки начинаются позже target.
 */
export function findBlockAtLine(blocks: SyncBlock[], target: number): SyncBlock | null {
	let lo = 0;
	let hi = blocks.length - 1;
	let answer: SyncBlock | null = null;
	while (lo <= hi) {
		const mid = (lo + hi) >> 1;
		if (blocks[mid].line <= target) {
			answer = blocks[mid];
			lo = mid + 1;
		} else {
			hi = mid - 1;
		}
	}
	return answer;
}

/**
 * Блок, пересекающий верхний край контейнера: последний блок, чей верх
 * выше/на уровне верхнего края контейнера (или первый блок, если все ниже).
 */
export function findBlockNearTop(blocks: SyncBlock[], container: HTMLElement): SyncBlock | null {
	if (blocks.length === 0) return null;
	const top = container.getBoundingClientRect().top + 1;
	let answer: SyncBlock | null = null;
	for (const block of blocks) {
		const rect = block.el.getBoundingClientRect();
		if (rect.top <= top) {
			answer = block;
		} else {
			break; // блоки идут в DOM-порядке, rect.top монотонны
		}
	}
	return answer ?? blocks[0];
}

/** Позиция прокрутки контейнера, при которой блок встанет у верхнего края. */
export function scrollOffsetForBlock(container: HTMLElement, block: SyncBlock, margin = 16): number {
	const paneRect = container.getBoundingClientRect();
	const blockRect = block.el.getBoundingClientRect();
	return container.scrollTop + (blockRect.top - paneRect.top) - margin;
}
