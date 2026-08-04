export async function resolveImageSrcs(
  container: HTMLElement,
  baseDir: string,
  resolve: (baseDir: string, src: string) => Promise<string | null>
): Promise<void> {
  const imgs = Array.from(container.querySelectorAll<HTMLImageElement>('img'))
  for (const img of imgs) {
    const src = img.getAttribute('src')
    if (!src) continue
    if (/^(https?:|file:|data:)/.test(src) || src.startsWith('#')) continue
    const resolved = await resolve(baseDir, src)
    if (resolved) img.setAttribute('src', resolved)
  }
}
