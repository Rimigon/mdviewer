import { useEffect, useRef } from 'react'
import { resolveImageSrcs } from '../lib/resolveImages'
import { renderMermaid } from '../lib/mermaid'
import { extractToc, type TocEntry } from '../lib/toc'

interface Props {
  html: string
  baseDir: string
  dark: boolean
  onRendered?: (el: HTMLElement) => void
  onToc?: (entries: TocEntry[]) => void
}

export default function MarkdownView({ html, baseDir, dark, onRendered, onToc }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const onRenderedRef = useRef(onRendered)
  const onTocRef = useRef(onToc)
  onRenderedRef.current = onRendered
  onTocRef.current = onToc

  useEffect(() => {
    let cancelled = false
    const el = ref.current
    if (!el) return
    // html уже прошёл rehype-sanitize; DOMParser не исполняет скрипты
    const doc = new DOMParser().parseFromString(html, 'text/html')
    el.replaceChildren(...Array.from(doc.body.childNodes))
    resolveImageSrcs(el, baseDir, window.api.resolveImage)
      .then(async () => {
        await renderMermaid(el, dark)
        if (!cancelled) {
          onRenderedRef.current?.(el)
          onTocRef.current?.(extractToc(el))
        }
      })
    return () => {
      cancelled = true
    }
  }, [html, baseDir, dark])

  return <div className="markdown-body" ref={ref} />
}
