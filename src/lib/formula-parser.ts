/**
 * Evaluates a cost formula with a variable value.
 * Supports: +, -, *, /, parentheses, numeric literals, {variable} placeholder.
 * Returns null if the formula is invalid.
 */
export function evaluateFormula(formula: string, variableValue: number): number | null {
  const expression = formula.replace(/\{[^}]+\}/g, String(variableValue))

  if (!/^[\d\s+\-*/().]+$/.test(expression)) {
    return null
  }

  try {
    const result = new Function(`return (${expression})`)()
    if (typeof result !== 'number' || !isFinite(result)) return null
    return Math.round(result * 100) / 100
  } catch {
    return null
  }
}
