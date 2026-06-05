import { DOMParser } from '@xmldom/xmldom'

// Allowed SVG elements (icon-friendly subset). Anything outside this set —
// including <script>, <foreignObject>, <image>, <style>, <a>, <use>, <animate*>,
// <set>, <filter>, etc. — fails install.
const ALLOWED_ELEMENTS = new Set([
  'svg',
  'g',
  'defs',
  'title',
  'desc',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'lineargradient',
  'radialgradient',
  'stop',
])

// Allowed attributes for icon-style SVGs. on* event handlers, href, xlink:href,
// and style are explicitly rejected — they're the common XSS / exfiltration
// vectors.
const ALLOWED_ATTRS = new Set([
  'xmlns',
  'xmlns:xlink',
  'version',
  'viewbox',
  'preserveaspectratio',
  'width',
  'height',
  'fill',
  'fill-rule',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-opacity',
  'stroke-dasharray',
  'stroke-dashoffset',
  'opacity',
  'transform',
  'd',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'points',
  'offset',
  'stop-color',
  'stop-opacity',
  'id',
  'class',
  'gradientunits',
  'gradienttransform',
  'spreadmethod',
])

export type SvgValidateResult =
  | { ok: true }
  | { ok: false; reason: string; rejected: string[] }

interface XmlAttr {
  name?: string
}

interface XmlNode {
  nodeType?: number
  tagName?: string
  attributes?: ArrayLike<XmlAttr> | null
  childNodes?: ArrayLike<XmlNode> | null
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items))
}

function walkElement(el: XmlNode, rejected: string[]): void {
  const name = (el.tagName ?? '').toLowerCase()
  if (!ALLOWED_ELEMENTS.has(name)) {
    rejected.push(`<${name || 'unknown'}>`)
    return
  }

  if (el.attributes) {
    for (const attr of Array.from(el.attributes)) {
      const attrName = attr.name
      if (!attrName) {
        continue
      }
      const lower = attrName.toLowerCase()
      if (
        lower.startsWith('on') ||
        lower === 'href' ||
        lower === 'xlink:href' ||
        lower === 'style' ||
        !ALLOWED_ATTRS.has(lower)
      ) {
        rejected.push(`@${attrName}`)
      }
    }
  }

  if (el.childNodes) {
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === 1) {
        walkElement(child, rejected)
      }
    }
  }
}

// Validates an SVG icon at install time without mutating the bundle. Uses
// @xmldom/xmldom (pure-JS, no fs deps — works under any bundler). What the
// author shipped is what the platform serves.
export function validateSvg(input: string): SvgValidateResult {
  if (input.length === 0) {
    return { ok: false, reason: 'SVG input is empty', rejected: [] }
  }

  const parserErrors: string[] = []
  const parser = new DOMParser({
    onError: (level, message) => {
      if (level === 'error' || level === 'fatalError') {
        parserErrors.push(
          typeof message === 'string' ? message : String(message),
        )
      }
    },
  })

  let doc: { documentElement?: XmlNode | null }
  try {
    doc = parser.parseFromString(input, 'image/svg+xml') as unknown as {
      documentElement?: XmlNode | null
    }
  } catch (err) {
    return {
      ok: false,
      reason: `SVG parse failed: ${err instanceof Error ? err.message : String(err)}`,
      rejected: [],
    }
  }

  if (parserErrors.length > 0) {
    return {
      ok: false,
      reason: `SVG parse failed: ${parserErrors[0]}`,
      rejected: [],
    }
  }

  const root = doc.documentElement
  if (!root || (root.tagName ?? '').toLowerCase() !== 'svg') {
    return {
      ok: false,
      reason: 'Input does not contain an <svg> root element',
      rejected: [],
    }
  }

  const rejected: string[] = []
  walkElement(root, rejected)

  if (rejected.length > 0) {
    const deduped = unique(rejected)
    return {
      ok: false,
      reason: `Disallowed content: ${deduped.join(', ')}`,
      rejected: deduped,
    }
  }
  return { ok: true }
}
