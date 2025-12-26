import { validateConditionExpression } from '@lombokapp/types'
import { EvalAstFactory, parse } from 'jexpr'

/**
 * Uses jexpr library to safely parse and evaluate JavaScript expressions.
 * jexpr parses expressions into an AST and evaluates them in a controlled manner,
 * preventing arbitrary code execution while supporting property access, comparisons,
 * and logical operators.
 *
 * Security: jexpr blocks most dangerous operations, but we still check for
 * constructor access patterns that could be used for prototype pollution.
 */
const astFactory = new EvalAstFactory()

/**
 * Evaluates a condition expression against a context object.
 *
 * @param condition - The condition expression to evaluate (e.g., "event.data.mediaType === 'IMAGE'")
 * @param context - The context object to evaluate the expression against (e.g., { event: ... } or { task: ... })
 * @returns true if the condition evaluates to truthy, false otherwise
 */
export function evalCondition(
  condition: string,
  context: Record<string, unknown>,
): boolean {
  // Security check: block constructor access and validate condition
  const validation = validateConditionExpression(condition)
  if (!validation.valid) {
    return false
  }

  const trimmed = condition.trim()

  try {
    // Parse the expression into an AST
    // jexpr handles the ! operator natively, so we can pass the full expression
    const parsedExpr = parse(trimmed, astFactory)

    // Evaluate the expression with the provided context
    // jexpr safely evaluates the AST without executing arbitrary code
    const result: unknown = parsedExpr?.evaluate(context) ?? false

    return Boolean(result)
  } catch {
    // If parsing or evaluation fails, return false
    return false
  }
}
