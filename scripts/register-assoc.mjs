import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const electronExe = join(root, 'node_modules', 'electron', 'dist', 'electron.exe')
const mainJs = join(root, 'out', 'main', 'index.js')
const command = `"${electronExe}" "${mainJs}" "%1"`
const progId = 'MDViewer.md'

function reg(args) {
  const r = spawnSync('reg', args, { encoding: 'utf8' })
  if (r.status !== 0) {
    console.error('reg failed:', args.join(' '), r.stderr)
    process.exitCode = 1
  }
}

reg(['add', 'HKCU\\Software\\Classes\\.md', '/ve', '/d', progId, '/f'])
reg(['add', `HKCU\\Software\\Classes\\${progId}`, '/ve', '/d', 'Markdown Document', '/f'])
reg(['add', `HKCU\\Software\\Classes\\${progId}\\DefaultIcon`, '/ve', '/d', `"${electronExe},0"`, '/f'])
reg(['add', `HKCU\\Software\\Classes\\${progId}\\shell\\open\\command`, '/ve', '/d', command, '/f'])
console.log('OK: .md теперь открывается через dev-сборку MD Viewer')
console.log('Запустите: npm run dev (или соберите out/main через npm run build)')
