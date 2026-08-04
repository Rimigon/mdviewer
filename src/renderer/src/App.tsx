import { useEffect, useState } from "react";
import { renderMarkdown } from "./lib/markdown";
import { applyTheme } from "./lib/theme";
import type { TocEntry } from "./lib/toc";
import MarkdownView from "./components/MarkdownView";
import TocSidebar from "./components/TocSidebar";
import FileTree from "./components/FileTree";
import SearchBar from "./components/SearchBar";
import SourceView from "./components/SourceView";

export default function App() {
	const [source, setSource] = useState("");
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
	const [mode, setMode] = useState<"render" | "source">("render");

	async function loadFile(path: string): Promise<void> {
		try {
			const { content, baseDir } = await window.api.readFile(path);
			setSource(content);
			setBaseDir(baseDir);
			setFilePath(path);
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

	useEffect(() => {
		// Меню приложения (русское) — акселераторы Ctrl+O / Ctrl+Shift+O приходят сюда
		return window.api.onMenuAction((action) => {
			if (action === "open-file") void handleOpenFile();
			else void handleOpenFolder();
		});
	}, []);

	useEffect(() => {
		applyTheme(dark);
		localStorage.setItem("theme", dark ? "dark" : "light");
	}, [dark]);

	useEffect(() => {
		let cancelled = false;
		renderMarkdown(source).then((h) => {
			if (!cancelled) setRenderedHtml(h);
		});
		return () => {
			cancelled = true;
		};
	}, [source]);

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
				<button onClick={() => void handleOpenFile()}>Открыть файл</button>
				<button onClick={() => void handleOpenFolder()}>Папка</button>
				<span className="path">{filePath}</span>
				<SearchBar query={query} onChange={setQuery} count={searchCount} />
				<button
					onClick={() => setMode((m) => (m === "render" ? "source" : "render"))}
				>
					{mode === "render" ? "Исходник" : "Рендер"}
				</button>
				<button onClick={() => setTocOpen((v) => !v)}>Оглавление</button>
				<button onClick={() => setDark((d) => !d)}>
					{dark ? "☀️ Светлая" : "🌙 Тёмная"}
				</button>
			</header>
			<main className="content">
				{root && <FileTree root={root} onOpenFile={loadFile} />}
				<div className="content-inner">
					{mode === "render" ? (
						<MarkdownView
							html={renderedHtml}
							baseDir={baseDir}
							dark={dark}
							query={query}
							onToc={setToc}
							onSearchCount={setSearchCount}
						/>
					) : (
						<SourceView source={source} />
					)}
					{tocOpen && <TocSidebar entries={toc} onNavigate={scrollToId} />}
				</div>
			</main>
			<footer className="status">{filePath || status}</footer>
		</div>
	);
}
