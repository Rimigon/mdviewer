import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import type { Root } from "hast";

// defaultSchema (github) + разрешаем className/style везде:
// KaTeX (классы + инлайн-стили), hljs (классы), autolink-headings (класс anchor),
// dataSrcLine (для синхронного скролла редактор-превью).
// У `code` и `a` свои списки атрибутов, поэтому className разрешаем явно:
// - code: заменяем github-tuple (language-*) на безусловный className
// - a: убираем футернотный tuple ["className","data-footnote-backref"], иначе
//   findDefinition берёт его первым и вырезает все прочие классы
const githubAAttrs = (defaultSchema.attributes ?? {}).a ?? [];
const schema = {
	...defaultSchema,
	attributes: {
		...(defaultSchema.attributes ?? {}),
		"*": [
			...((defaultSchema.attributes ?? {})["*"] ?? []),
			"className",
			"style",
			"dataSrcLine",
		],
		code: ["className"],
		a: [
			...githubAAttrs.filter(
				(d) => !(Array.isArray(d) && d[0] === "className"),
			),
			"className",
		],
	},
};

// Ставит data-src-line на каждый верхнеуровневый блок: номер строки исходника,
// с которой блок начинается. Это мост для синхронного скролла редактор-превью.
// Позиции приходят из remark/rehype (node.position.start.line).
function rehypeSourceLines() {
	return (tree: Root): undefined => {
		for (const child of tree.children) {
			if (child.type !== "element") continue;
			const line = child.position?.start?.line;
			if (typeof line === "number") {
				child.properties = { ...(child.properties ?? {}), dataSrcLine: line };
			}
		}
	};
}

const processor = unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkMath)
	.use(remarkRehype, { allowDangerousHtml: true })
	.use(rehypeRaw)
	.use(rehypeSlug)
	.use(rehypeAutolinkHeadings, {
		behavior: "prepend",
		content: { type: "text", value: "#" },
		properties: { className: ["anchor"], ariaHidden: "true" },
	})
	.use(rehypeKatex)
	.use(rehypeHighlight, { detect: false })
	.use(rehypeSourceLines)
	// clobberPrefix: '' — не префиксовать id/name префиксом user-content-:
	// сноски и якоря remark/rehype уже генерируют id вида user-content-fn-1,
	// двойной префикс ломал бы совпадение href="#..." с элементом.
	// rehype-sanitize v6 принимает Schema целиком — clobberPrefix это поле Schema.
	.use(rehypeSanitize, { ...schema, clobberPrefix: "" })
	.use(rehypeStringify);

export async function renderMarkdown(source: string): Promise<string> {
	const file = await processor.process(source);
	return String(file);
}
