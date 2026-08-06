import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

export const darkEditorTheme = EditorView.theme({
	"&": {
		backgroundColor: "transparent",
		color: "#e8eaed",
		fontSize: "13.5px",
	},
	".cm-content": {
		caretColor: "#4c8bf5",
		padding: "12px 0 12px 4px",
	},
	"&.cm-focused": { outline: "none" },
	".cm-cursor": { borderLeftColor: "#4c8bf5" },
	"&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
		{ backgroundColor: "rgba(76, 139, 245, 0.3)" },
	".cm-activeLine": { backgroundColor: "rgba(255, 255, 255, 0.04)" },
	".cm-gutters": {
		backgroundColor: "transparent",
		color: "#5c6672",
		border: "none",
	},
	".cm-activeLineGutter": { backgroundColor: "transparent", color: "#8b95a5" },
	".cm-searchMatch": {
		backgroundColor: "rgba(255, 213, 79, 0.3)",
		outline: "none",
	},
	".cm-searchMatch.cm-searchMatch-selected": {
		backgroundColor: "rgba(255, 213, 79, 0.5)",
	},
});

export const lightEditorTheme = EditorView.theme({
	"&": {
		backgroundColor: "transparent",
		color: "#1f2328",
		fontSize: "13.5px",
	},
	".cm-content": {
		caretColor: "#0969da",
		padding: "12px 0 12px 4px",
	},
	"&.cm-focused": { outline: "none" },
	".cm-cursor": { borderLeftColor: "#0969da" },
	"&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
		{ backgroundColor: "rgba(9, 105, 218, 0.2)" },
	".cm-activeLine": { backgroundColor: "rgba(9, 30, 66, 0.04)" },
	".cm-gutters": {
		backgroundColor: "transparent",
		color: "#8c959f",
		border: "none",
	},
	".cm-activeLineGutter": { backgroundColor: "transparent", color: "#57606a" },
	".cm-searchMatch": {
		backgroundColor: "rgba(255, 213, 79, 0.5)",
		outline: "none",
	},
});

export const darkHighlightStyle = HighlightStyle.define([
	{ tag: t.heading, color: "#e8eaed", fontWeight: "bold" },
	{ tag: t.heading1, fontSize: "1.35em" },
	{ tag: t.heading2, fontSize: "1.22em" },
	{ tag: t.heading3, fontSize: "1.1em" },
	{ tag: t.strong, fontWeight: "bold" },
	{ tag: t.emphasis, fontStyle: "italic" },
	{ tag: t.strikethrough, textDecoration: "line-through", color: "#8b949e" },
	{ tag: t.link, color: "#6a9df7", textDecoration: "underline" },
	{ tag: t.url, color: "#8b949e", textDecoration: "underline" },
	{
		tag: t.monospace,
		fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
	},
	{ tag: t.quote, color: "#8b949e", fontStyle: "italic" },
	{ tag: t.contentSeparator, color: "#6a9df7" },
	{ tag: t.list, color: "#8b949e" },
	{ tag: t.invalid, color: "#f47067" },
]);

export const lightHighlightStyle = HighlightStyle.define([
	{ tag: t.heading, color: "#1f2328", fontWeight: "bold" },
	{ tag: t.heading1, fontSize: "1.35em" },
	{ tag: t.heading2, fontSize: "1.22em" },
	{ tag: t.heading3, fontSize: "1.1em" },
	{ tag: t.strong, fontWeight: "bold" },
	{ tag: t.emphasis, fontStyle: "italic" },
	{ tag: t.strikethrough, textDecoration: "line-through", color: "#57606a" },
	{ tag: t.link, color: "#0969da", textDecoration: "underline" },
	{ tag: t.url, color: "#57606a", textDecoration: "underline" },
	{
		tag: t.monospace,
		fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
	},
	{ tag: t.quote, color: "#57606a", fontStyle: "italic" },
	{ tag: t.contentSeparator, color: "#0969da" },
	{ tag: t.list, color: "#57606a" },
	{ tag: t.invalid, color: "#cf222e" },
]);

export function editorThemeExtensions(dark: boolean) {
	return dark
		? [darkEditorTheme, syntaxHighlighting(darkHighlightStyle)]
		: [lightEditorTheme, syntaxHighlighting(lightHighlightStyle)];
}
