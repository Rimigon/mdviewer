import { useEffect, useState } from 'react'

export default function App() {
  const [source, setSource] = useState<string>('')
  const [baseDir, setBaseDir] = useState<string>('')
  const [filePath, setFilePath] = useState<string>('')
  const [status, setStatus] = useState<string>('')

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
    window.api.startFile().then((p) => {
      if (p) return loadFile(p)
    })
  }, [])

  return (
    <div className="app">
      <pre className="raw-view" title={baseDir || undefined}>
        {source || 'Загрузите .md файл'}
      </pre>
      <footer className="status">{filePath || status}</footer>
    </div>
  )
}
