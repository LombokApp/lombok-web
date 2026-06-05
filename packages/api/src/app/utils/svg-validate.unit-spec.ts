import { describe, expect, it } from 'bun:test'

import { validateSvg } from './svg-validate'

describe('validateSvg', () => {
  it('accepts a minimal icon-style SVG', () => {
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 4h16v16H4z" fill="currentColor"/></svg>'
    const result = validateSvg(input)
    expect(result.ok).toBe(true)
  })

  it('rejects SVGs that contain <script>', () => {
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><script>alert(1)</script><circle cx="12" cy="12" r="10"/></svg>'
    const result = validateSvg(input)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('<script>')
    }
  })

  it('rejects SVGs that contain <foreignObject>', () => {
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><foreignObject><div>x</div></foreignObject><rect width="10" height="10"/></svg>'
    const result = validateSvg(input)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason.toLowerCase()).toContain('foreignobject')
    }
  })

  it('rejects SVGs that carry on* event handlers', () => {
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" onclick="alert(1)" onmouseover="x()"/></svg>'
    const result = validateSvg(input)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(
        result.rejected.some((entry) =>
          entry.toLowerCase().startsWith('@onclick'),
        ),
      ).toBe(true)
    }
  })

  it('rejects SVGs that contain <use>', () => {
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><use href="https://evil.example/x.svg"/></svg>'
    const result = validateSvg(input)
    expect(result.ok).toBe(false)
  })

  it('rejects SVGs that contain <image>', () => {
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><image href="https://evil.example/pixel.png" width="24" height="24"/><rect width="10" height="10"/></svg>'
    const result = validateSvg(input)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('<image>')
    }
  })

  it('rejects non-SVG input', () => {
    const result = validateSvg('<html><body>not svg</body></html>')
    expect(result.ok).toBe(false)
  })

  it('rejects empty input', () => {
    const result = validateSvg('')
    expect(result.ok).toBe(false)
  })
})
