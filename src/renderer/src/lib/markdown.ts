import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'

// defaultSchema (github) + разрешаем className/style везде:
// KaTeX (классы + инлайн-стили), hljs (классы), autolink-headings (класс anchor)
const schema = {
  ...defaultSchema,
  attributes: {
    ...(defaultSchema.attributes ?? {}),
    '*': [...((defaultSchema.attributes ?? {})['*'] ?? []), 'className', 'style']
  }
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSlug)
  .use(rehypeAutolinkHeadings, {
    behavior: 'prepend',
    content: { type: 'text', value: '#' },
    properties: { className: ['anchor'], ariaHidden: 'true' }
  })
  .use(rehypeKatex)
  .use(rehypeHighlight, { detect: false })
  .use(rehypeSanitize, schema)
  .use(rehypeStringify)

export async function renderMarkdown(source: string): Promise<string> {
  const file = await processor.process(source)
  return String(file)
}
