import { contextBridge, ipcRenderer } from 'electron'
import type { DirEntry, FileContent, PathStat } from '../shared/types'

const api = {
  openFile: (): Promise<string | null> => ipcRenderer.invoke('dialog:openFile'),
  openFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:openFolder'),
  readFile: (path: string): Promise<FileContent> => ipcRenderer.invoke('fs:readFile', path),
  readDir: (path: string): Promise<DirEntry[]> => ipcRenderer.invoke('fs:readDir', path),
  stat: (path: string): Promise<PathStat> => ipcRenderer.invoke('fs:stat', path),
  resolveImage: (baseDir: string, src: string): Promise<string | null> =>
    ipcRenderer.invoke('img:resolve', baseDir, src),
  startFile: (): Promise<string | null> => ipcRenderer.invoke('app:startFile')
}

contextBridge.exposeInMainWorld('api', api)
export type Api = typeof api
