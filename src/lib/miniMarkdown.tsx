import type { ReactNode } from 'react'
import { Fragment } from 'react'

export type MiniSegment =
  | { type: 'text'; value: string }
  | { type: 'code'; value: string }
  | { type: 'bold'; children: MiniSegment[] }
  | { type: 'italic'; children: MiniSegment[] }
  | { type: 'strike'; children: MiniSegment[] }

/** Same styling as inline OSM tag hints in SchuleDetail match explanation. */
const inlineCodeClassName = 'rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[0.9em] text-zinc-200'

function mergeAdjacentText(segments: MiniSegment[]): MiniSegment[] {
  const merged: MiniSegment[] = []
  for (const s of segments) {
    const last = merged[merged.length - 1]
    if (s.type === 'text' && last?.type === 'text') last.value += s.value
    else merged.push(s)
  }
  return merged
}

type RichMatchKind = 'strike' | 'bold' | 'italic' | 'italic_under'

type RichMatch = {
  kind: RichMatchKind
  start: number
  end: number
  innerStart: number
  innerEnd: number
}

function findFirstStrike(s: string): RichMatch | null {
  let i = 0
  while (i < s.length) {
    const a = s.indexOf('~~', i)
    if (a === -1) return null
    const b = s.indexOf('~~', a + 2)
    if (b !== -1) return { kind: 'strike', start: a, end: b + 2, innerStart: a + 2, innerEnd: b }
    i = a + 2
  }
  return null
}

function findFirstBold(s: string): RichMatch | null {
  let i = 0
  while (i < s.length) {
    const a = s.indexOf('**', i)
    if (a === -1) return null
    const b = s.indexOf('**', a + 2)
    if (b !== -1) return { kind: 'bold', start: a, end: b + 2, innerStart: a + 2, innerEnd: b }
    i = a + 2
  }
  return null
}

function findFirstItalicStar(s: string): RichMatch | null {
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== '*') continue
    if (i + 1 < s.length && s[i + 1] === '*') {
      i++
      continue
    }
    for (let j = i + 1; j < s.length; j++) {
      if (s[j] !== '*') continue
      if (j + 1 < s.length && s[j + 1] === '*') continue
      return { kind: 'italic', start: i, end: j + 1, innerStart: i + 1, innerEnd: j }
    }
  }
  return null
}

function findFirstItalicUnder(s: string): RichMatch | null {
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== '_') continue
    if (i + 1 < s.length && s[i + 1] === '_') {
      i++
      continue
    }
    for (let j = i + 1; j < s.length; j++) {
      if (s[j] !== '_') continue
      if (j + 1 < s.length && s[j + 1] === '_') continue
      return { kind: 'italic_under', start: i, end: j + 1, innerStart: i + 1, innerEnd: j }
    }
  }
  return null
}

function findFirstRichMatch(s: string): RichMatch | null {
  const cands: RichMatch[] = []
  const st = findFirstStrike(s)
  const bo = findFirstBold(s)
  const it = findFirstItalicStar(s)
  const iu = findFirstItalicUnder(s)
  if (st) cands.push(st)
  if (bo) cands.push(bo)
  if (it) cands.push(it)
  if (iu) cands.push(iu)
  if (cands.length === 0) return null
  return cands.reduce((a, b) =>
    a.start < b.start ? a : b.start < a.start ? b : a.end <= b.end ? a : b,
  )
}

/** `~~strike~~`, `**bold**`, `*italic*`, `_italic_` (leftmost match wins; nested inners parsed recursively). */
export function parseRichInline(s: string): MiniSegment[] {
  if (!s) return []
  const m = findFirstRichMatch(s)
  if (!m) return [{ type: 'text', value: s }]
  const before = parseRichInline(s.slice(0, m.start))
  const inner = parseRichInline(s.slice(m.innerStart, m.innerEnd))
  const after = parseRichInline(s.slice(m.end))
  const node: MiniSegment =
    m.kind === 'strike'
      ? { type: 'strike', children: inner }
      : m.kind === 'bold'
        ? { type: 'bold', children: inner }
        : { type: 'italic', children: inner }
  return mergeAdjacentText([...before, node, ...after])
}

/** Inline-only: `` `code` `` then rich inline in plain segments (not inside code). */
export function segmentMiniMarkdown(text: string): MiniSegment[] {
  const segments: MiniSegment[] = []
  let i = 0
  const n = text.length
  while (i < n) {
    if (text[i] === '`') {
      const close = text.indexOf('`', i + 1)
      if (close === -1) {
        segments.push({ type: 'text', value: text.slice(i) })
        break
      }
      segments.push({ type: 'code', value: text.slice(i + 1, close) })
      i = close + 1
    } else {
      const next = text.indexOf('`', i)
      const end = next === -1 ? n : next
      if (end > i) segments.push(...parseRichInline(text.slice(i, end)))
      if (next === -1) break
      i = next
    }
  }
  return mergeAdjacentText(segments)
}

function renderSegments(segs: MiniSegment[], keyPrefix: string): ReactNode[] {
  return segs.map((s, idx) => {
    const k = `${keyPrefix}-${idx}`
    switch (s.type) {
      case 'text':
        return s.value
      case 'code':
        return (
          <code key={k} className={inlineCodeClassName}>
            {s.value}
          </code>
        )
      case 'bold':
        return (
          <strong key={k} className="font-semibold">
            {renderSegments(s.children, k)}
          </strong>
        )
      case 'italic':
        return (
          <em key={k} className="italic">
            {renderSegments(s.children, k)}
          </em>
        )
      case 'strike':
        return (
          <s key={k} className="line-through">
            {renderSegments(s.children, k)}
          </s>
        )
    }
  })
}

export function miniMarkdownNodes(text: string): ReactNode {
  const segs = segmentMiniMarkdown(text)
  return <Fragment>{renderSegments(segs, 'm')}</Fragment>
}
