// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { highlightMatches, clearHighlights } from '../src/renderer/src/lib/search'

function container(html: string): HTMLElement {
  return new DOMParser().parseFromString(html, 'text/html').body
}

describe('highlightMatches', () => {
  it('подсвечивает совпадения и возвращает их количество', () => {
    const el = container('<p>foo bar foo</p>')
    expect(highlightMatches(el, 'foo')).toBe(2)
    expect(el.querySelectorAll('mark').length).toBe(2)
  })

  it('регистронезависим', () => {
    const el = container('<p>Hello HELLO hello</p>')
    expect(highlightMatches(el, 'hello')).toBe(3)
  })

  it('повторный вызов сбрасывает старые mark', () => {
    const el = container('<p>foo foo</p>')
    highlightMatches(el, 'foo')
    expect(highlightMatches(el, 'zzz')).toBe(0)
    expect(el.querySelectorAll('mark').length).toBe(0)
    expect(el.textContent).toBe('foo foo')
  })

  it('пустой запрос — 0 совпадений', () => {
    const el = container('<p>foo</p>')
    expect(highlightMatches(el, '')).toBe(0)
  })

  it('не трогает код и стили', () => {
    const el = container('<p>a b</p><script>foo</script><style>.foo{}</style>')
    expect(highlightMatches(el, 'foo')).toBe(0)
  })

  it('clearHighlights восстанавливает текст', () => {
    const el = container('<p>foo foo</p>')
    highlightMatches(el, 'foo')
    clearHighlights(el)
    expect(el.querySelectorAll('mark').length).toBe(0)
    expect(el.textContent).toBe('foo foo')
  })
})
