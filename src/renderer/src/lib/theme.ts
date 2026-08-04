import markdownLight from 'github-markdown-css/github-markdown-light.css?inline'
import markdownDark from 'github-markdown-css/github-markdown-dark.css?inline'
import hljsLight from 'highlight.js/styles/github.css?inline'
import hljsDark from 'highlight.js/styles/github-dark.css?inline'

let styleEl: HTMLStyleElement | null = null

export function applyTheme(dark: boolean): void {
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'theme-css'
    document.head.appendChild(styleEl)
  }
  styleEl.textContent = dark ? `${markdownDark}\n${hljsDark}` : `${markdownLight}\n${hljsLight}`
  document.documentElement.classList.toggle('dark', dark)
}
