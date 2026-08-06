import { useEffect, useRef } from "react";
import {
	EditorView,
	keymap,
	lineNumbers,
	highlightActiveLine,
	highlightActiveLineGutter,
	highlightSpecialChars,
	drawSelection,
} from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import {
	defaultKeymap,
	history,
	historyKeymap,
	indentWithTab,
} from "@codemirror/commands";
import { bracketMatching, indentOnInput } from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { editorThemeExtensions } from "../lib/cmTheme";

export interface EditorApi {
	scrollToLine: (line: number) => void;
}

interface Props {
	source: string;
	onChange: (value: string) => void;
	onCursor: (pos: { line: number; col: number }) => void;
	onSave: () => void;
	dark: boolean;
	onTopLine?: (line: number) => void;
	apiRef?: React.MutableRefObject<EditorApi | null>;
	initialScrollLine?: number | null;
}

export default function EditorPane({
	source,
	onChange,
	onCursor,
	onSave,
	dark,
	onTopLine,
	apiRef,
	initialScrollLine,
}: Props) {
	const containerRef = useRef<HTMLDivElement>(null);
	const viewRef = useRef<EditorView | null>(null);
	const themeCompartmentRef = useRef<Compartment | null>(null);
	const onChangeRef = useRef(onChange);
	const onCursorRef = useRef(onCursor);
	const onSaveRef = useRef(onSave);
	const onTopLineRef = useRef(onTopLine);
	onChangeRef.current = onChange;
	onCursorRef.current = onCursor;
	onSaveRef.current = onSave;
	onTopLineRef.current = onTopLine;

	function scrollToLine(line: number): void {
		const view = viewRef.current;
		if (!view) return;
		const clamped = Math.max(1, Math.min(line, view.state.doc.lines));
		const from = view.state.doc.line(clamped).from;
		view.dispatch({
			effects: EditorView.scrollIntoView(from, { y: "start", yMargin: 0 }),
		});
	}

	// Создание редактора один раз
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const themeCompartment = new Compartment();
		themeCompartmentRef.current = themeCompartment;

		const state = EditorState.create({
			doc: source,
			extensions: [
				lineNumbers(),
				highlightActiveLineGutter(),
				highlightSpecialChars(),
				history(),
				drawSelection(),
				EditorState.allowMultipleSelections.of(true),
				indentOnInput(),
				bracketMatching(),
				closeBrackets(),
				highlightActiveLine(),
				highlightSelectionMatches(),
				keymap.of([
					{
						key: "Mod-s",
						preventDefault: true,
						run: () => {
							onSaveRef.current();
							return true;
						},
					},
					...closeBracketsKeymap,
					...defaultKeymap,
					...searchKeymap,
					...historyKeymap,
					indentWithTab,
				]),
				markdown({ base: markdownLanguage }),
				themeCompartment.of(editorThemeExtensions(dark)),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						onChangeRef.current(update.state.doc.toString());
					}
					if (update.selectionSet || update.docChanged) {
						const head = update.state.selection.main.head;
						const line = update.state.doc.lineAt(head);
						onCursorRef.current({
							line: line.number,
							col: head - line.from + 1,
						});
					}
				}),
			],
		});

		const view = new EditorView({ state, parent: container });
		viewRef.current = view;
		onCursorRef.current({ line: 1, col: 1 });

		// Восстановление позиции при переключении режима (монтирование редактора).
		// Вызывается на каждом монтировании, поэтому переживает StrictMode-ремоунт.
		if (initialScrollLine && initialScrollLine > 1) {
			scrollToLine(initialScrollLine);
		}

		// Отчёт о строке у верхнего края редактора (для синхронного скролла)
		const onScroll = (): void => {
			const top = view.scrollDOM.scrollTop;
			const block = view.lineBlockAtHeight(top);
			onTopLineRef.current?.(view.state.doc.lineAt(block.from).number);
		};
		view.scrollDOM.addEventListener("scroll", onScroll);

		if (apiRef) {
			apiRef.current = { scrollToLine };
		}

		return () => {
			view.scrollDOM.removeEventListener("scroll", onScroll);
			view.destroy();
			viewRef.current = null;
			themeCompartmentRef.current = null;
			if (apiRef) apiRef.current = null;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Синхронизация внешнего текста (загрузка файла) — только если реально изменился
	useEffect(() => {
		const view = viewRef.current;
		if (!view) return;
		if (view.state.doc.toString() === source) return;
		view.dispatch({
			changes: { from: 0, to: view.state.doc.length, insert: source },
		});
	}, [source]);

	// Переключение темы
	useEffect(() => {
		const view = viewRef.current;
		if (!view) return;
		const effect = themeCompartmentRef.current?.reconfigure(
			editorThemeExtensions(dark),
		);
		if (effect) view.dispatch({ effects: effect });
	}, [dark]);

	return <div className="editor-pane" ref={containerRef} />;
}
