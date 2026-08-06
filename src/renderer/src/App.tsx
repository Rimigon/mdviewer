import { useEffect, useRef, useState } from "react";
import { renderMarkdown } from "./lib/markdown";
import { applyTheme } from "./lib/theme";
import type { TocEntry } from "./lib/toc";
import MarkdownView from "./components/MarkdownView";
import TocSidebar from "./components/TocSidebar";
import FileTree from "./components/FileTree";
import SearchBar from "./components/SearchBar";
import EditorPane from "./components/EditorPane";
import {
	EditIcon,
	EyeIcon,
	FolderIcon,
	ListIcon,
	MoonIcon,
	OpenFileIcon,
	SaveIcon,
	SunIcon,
} from "./components/icons";

const PREVIEW_DEBOUNCE_MS = 300;

export default function App() {
	const [source, setSource] = useState("");
	const [savedSource, setSavedSource] = useState("");
	const [baseDir, setBaseDir] = useState("");
	const [filePath, setFilePath] = useState("");
	const [status, setStatus] = useState("");
	const [dark, setDark] = useState(
		() => localStorage.getItem("theme") === "dark",
	);
	const [renderedHtml, setRenderedHtml] = useState("");
	const [toc, setToc] = useState<TocEntry[]>([]);
	const [tocOpen, setTocOpen] = useState(true);
	const [root, setRoot] = useState<string | null>(null);
	const [query, setQuery] = useState("");
	const [searchCount, setSearchCount] = useState(0);
	const [mode, setMode] = useState<"edit" | "read">("read");
	const [cursor, setCursor] = useState<{ line: number; col: number } | null>(
		null,
	);

	const dirty = filePath !== "" && source !== savedSource;
	const previewTimer = useRef<number | null>(null);

	// ---- Загрузка файла ----
	async function loadFile(path: string): Promise<void> {
		try {
			const { content, baseDir } = await window.api.readFile(path);
			setSource(content);
			setSavedSource(content);
			setBaseDir(baseDir);
			setFilePath(path);
			setCursor(null);
			setStatus(path);
		} catch (err) {
			setStatus(`Ошибка чтения: ${String(err)}`);
		}
	}

	async function handleOpenFile(): Promise<void> {
		const p = await window.api.openFile();
		if (p) await loadFile(p);
	}

	async function handleOpenFolder(): Promise<void> {
		const p = await window.api.openFolder();
		if (p) {
			setRoot(p);
			setStatus(p);
		}
	}

	async function handleDrop(e: React.DragEvent): Promise<void> {
		e.preventDefault();
		const file = e.dataTransfer.files[0];
		if (!file) return;
		const path = (file as File & { path?: string }).path;
		if (!path) return;
		const st = await window.api.stat(path);
		if (st.isDir) {
			setRoot(path);
			setStatus(path);
		} else if (st.isFile) {
			await loadFile(path);
		}
	}

	function scrollToId(id: string): void {
		document
			.getElementById(id)
			?.scrollIntoView({ behavior: "smooth", block: "start" });
	}

	// ---- Сохранение ----
	async function save(): Promise<boolean> {
		if (!filePath) return true;
		if (source === savedSource) return true;
		try {
			await window.api.saveFile(filePath, source);
			setSavedSource(source);
			setStatus("Сохранено");
			return true;
		} catch (err) {
			setStatus(`Ошибка сохранения: ${String(err)}`);
			return false;
		}
	}

	const saveRef = useRef(save);
	saveRef.current = save;

	// ---- Меню приложения ----
	useEffect(() => {
		return window.api.onMenuAction((action) => {
			if (action === "open-file") void handleOpenFile();
			else if (action === "open-folder") void handleOpenFolder();
			else if (action === "save") void saveRef.current();
		});
	}, []);

	// ---- Закрытие с несохранёнными изменениями ----
	useEffect(() => {
		return window.api.onSaveBeforeClose(() => {
			void (async () => {
				const ok = await saveRef.current();
				if (ok) window.api.confirmClose();
			})();
		});
	}, []);

	// ---- Тема ----
	useEffect(() => {
		applyTheme(dark);
		localStorage.setItem("theme", dark ? "dark" : "light");
		document.documentElement.dataset.theme = dark ? "dark" : "light";
	}, [dark]);

	// ---- Превью с debounce ----
	useEffect(() => {
		if (previewTimer.current !== null) {
			window.clearTimeout(previewTimer.current);
		}
		previewTimer.current = window.setTimeout(() => {
			renderMarkdown(source).then(setRenderedHtml);
		}, PREVIEW_DEBOUNCE_MS);
		return () => {
			if (previewTimer.current !== null) {
				window.clearTimeout(previewTimer.current);
				previewTimer.current = null;
			}
		};
	}, [source]);

	// ---- Зеркало dirty-флага в main ----
	useEffect(() => {
		window.api.setDirty(dirty);
	}, [dirty]);

	// ---- Файл при старте / по second-instance ----
	useEffect(() => {
		return window.api.onOpenPath((p) => void loadFile(p));
	}, []);

	useEffect(() => {
		window.api.startFile().then((p) => {
			if (p) return loadFile(p);
		});
	}, []);

	return (
		<div
			className="app"
			onDragOver={(e) => e.preventDefault()}
			onDrop={(e) => void handleDrop(e)}
		>
			<header className="toolbar">
				<button
					className="icon-btn"
					title="Открыть файл (Ctrl+O)"
					onClick={() => void handleOpenFile()}
				>
					<OpenFileIcon />
				</button>
				<button
					className="icon-btn"
					title="Открыть папку (Ctrl+Shift+O)"
					onClick={() => void handleOpenFolder()}
				>
					<FolderIcon />
				</button>
				<button
					className="icon-btn"
					title="Сохранить (Ctrl+S)"
					disabled={!filePath || !dirty}
					onClick={() => void save()}
				>
					<SaveIcon />
				</button>
				<span className="toolbar-divider" />
				<button
					className={`icon-btn${mode === "edit" ? " active" : ""}`}
					title={mode === "edit" ? "Режим правки" : "Включить режим правки"}
					onClick={() => setMode((m) => (m === "edit" ? "read" : "edit"))}
				>
					{mode === "edit" ? <EditIcon /> : <EyeIcon />}
				</button>
				{mode === "read" && (
					<button
						className={`icon-btn${tocOpen ? " active" : ""}`}
						title="Оглавление"
						onClick={() => setTocOpen((v) => !v)}
					>
						<ListIcon />
					</button>
				)}
				<span className="toolbar-divider" />
				<SearchBar query={query} onChange={setQuery} count={searchCount} />
				<span className="toolbar-divider" />
				<button
					className="icon-btn"
					title={dark ? "Светлая тема" : "Тёмная тема"}
					onClick={() => setDark((d) => !d)}
				>
					{dark ? <SunIcon /> : <MoonIcon />}
				</button>
				<span
					className={`path${dirty ? " path-dirty" : ""}`}
					title={filePath || status}
				>
					{filePath || status || "MD Viewer"}
				</span>
			</header>
			<main className="content">
				{root && (
					<FileTree
						root={root}
						activePath={filePath || null}
						onOpenFile={loadFile}
					/>
				)}
				{filePath ? (
					mode === "edit" ? (
						<div className="split">
							<EditorPane
								source={source}
								onChange={setSource}
								onCursor={setCursor}
								onSave={() => void save()}
								dark={dark}
							/>
							<div className="preview-pane">
								<MarkdownView
									html={renderedHtml}
									baseDir={baseDir}
									dark={dark}
									query={query}
									onToc={setToc}
									onSearchCount={setSearchCount}
								/>
							</div>
						</div>
					) : (
						<div className="content-inner read">
							<MarkdownView
								html={renderedHtml}
								baseDir={baseDir}
								dark={dark}
								query={query}
								onToc={setToc}
								onSearchCount={setSearchCount}
							/>
							{tocOpen && <TocSidebar entries={toc} onNavigate={scrollToId} />}
						</div>
					)
				) : (
					<div className="empty">
						<h2>Откройте файл Markdown</h2>
						<p>
							Файл можно открыть кнопкой выше, перетащить в окно или выбрать
							папку для навигации по дереву.
						</p>
						<button
							className="icon-btn"
							title="Открыть файл"
							onClick={() => void handleOpenFile()}
						>
							<OpenFileIcon />
						</button>
					</div>
				)}
			</main>
			<footer className="status">
				<span className="status-path">{filePath || status}</span>
				{dirty && <span className="status-dirty">Несохранённые изменения</span>}
				{mode === "edit" && cursor && (
					<span>
						Строка {cursor.line}, колонка {cursor.col}
					</span>
				)}
			</footer>
		</div>
	);
}
