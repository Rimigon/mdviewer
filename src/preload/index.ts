import { contextBridge, ipcRenderer } from "electron";
import type { DirEntry, FileContent, PathStat } from "../shared/types";

const api = {
	openFile: (): Promise<string | null> => ipcRenderer.invoke("dialog:openFile"),
	openFolder: (): Promise<string | null> =>
		ipcRenderer.invoke("dialog:openFolder"),
	readFile: (path: string): Promise<FileContent> =>
		ipcRenderer.invoke("fs:readFile", path),
	saveFile: (path: string, content: string): Promise<{ ok: boolean }> =>
		ipcRenderer.invoke("fs:writeFile", path, content),
	setDirty: (dirty: boolean): void => ipcRenderer.send("app:set-dirty", dirty),
	confirmClose: (): void => ipcRenderer.send("app:confirm-close"),
	onSaveAction: (cb: () => void): (() => void) => {
		const listener = (): void => cb();
		ipcRenderer.on("menu:save", listener);
		return () => ipcRenderer.removeListener("menu:save", listener);
	},
	onSaveBeforeClose: (cb: () => void): (() => void) => {
		const listener = (): void => cb();
		ipcRenderer.on("app:save-before-close", listener);
		return () => ipcRenderer.removeListener("app:save-before-close", listener);
	},
	readDir: (path: string): Promise<DirEntry[]> =>
		ipcRenderer.invoke("fs:readDir", path),
	stat: (path: string): Promise<PathStat> =>
		ipcRenderer.invoke("fs:stat", path),
	resolveImage: (baseDir: string, src: string): Promise<string | null> =>
		ipcRenderer.invoke("img:resolve", baseDir, src),
	startFile: (): Promise<string | null> => ipcRenderer.invoke("app:startFile"),
	openLink: (href: string, baseDir: string): Promise<void> =>
		ipcRenderer.invoke("app:openLink", href, baseDir),
	onOpenPath: (cb: (path: string) => void): (() => void) => {
		const listener = (_e: Electron.IpcRendererEvent, p: string): void => cb(p);
		ipcRenderer.on("app:open-path", listener);
		return () => ipcRenderer.removeListener("app:open-path", listener);
	},
	onMenuAction: (
		cb: (action: "open-file" | "open-folder" | "save") => void,
	): (() => void) => {
		const listener = (_e: Electron.IpcRendererEvent, channel: string): void => {
			if (channel === "menu:open-file") cb("open-file");
			else if (channel === "menu:open-folder") cb("open-folder");
			else if (channel === "menu:save") cb("save");
		};
		ipcRenderer.on("menu:open-file", listener);
		ipcRenderer.on("menu:open-folder", listener);
		ipcRenderer.on("menu:save", listener);
		return () => {
			ipcRenderer.removeListener("menu:open-file", listener);
			ipcRenderer.removeListener("menu:open-folder", listener);
			ipcRenderer.removeListener("menu:save", listener);
		};
	},
};

contextBridge.exposeInMainWorld("api", api);
export type Api = typeof api;
