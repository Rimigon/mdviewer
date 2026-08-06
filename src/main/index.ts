import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from "electron";
import { join, dirname, resolve } from "node:path";
import { readFile, readdir, stat as fsStat, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import type {
	DirEntry,
	FileContent,
	PathStat,
	WriteResult,
} from "../shared/types";

let mainWindow: BrowserWindow | null = null;
let isDirty = false;
let closeConfirmed = false;
const isDev = !app.isPackaged;

function createWindow(): void {
	const win = new BrowserWindow({
		width: 1200,
		height: 800,
		title: "MD Viewer",
		icon: join(__dirname, "../../build/icon.png"),
		webPreferences: {
			preload: join(__dirname, "../preload/index.js"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
		},
	});
	mainWindow = win;

	// Защита от потери несохранённых изменений
	win.on("close", (e) => {
		if (!isDirty || closeConfirmed) return;
		e.preventDefault();
		const choice = dialog.showMessageBoxSync(win, {
			type: "warning",
			buttons: ["Сохранить и закрыть", "Не сохранять", "Отмена"],
			defaultId: 0,
			cancelId: 2,
			message: "Несохранённые изменения",
			detail: "Файл был изменён. Сохранить изменения перед закрытием?",
		});
		if (choice === 0) {
			win.webContents.send("app:save-before-close");
		} else if (choice === 1) {
			isDirty = false;
			closeConfirmed = true;
			win.close();
		}
	});

	// Внешние ссылки никогда не открываются внутри окна приложения
	win.webContents.setWindowOpenHandler(({ url }) => {
		void shell.openExternal(url);
		return { action: "deny" };
	});
	win.webContents.on("will-navigate", (event, url) => {
		const current = win.webContents.getURL();
		if (url === current) return; // перезагрузка / HMR
		if (/^(https?:|mailto:|tel:|file:)/i.test(url)) {
			event.preventDefault();
			void shell.openExternal(url);
		}
	});

	if (!app.isPackaged && process.env["ELECTRON_RENDERER_URL"]) {
		win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
	} else {
		win.loadFile(join(__dirname, "../renderer/index.html"));
	}
}

function registerIpc(): void {
	ipcMain.handle("dialog:openFile", async () => {
		if (!mainWindow) return null;
		const res = await dialog.showOpenDialog(mainWindow, {
			title: "Открыть файл Markdown",
			properties: ["openFile"],
			filters: [
				{ name: "Markdown", extensions: ["md", "markdown", "mdown", "mkd"] },
			],
		});
		return res.canceled ? null : res.filePaths[0];
	});

	ipcMain.handle("dialog:openFolder", async () => {
		if (!mainWindow) return null;
		const res = await dialog.showOpenDialog(mainWindow, {
			title: "Открыть папку",
			properties: ["openDirectory"],
		});
		return res.canceled ? null : res.filePaths[0];
	});

	ipcMain.handle("fs:readFile", async (_e, p: string): Promise<FileContent> => {
		const content = await readFile(p, "utf8");
		return { content, baseDir: dirname(p) };
	});

	ipcMain.handle("fs:readDir", async (_e, p: string): Promise<DirEntry[]> => {
		const entries = await readdir(p, { withFileTypes: true });
		return entries.map((d) => ({
			name: d.name,
			path: resolve(p, d.name),
			isDir: d.isDirectory(),
		}));
	});

	ipcMain.handle("fs:stat", async (_e, p: string): Promise<PathStat> => {
		try {
			const s = await fsStat(p);
			return { exists: true, isDir: s.isDirectory(), isFile: s.isFile() };
		} catch {
			return { exists: false, isDir: false, isFile: false };
		}
	});

	ipcMain.handle(
		"fs:writeFile",
		async (_e, p: string, content: string): Promise<WriteResult> => {
			await writeFile(p, content, "utf8");
			return { ok: true };
		},
	);

	ipcMain.on("app:set-dirty", (_e, dirty: boolean) => {
		isDirty = dirty;
	});

	ipcMain.on("app:confirm-close", () => {
		closeConfirmed = true;
		mainWindow?.close();
	});

	ipcMain.handle(
		"img:resolve",
		async (_e, baseDir: string, src: string): Promise<string | null> => {
			if (/^(https?:|file:|data:)/.test(src)) return null;
			const full = resolve(baseDir, decodeURIComponent(src));
			try {
				await fsStat(full);
				return pathToFileURL(full).href;
			} catch {
				return null;
			}
		},
	);

	ipcMain.handle(
		"app:openLink",
		async (_e, href: string, baseDir: string): Promise<void> => {
			// http/https/mailto/tel — в браузер по умолчанию
			if (/^(https?:|mailto:|tel:)/i.test(href)) {
				await shell.openExternal(href);
				return;
			}
			// относительная ссылка — резолвим от папки документа и открываем
			// обработчиком по умолчанию (для .md это может быть MD Viewer)
			const target = href.startsWith("file:")
				? fileURLToPath(href)
				: resolve(baseDir, decodeURIComponent(href));
			try {
				await shell.openExternal(pathToFileURL(target).href);
			} catch {
				// ссылка ведёт в никуда — молча игнорируем
			}
		},
	);

	ipcMain.handle("app:startFile", async (): Promise<string | null> => {
		const fromArgv = findMdInArgv(process.argv);
		if (fromArgv) return fromArgv;
		if (isDev) {
			const demo = join(app.getAppPath(), "demo.md");
			try {
				await fsStat(demo);
				return demo;
			} catch {
				return null;
			}
		}
		return null;
	});
}

function findMdInArgv(argv: string[]): string | null {
	return (
		argv.find(
			(a) => /\.(md|markdown|mdown|mkd)$/i.test(a) && !a.startsWith("-"),
		) ?? null
	);
}

// Single-instance: повторный запуск фокусирует существующее окно и открывает файл
if (!app.requestSingleInstanceLock()) {
	app.quit();
} else {
	app.on("second-instance", (_e, argv) => {
		const f = findMdInArgv(argv);
		if (mainWindow) {
			if (mainWindow.isMinimized()) mainWindow.restore();
			mainWindow.focus();
			if (f) mainWindow.webContents.send("app:open-path", f);
		}
	});
}

function buildRussianMenu(): void {
	const send = (channel: string): void => {
		mainWindow?.webContents.send(channel);
	};
	const template: Electron.MenuItemConstructorOptions[] = [
		{
			label: "Файл",
			submenu: [
				{
					label: "Открыть файл…",
					accelerator: "CmdOrCtrl+O",
					click: () => send("menu:open-file"),
				},
				{
					label: "Открыть папку…",
					accelerator: "CmdOrCtrl+Shift+O",
					click: () => send("menu:open-folder"),
				},
				{
					label: "Сохранить",
					accelerator: "CmdOrCtrl+S",
					click: () => send("menu:save"),
				},
				{ type: "separator" },
				{ role: "quit", label: "Выход" },
			],
		},
		{
			label: "Правка",
			submenu: [
				{ role: "undo", label: "Отменить" },
				{ role: "redo", label: "Повторить" },
				{ type: "separator" },
				{ role: "cut", label: "Вырезать" },
				{ role: "copy", label: "Копировать" },
				{ role: "paste", label: "Вставить" },
				{ role: "selectAll", label: "Выделить всё" },
			],
		},
		{
			label: "Вид",
			submenu: [
				{ role: "reload", label: "Перезагрузить" },
				{ role: "toggleDevTools", label: "Инструменты разработчика" },
				{ type: "separator" },
				{ role: "togglefullscreen", label: "Полный экран" },
			],
		},
		{
			label: "Окно",
			submenu: [
				{ role: "minimize", label: "Свернуть" },
				{ role: "close", label: "Закрыть" },
			],
		},
	];
	Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
	registerIpc();
	buildRussianMenu();
	createWindow();
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
