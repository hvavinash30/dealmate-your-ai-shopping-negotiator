/**
 * Dynamic category resolution — NOT a fixed whitelist.
 *
 * The shopper (or the Preference Agent's LLM extraction) can type any
 * category in any wording. Instead of maintaining a hardcoded synonym list
 * (which caps what "works" to categories someone remembered to add), this
 * compares the input against whatever categories ALREADY EXIST in the
 * `products` table at query time and picks the closest one if it's a
 * confident match.
 *
 * If nothing in the catalogue is close enough, the input is returned
 * unchanged (normalized) so it flows through to live search / gets created
 * as a brand new category — which then becomes matchable for every future
 * shopper who asks for the same thing, without anyone editing this file.
 */

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

// crude singularizer: "shoes" -> "shoe", "earbuds" -> "earbud"
function singularize(word: string): string {
  return word.endsWith("es") && word.length > 3
    ? word.slice(0, -2)
    : word.endsWith("s") && word.length > 3
      ? word.slice(0, -1)
      : word;
}

function tokens(s: string): string[] {
  return normalize(s)
    .split(" ")
    .filter(Boolean)
    .map(singularize);
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i]![j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1]![j - 1]!
          : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
    }
  }
  return dp[a.length]![b.length]!;
}

/** True if `input` and `candidate` likely refer to the same category. */
function isCloseMatch(input: string, candidate: string): boolean {
  const a = normalize(input);
  const b = normalize(candidate);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  // token overlap after singularizing, e.g. "running shoe" vs "running shoes"
  const aTokens = new Set(tokens(input));
  const bTokens = new Set(tokens(candidate));
  for (const t of aTokens) {
    if (bTokens.has(t)) return true;
  }

  // typo tolerance for short single-word categories, e.g. "sunglases"
  if (!a.includes(" ") && !b.includes(" ")) {
    const dist = levenshtein(a, b);
    const threshold = Math.max(1, Math.floor(Math.max(a.length, b.length) * 0.25));
    if (dist <= threshold) return true;
  }

  return false;
}

/**
 * Resolves `input` to the best-matching category already present in
 * `existingCategories` (any casing/order), or returns `input` trimmed
 * unchanged if nothing matches closely enough. No fixed category list —
 * `existingCategories` should come from the live products table.
 */
export function resolveCategory(input: string, existingCategories: string[]): string {
  const cleaned = input.trim();
  if (!cleaned) return cleaned;

  const uniqueExisting = Array.from(new Set(existingCategories.filter(Boolean)));
  const match = uniqueExisting.find((c) => isCloseMatch(cleaned, c));
  return match ?? cleaned;
}

export function categoriesMatch(a: string, b: string): boolean {
  return isCloseMatch(a, b);
}
