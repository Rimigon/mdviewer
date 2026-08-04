import { useEffect, useState } from 'react'
import { renderMarkdown } from './lib/markdown'
import { applyTheme } from './lib/theme'
import type { TocEntry } from './lib/toc'
import MarkdownView from './components/MarkdownView'
import TocSidebar from './components/TocSidebar'

export default function App() {
  const [source, setSource] = useState('')
  const [baseDir, setBaseDir] = useState('')
  const [filePath, setFilePath] = useState('')
  const [status, setStatus] = useState('')
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  const [renderedHtml, setRenderedHtml] = useState('')
  const [toc, setToc] = useState<TocEntry[]>([])
  const [tocOpen, setTocOpen] = useState(true)

  async function loadFile(path: string): Promise<void> {
    try {
      const { content, baseDir } = await window.api.readFile(path)
      setSource(content)
      setBaseDir(baseDir)
      setFilePath(path)
      setStatus(path)
    } catch (err) {
      setStatus(`Ошибка чтения: ${String(err)}`)
    }
  }

  function scrollToId(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    applyTheme(dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    let cancelled = false
    renderMarkdown(source).then((h) => {
      if (!cancelled) setRenderedHtml(h)
    })
    return () => {
      cancelled = true
    }
  }, [source])

  useEffect(() => {
    window.api.startFile().then((p) => {
      if (p) return loadFile(p)
    })
  }, [])

  return (
    <div className="app">
      <header className="toolbar">
        <span className="path">{filePath}</span>
        <button onClick={() => setTocOpen((v) => !v)}>Оглавление</button>
        <button onClick={() => setDark((d) => !d)}>{dark ? '☀️ Светлая' : '🌙 Тёмная'}</button>
      </header>
      <main className="content">
        <div className="content-inner">
          <MarkdownView html={renderedHtml} baseDir={baseDir} dark={dark} onToc={setToc} />
          {tocOpen && <TocSidebar entries={toc} onNavigate={scrollToId} />}
        </div>
      </main>
      <footer className="status">{filePath || status}</footer>
    </div>
  )
}
