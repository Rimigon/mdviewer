export async function renderMermaid(container: HTMLElement, dark: boolean): Promise<void> {
  const blocks = Array.from(container.querySelectorAll<HTMLElement>('pre > code.language-mermaid'))
  if (blocks.length === 0) return

  const mermaid = (await import('mermaid')).default
  mermaid.initialize({
    startOnLoad: false,
    theme: dark ? 'dark' : 'default',
    securityLevel: 'strict',
    fontFamily: 'system-ui, sans-serif'
  })

  let i = 0
  for (const code of blocks) {
    const pre = code.parentElement
    if (!pre) continue
    const raw = code.textContent ?? ''
    const id = `mmd-${++i}-${Date.now()}`
    try {
      const { svg } = await mermaid.render(id, raw)
      // svg от mermaid может содержать пользовательский текст из лейблов —
      // вставляем через DOMParser (скрипты инертны), а не через innerHTML
      const holder = document.createElement('div')
      holder.className = 'mermaid'
      const svgDoc = new DOMParser().parseFromString(svg, 'image/svg+xml')
      const svgEl = svgDoc.documentElement
      if (!svgEl || svgEl.nodeName !== 'svg') throw new Error('mermaid вернул некорректный SVG')
      holder.append(svgEl)
      pre.replaceWith(holder)
    } catch (err) {
      const errEl = document.createElement('div')
      errEl.className = 'mermaid-error'
      errEl.textContent = `Ошибка Mermaid: ${err instanceof Error ? err.message : String(err)}`
      pre.replaceWith(errEl)
    }
  }
}
