import { useEffect, useRef } from 'react'
import { resolveImageSrcs } from '../lib/resolveImages'

interface Props {
  html: string
  baseDir: string
  onRendered?: (el: HTMLElement) => void
}

export default function MarkdownView({ html, baseDir, onRendered }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const onRenderedRef = useRef(onRendered)
  onRenderedRef.current = onRendered

  useEffect(() => {
    let cancelled = false
    const el = ref.current
    if (!el) return
    // html уже прошёл rehype-sanitize; DOMParser не исполняет скрипты
    const doc = new DOMParser().parseFromString(html, 'text/html')
    el.replaceChildren(...Array.from(doc.body.childNodes))
    resolveImageSrcs(el, baseDir, window.api.resolveImage).then(() => {
      if (!cancelled) onRenderedRef.current?.(el)
    })
    return () => {
      cancelled = true
    }
  }, [html, baseDir])

  return <div className="markdown-body" ref={ref} />
}
