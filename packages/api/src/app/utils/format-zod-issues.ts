import type { z } from 'zod'

/**
 * One leaf issue surfaced to the caller. The path is dot-joined (e.g.
 * `settings.user.properties.label`) and the message is the underlying Zod
 * complaint. Discriminated-union mismatches expand to one entry per
 * candidate variant whose path actually mentions a non-discriminator field,
 * so the caller sees what was wrong with the closest-fitting variant rather
 * than every attempted-and-rejected variant.
 */
export interface FormattedZodIssue {
  path: string
  message: string
}

function joinPath(path: PropertyKey[]): string {
  return path
    .map((p) => (typeof p === 'number' ? `[${p}]` : String(p)))
    .filter((s) => s.length > 0)
    .join('.')
    .replace(/\.\[/g, '[')
}

/**
 * Walk a Zod issue tree, collecting one entry per leaf complaint with its
 * absolute path. `invalid_union` issues are recursed into — for a union
 * mismatch we keep the leaves of the variant with the deepest path, on the
 * assumption that the deeper variant is the closer match. This collapses
 * the wall of "expected string / expected number / expected boolean / …"
 * complaints that discriminated unions otherwise produce.
 */
export function flattenZodIssues(
  issues: readonly z.core.$ZodIssue[],
): FormattedZodIssue[] {
  const out: FormattedZodIssue[] = []
  for (const issue of issues) {
    if (issue.code === 'invalid_union') {
      // `errors` on an invalid_union issue is `$ZodIssue[][]` — one inner
      // array per attempted union variant. The Zod 4 type signatures aren't
      // exposed publicly enough to import directly, so cast through unknown.
      const variantIssueLists = (
        issue as unknown as { errors: readonly (readonly z.core.$ZodIssue[])[] }
      ).errors
      const candidateLeaves = variantIssueLists.map((variantIssues) =>
        flattenZodIssues(variantIssues),
      )
      // Pick the variant whose deepest leaf path is longest — that's the
      // one whose discriminator (if any) matched, so its remaining
      // complaints are the actionable ones.
      let best = candidateLeaves[0] ?? []
      let bestDepth = -1
      for (const leaves of candidateLeaves) {
        const depth = Math.max(0, ...leaves.map((l) => l.path.length))
        if (depth > bestDepth) {
          best = leaves
          bestDepth = depth
        }
      }
      // Re-anchor each leaf under the union's own path.
      const prefix = issue.path
      for (const leaf of best) {
        const fullPath = leaf.path
          ? `${joinPath(prefix)}${joinPath(prefix) ? '.' : ''}${leaf.path}`
          : joinPath(prefix)
        out.push({ path: fullPath, message: leaf.message })
      }
      continue
    }
    out.push({ path: joinPath(issue.path), message: issue.message })
  }
  return out
}

/**
 * Build a multi-line, human-readable summary from a Zod error. Uses
 * `flattenZodIssues` so deeply-nested union failures don't explode into
 * an unreadable wall.
 */
export function summariseZodError(error: z.ZodError): string {
  const flat = flattenZodIssues(error.issues)
  if (flat.length === 0) {
    return 'Invalid input'
  }
  return flat
    .map(({ path, message }) =>
      path.length > 0 ? `  • ${path}: ${message}` : `  • ${message}`,
    )
    .join('\n')
}
