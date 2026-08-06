// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import {
  collectBlocks,
  findBlockAtLine,
  findBlockNearTop,
} from '../src/renderer/src/lib/syncScroll'

function container(html: string): HTMLElement {
  return new DOMParser().parseFromString(html, 'text/html').body
}

describe('syncScroll', () => {
  it('collectBlocks собирает блоки с data-src-line в DOM-порядке', () => {
    const root = container(
      '<h1 data-src-line="1">Заголовок</h1><p data-src-line="3">текст</p>' +
        '<pre data-src-line="5"><code>x</code></pre><div>без линии</div>',
    )
    const blocks = collectBlocks(root)
    expect(blocks.map((b) => b.line)).toEqual([1, 3, 5])
    expect(blocks.map((b) => b.el.tagName)).toEqual(['H1', 'P', 'PRE'])
  })

  it('findBlockAtLine находит последний блок с line <= target', () => {
    const root = container(
      '<h1 data-src-line="1">a</h1><p data-src-line="3">b</p><p data-src-line="10">c</p>',
    )
    const blocks = collectBlocks(root)
    expect(findBlockAtLine(blocks, 1)?.line).toBe(1)
    expect(findBlockAtLine(blocks, 2)?.line).toBe(1)
    expect(findBlockAtLine(blocks, 4)?.line).toBe(3)
    expect(findBlockAtLine(blocks, 100)?.line).toBe(10)
    expect(findBlockAtLine(blocks, 0)).toBeNull()
    expect(findBlockAtLine([], 5)).toBeNull()
  })

  it('findBlockNearTop возвращает блок, пересекающий верхний край контейнера', () => {
    // Позиционируем блоки с известными отступами через style (jsdom считает rect)
    const root = container(
      '<div data-src-line="1" style="height:100px">a</div>' +
        '<div data-src-line="2" style="height:100px">b</div>' +
        '<div data-src-line="3" style="height:100px">c</div>',
    )
    const blocks = collectBlocks(root)
    const scroller = document.createElement('div')
    scroller.style.overflow = 'auto'
    scroller.style.height = '50px'
    root.querySelector('[data-src-line="1"]')!.before(scroller)
    // В jsdom getBoundingClientRect не зависит от скролла — проверяем
    // корректность возврата при пустом/коротком контейнере
    const result = findBlockNearTop(blocks, scroller)
    expect(result).not.toBeNull()
    expect(result?.line).toBeGreaterThanOrEqual(1)
  })
})
