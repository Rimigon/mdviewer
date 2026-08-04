export interface TocEntry {
  id: string
  text: string
  level: number
}

export function extractToc(container: HTMLElement, maxLevel = 4): TocEntry[] {
  const levels = Array.from({ length: maxLevel }, (_, i) => `h${i + 1}`).join(',')
  const heads = Array.from(container.querySelectorAll<HTMLElement>(levels))
  return heads
    .filter((h) => h.id)
    .map((h) => ({
      id: h.id,
      text: Array.from(h.childNodes)
        .filter((n) => !(n instanceof HTMLElement && n.classList.contains('anchor')))
        .map((n) => n.textContent ?? '')
        .join('')
        .trim(),
      level: Number(h.tagName[1])
    }))
}
