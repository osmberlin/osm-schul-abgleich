import { inlineMarkdownHtml, unwrapSingleMicromarkParagraph } from './InlineMarkdown'
import { describe, expect, it } from 'vitest'

describe('unwrapSingleMicromarkParagraph', () => {
  it('unwraps one paragraph', () => {
    expect(unwrapSingleMicromarkParagraph('<p>a <strong>b</strong></p>')).toBe(
      'a <strong>b</strong>',
    )
  })

  it('leaves multi-paragraph HTML unchanged', () => {
    const html = '<p>a</p>\n<p>b</p>'
    expect(unwrapSingleMicromarkParagraph(html)).toBe(html)
  })
})

describe('inlineMarkdownHtml', () => {
  it('returns empty for empty string', () => {
    expect(inlineMarkdownHtml('')).toBe('')
  })

  it('renders bold without outer p', () => {
    expect(inlineMarkdownHtml('**wichtig**')).toBe('<strong>wichtig</strong>')
  })

  it('renders inline code', () => {
    expect(inlineMarkdownHtml('`name`')).toBe('<code>name</code>')
  })

  it('does not parse bold inside code', () => {
    expect(inlineMarkdownHtml('`**x**`')).toBe('<code>**x**</code>')
  })

  it('renders strikethrough as del (GFM)', () => {
    expect(inlineMarkdownHtml('~~x~~')).toBe('<del>x</del>')
  })

  it('nests bold inside strike', () => {
    expect(inlineMarkdownHtml('~~**a**~~')).toBe('<del><strong>a</strong></del>')
  })
})
