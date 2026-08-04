import { useEffect, useState } from 'react'
import { renderMarkdown } from './lib/markdown'
import { applyTheme } from './lib/theme'
import MarkdownView from './components/MarkdownView'

export default function App() {
  const [source, setSource] = useState('')
  const [baseDir, setBaseDir] = useState('')
  const [filePath, setFilePath] = useState('')
  const [status, setStatus] = useState('')
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  const [renderedHtml, setRenderedHtml] = useState('')

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
        <button onClick={() => setDark((d) => !d)}>{dark ? '☀️ Светлая' : '🌙 Тёмная'}</button>
      </header>
      <main className="content">
        <MarkdownView html={renderedHtml} baseDir={baseDir} />
      </main>
      <footer className="status">{filePath || status}</footer>
    </div>
  )
}
