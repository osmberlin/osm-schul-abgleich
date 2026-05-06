import { micromark } from 'micromark'
import { gfmStrikethrough, gfmStrikethroughHtml } from 'micromark-extension-gfm-strikethrough'

const micromarkOpts = {
  extensions: [gfmStrikethrough()],
  htmlExtensions: [gfmStrikethroughHtml()],
}

/** Same styling as inline OSM tag hints in SchuleDetail match explanation. */
const phrasingClassName =
  '[&_code]:rounded [&_code]:bg-zinc-900 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_code]:text-zinc-200 [&_strong]:font-semibold [&_em]:italic [&_s]:line-through [&_del]:line-through'

/**
 * Micromark wraps flow text in `<p>…</p>`. Strip one top-level paragraph so the
 * result is phrasing-only HTML safe inside `<p>` or `<li>`.
 * Multiple `<p>…</p>` blocks are left unchanged (invalid inside `<p>` — avoid that in copy).
 */
export function unwrapSingleMicromarkParagraph(html: string): string {
  const trimmed = html.trimEnd()
  if (!trimmed.startsWith('<p>') || !trimmed.endsWith('</p>')) return html
  const closingPs = trimmed.match(/<\/p>/g)?.length ?? 0
  if (closingPs !== 1) return html
  return trimmed.slice('<p>'.length, trimmed.length - '</p>'.length)
}

export function inlineMarkdownHtml(text: string): string {
  if (!text) return ''
  return unwrapSingleMicromarkParagraph(micromark(text, micromarkOpts))
}

export function InlineMarkdown({ children }: { children: string }) {
  return (
    <span
      className={phrasingClassName}
      dangerouslySetInnerHTML={{ __html: inlineMarkdownHtml(children) }}
    />
  )
}
