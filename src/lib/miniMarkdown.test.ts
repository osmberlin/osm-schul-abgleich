import { parseRichInline, segmentMiniMarkdown } from './miniMarkdown'
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
    expect(segmentMiniMarkdown('**wichtig**')).toEqual([
      { type: 'bold', children: [{ type: 'text', value: 'wichtig' }] },
    ])
  })

  it('parses code before bold without interpreting bold inside code', () => {
    expect(segmentMiniMarkdown('`a`**b**')).toEqual([
      { type: 'code', value: 'a' },
      { type: 'bold', children: [{ type: 'text', value: 'b' }] },
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

  it('parses strikethrough', () => {
    expect(segmentMiniMarkdown('~~x~~')).toEqual([
      { type: 'strike', children: [{ type: 'text', value: 'x' }] },
    ])
  })

  it('parses italic with asterisks', () => {
    expect(segmentMiniMarkdown('*x*')).toEqual([
      { type: 'italic', children: [{ type: 'text', value: 'x' }] },
    ])
  })

  it('parses italic with underscores', () => {
    expect(segmentMiniMarkdown('_x_')).toEqual([
      { type: 'italic', children: [{ type: 'text', value: 'x' }] },
    ])
  })

  it('does not treat __ as underscore italic opener', () => {
    expect(segmentMiniMarkdown('__a__')).toEqual([{ type: 'text', value: '__a__' }])
  })
})

describe('parseRichInline', () => {
  it('nests bold inside strike', () => {
    expect(parseRichInline('~~**a**~~')).toEqual([
      { type: 'strike', children: [{ type: 'bold', children: [{ type: 'text', value: 'a' }] }] },
    ])
  })
})
