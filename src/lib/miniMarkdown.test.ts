import { segmentMiniMarkdown } from './miniMarkdown'
import { describe, expect, it } from 'vitest'

describe('segmentMiniMarkdown', () => {
  it('returns empty for empty string', () => {
    expect(segmentMiniMarkdown('')).toEqual([])
  })

  it('treats plain text as one segment', () => {
    expect(segmentMiniMarkdown('hello')).toEqual([{ type: 'text', value: 'hello' }])
  })

  it('parses one code span', () => {
    expect(segmentMiniMarkdown('`name`')).toEqual([{ type: 'code', value: 'name' }])
  })

  it('parses bold', () => {
    expect(segmentMiniMarkdown('**wichtig**')).toEqual([{ type: 'bold', value: 'wichtig' }])
  })

  it('parses code before bold without interpreting bold inside code', () => {
    expect(segmentMiniMarkdown('`a`**b**')).toEqual([
      { type: 'code', value: 'a' },
      { type: 'bold', value: 'b' },
    ])
  })

  it('does not treat ** inside code as bold', () => {
    expect(segmentMiniMarkdown('`**x**`')).toEqual([{ type: 'code', value: '**x**' }])
  })

  it('leaves a lone backtick as literal text', () => {
    expect(segmentMiniMarkdown('foo`bar')).toEqual([{ type: 'text', value: 'foo`bar' }])
  })

  it('parses empty code span', () => {
    expect(segmentMiniMarkdown('``')).toEqual([{ type: 'code', value: '' }])
  })

  it('leaves unclosed ** as text', () => {
    expect(segmentMiniMarkdown('a**b')).toEqual([{ type: 'text', value: 'a**b' }])
  })
})
