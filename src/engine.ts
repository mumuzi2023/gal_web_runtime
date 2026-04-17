/** Evaluate a condition string against game variables.
 *  Supports: >=, <=, >, <, ==, !=, and, or, not
 *  e.g. "affection_rin >= 11 and empathy_level >= 9"
 */
export function evaluateCondition(
  condition: string,
  variables: Record<string, number>
): boolean {
  if (!condition || condition.trim() === "") return true;

  try {
    // Tokenize the condition into a safe evaluable form
    // Replace variable names with their values
    let expr = condition;

    // Replace 'and' with '&&', 'or' with '||', 'not' with '!'
    expr = expr.replace(/\band\b/gi, "&&");
    expr = expr.replace(/\bor\b/gi, "||");
    expr = expr.replace(/\bnot\b/gi, "!");

    // Replace variable names (word chars) with values
    // Be careful not to replace operators or numbers
    expr = expr.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g, (match) => {
      // Skip JS keywords and boolean literals
      if (["true", "false", "null", "undefined"].includes(match.toLowerCase())) {
        return match;
      }
      const val = variables[match];
      return val !== undefined ? String(val) : "0";
    });

    // Only allow safe characters: digits, operators, parens, spaces, dots
    if (!/^[\d\s+\-*/<>=!&|().]+$/.test(expr)) {
      console.warn("Unsafe condition expression:", expr);
      return false;
    }

    // Use Function constructor (no access to scope) for safe evaluation
    const fn = new Function(`"use strict"; return (${expr});`);
    return !!fn();
  } catch (e) {
    console.warn("Failed to evaluate condition:", condition, e);
    return false;
  }
}

/** Apply variable changes from a choice's "set" map.
 *  Values like "+2" mean increment, otherwise absolute set.
 */
export function applySet(
  variables: Record<string, number>,
  setMap: Record<string, string>
): void {
  for (const [key, val] of Object.entries(setMap)) {
    const strVal = String(val);
    if (strVal.startsWith("+") || strVal.startsWith("-")) {
      variables[key] = (variables[key] || 0) + parseInt(strVal, 10);
    } else {
      variables[key] = parseInt(strVal, 10) || 0;
    }
  }
}
