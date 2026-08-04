import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { join, dirname, resolve } from 'node:path'
import { readFile, readdir, stat as fsStat } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import type { DirEntry, FileContent, PathStat } from '../shared/types'

let mainWindow: BrowserWindow | null = null
const isDev = !app.isPackaged

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'MD Viewer',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  mainWindow = win
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerIpc(): void {
  ipcMain.handle('dialog:openFile', async () => {
    if (!mainWindow) return null
    const res = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkd'] }]
    })
    return res.canceled ? null : res.filePaths[0]
  })

  ipcMain.handle('dialog:openFolder', async () => {
    if (!mainWindow) return null
    const res = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] })
    return res.canceled ? null : res.filePaths[0]
  })

  ipcMain.handle('fs:readFile', async (_e, p: string): Promise<FileContent> => {
    const content = await readFile(p, 'utf8')
    return { content, baseDir: dirname(p) }
  })

  ipcMain.handle('fs:readDir', async (_e, p: string): Promise<DirEntry[]> => {
    const entries = await readdir(p, { withFileTypes: true })
    return entries.map((d) => ({ name: d.name, path: resolve(p, d.name), isDir: d.isDirectory() }))
  })

  ipcMain.handle('fs:stat', async (_e, p: string): Promise<PathStat> => {
    try {
      const s = await fsStat(p)
      return { exists: true, isDir: s.isDirectory(), isFile: s.isFile() }
    } catch {
      return { exists: false, isDir: false, isFile: false }
    }
  })

  ipcMain.handle('img:resolve', async (_e, baseDir: string, src: string): Promise<string | null> => {
    if (/^(https?:|file:|data:)/.test(src)) return null
    const full = resolve(baseDir, decodeURIComponent(src))
    try {
      await fsStat(full)
      return pathToFileURL(full).href
    } catch {
      return null
    }
  })

  ipcMain.handle('app:startFile', async (): Promise<string | null> => {
    const fromArgv = findMdInArgv(process.argv)
    if (fromArgv) return fromArgv
    if (isDev) {
      const demo = join(app.getAppPath(), 'demo.md')
      try {
        await fsStat(demo)
        return demo
      } catch {
        return null
      }
    }
    return null
  })
}

function findMdInArgv(argv: string[]): string | null {
  return argv.find((a) => /\.(md|markdown|mdown|mkd)$/i.test(a) && !a.startsWith('-')) ?? null
}

app.whenReady().then(() => {
  registerIpc()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
