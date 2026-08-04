// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { extractToc } from '../src/renderer/src/lib/toc'

function container(html: string): HTMLElement {
  return new DOMParser().parseFromString(html, 'text/html').body
}

describe('extractToc', () => {
  it('собирает заголовки с id, текстом и уровнем', () => {
    const el = container('<h1 id="a">Заголовок</h1><h2 id="b">Подзаголовок</h2><p>текст</p>')
    expect(extractToc(el)).toEqual([
      { id: 'a', text: 'Заголовок', level: 1 },
      { id: 'b', text: 'Подзаголовок', level: 2 }
    ])
  })

  it('исключает текст якоря (#) из заголовка', () => {
    const el = container('<h2 id="c"><a class="anchor" aria-hidden="true">#</a>Привет</h2>')
    expect(extractToc(el)[0].text).toBe('Привет')
  })

  it('ограничивает уровень maxLevel', () => {
    const el = container('<h3 id="h3">A</h3><h5 id="h5">B</h5>')
    expect(extractToc(el, 4).map((e) => e.id)).toEqual(['h3'])
  })

  it('пропускает заголовки без id', () => {
    const el = container('<h2>Без id</h2><h2 id="ok">С id</h2>')
    expect(extractToc(el).map((e) => e.id)).toEqual(['ok'])
  })
})
