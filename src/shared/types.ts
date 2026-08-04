export interface DirEntry {
  name: string
  path: string
  isDir: boolean
}

export interface FileContent {
  content: string
  baseDir: string
}

export interface PathStat {
  exists: boolean
  isDir: boolean
  isFile: boolean
}
