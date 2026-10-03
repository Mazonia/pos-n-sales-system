import { LocalProduct } from './dexieSync';

/**
 * Calculates Damerau-Levenshtein distance between two strings.
 * Handles insertions, deletions, substitutions, and adjacent transpositions.
 */
export function damerauLevenshtein(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const matrix: number[][] = [];
  for (let i = 0; i <= al; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= bl; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );

      // Transposition
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + cost);
      }
    }
  }

  return matrix[al][bl];
}

/**
 * Tests if `query` is a subsequence of `target` (characters appear in order, allowing gaps).
 * Returns true if all characters of query appear sequentially.
 */
export function isSubsequence(query: string, target: string): boolean {
  let qIdx = 0;
  let tIdx = 0;
  while (qIdx < query.length && tIdx < target.length) {
    if (query[qIdx] === target[tIdx]) {
      qIdx++;
    }
    tIdx++;
  }
  return qIdx === query.length;
}

/**
 * Strips vowels from a word to test consonant skeleton match (e.g., 'kvo' vs 'kivo' -> 'kv' vs 'kv').
 */
export function getConsonants(word: string): string {
  return word.replace(/[aeiou\s_-]/gi, '').toLowerCase();
}

export type DirectMatchType = 
  | 'BARCODE_EXACT' 
  | 'BARCODE_PREFIX' 
  | 'SKU_EXACT' 
  | 'SKU_CONTAINS' 
  | 'NAME_STARTS_WITH' 
  | 'WORD_STARTS_WITH' 
  | 'NAME_CONTAINS' 
  | 'LOCAL_NAME_CONTAINS';

export interface SmartDirectMatch {
  product: LocalProduct;
  score: number;
  matchType: DirectMatchType;
  matchedField: string;
}

export interface SmartTypoMatch {
  product: LocalProduct;
  score: number;
  matchedWord: string;
  suggestedWord: string;
  matchReason: string;
}

export interface SmartSearchResult {
  query: string;
  directMatches: SmartDirectMatch[];
  typoMatches: SmartTypoMatch[];
  allRanked: LocalProduct[];
  hasMatches: boolean;
}

/**
 * Smart Search Engine for Akwaaba POS:
 * 1. Prioritizes exact, prefix, and substring matches (Direct Matches).
 * 2. Identifies typo and mistake patterns (missing vowels, transposed letters, off-by-one spelling).
 * 3. Guarantees that direct matches (e.g. a product named "Kvo...") appear strictly above
 *    fuzzy/typo-tolerant matches (e.g. "Kivo gari").
 */
export function performSmartSearch(
  products: LocalProduct[],
  rawQuery: string,
  categoryFilter: string = 'ALL'
): SmartSearchResult {
  const query = rawQuery.trim().toLowerCase();

  // If no search query, return products filtered by category
  if (!query) {
    const list = categoryFilter === 'ALL'
      ? products
      : products.filter(p => p.category === categoryFilter);

    return {
      query: '',
      directMatches: list.map(p => ({
        product: p,
        score: 100,
        matchType: 'NAME_CONTAINS',
        matchedField: p.name,
      })),
      typoMatches: [],
      allRanked: list,
      hasMatches: list.length > 0,
    };
  }

  // Filter pool by category if specified
  const pool = categoryFilter === 'ALL'
    ? products
    : products.filter(p => p.category === categoryFilter);

  const directMatches: SmartDirectMatch[] = [];
  const directProductIds = new Set<string>();

  // PHASE 1: DIRECT / EXACT / PREFIX MATCHES
  for (const product of pool) {
    const nameLower = (product.name || '').toLowerCase();
    const localLower = (product.localName || '').toLowerCase();
    const skuLower = (product.sku || '').toLowerCase();
    const barcode = product.barcode || '';

    // 1. Exact Barcode Match
    if (barcode === query) {
      directMatches.push({ product, score: 1000, matchType: 'BARCODE_EXACT', matchedField: product.barcode });
      directProductIds.add(product.id);
      continue;
    }

    // 2. Barcode Prefix
    if (barcode.startsWith(query)) {
      directMatches.push({ product, score: 900, matchType: 'BARCODE_PREFIX', matchedField: product.barcode });
      directProductIds.add(product.id);
      continue;
    }

    // 3. Exact SKU Match
    if (skuLower === query) {
      directMatches.push({ product, score: 850, matchType: 'SKU_EXACT', matchedField: product.sku });
      directProductIds.add(product.id);
      continue;
    }

    // 4. Product Name starts with query (e.g. "Kvo..." for query "kvo")
    if (nameLower.startsWith(query)) {
      directMatches.push({ product, score: 800, matchType: 'NAME_STARTS_WITH', matchedField: product.name });
      directProductIds.add(product.id);
      continue;
    }

    // 5. Word inside Product Name starts with query (e.g. "Mix Kvo" for "kvo")
    const words = nameLower.split(/[\s,.-]+/);
    if (words.some(w => w.startsWith(query))) {
      directMatches.push({ product, score: 700, matchType: 'WORD_STARTS_WITH', matchedField: product.name });
      directProductIds.add(product.id);
      continue;
    }

    // 6. Name contains query substring
    if (nameLower.includes(query)) {
      directMatches.push({ product, score: 600, matchType: 'NAME_CONTAINS', matchedField: product.name });
      directProductIds.add(product.id);
      continue;
    }

    // 7. SKU contains query
    if (skuLower.includes(query)) {
      directMatches.push({ product, score: 550, matchType: 'SKU_CONTAINS', matchedField: product.sku });
      directProductIds.add(product.id);
      continue;
    }

    // 8. Local name contains query
    if (localLower && localLower.includes(query)) {
      directMatches.push({ product, score: 500, matchType: 'LOCAL_NAME_CONTAINS', matchedField: product.localName || '' });
      directProductIds.add(product.id);
      continue;
    }
  }

  // Sort direct matches descending by score
  directMatches.sort((a, b) => b.score - a.score);

  // PHASE 2: TYPO / MISTAKE PATTERN MATCHES (for products not matched in Phase 1)
  const typoMatches: SmartTypoMatch[] = [];

  // Only run fuzzy/typo matching if query is at least 2 characters long
  if (query.length >= 2) {
    const qConsonants = getConsonants(query);

    for (const product of pool) {
      if (directProductIds.has(product.id)) continue;

      const nameLower = (product.name || '').toLowerCase();
      const localLower = (product.localName || '').toLowerCase();
      const allWords = [
        ...nameLower.split(/[\s,.-]+/).filter(w => w.length >= 2),
        ...localLower.split(/[\s,.-]+/).filter(w => w.length >= 2),
      ];

      let bestScore = 0;
      let matchedWord = '';
      let suggestedWord = '';
      let reason = '';

      for (const word of allWords) {
        // Condition A: Damerau-Levenshtein Distance
        // For short words (len <= 4), distance must be <= 1 (e.g. "kvo" -> "kivo" = 1)
        // For longer words (len >= 5), distance can be <= 2 (e.g. "panadoll" -> "panadol" = 1, "frytol" -> "fritol" = 1)
        const maxDist = word.length <= 4 ? 1 : 2;
        const dist = damerauLevenshtein(query, word);

        if (dist <= maxDist) {
          const score = 100 - (dist * 20);
          if (score > bestScore) {
            bestScore = score;
            matchedWord = query;
            suggestedWord = word;
            reason = dist === 1 ? `Close spelling to "${word}"` : `Typo pattern matching "${word}"`;
          }
        }

        // Condition B: Prefix typo (e.g. user typed 3 letters of a 6 letter word with 1 typo)
        if (query.length >= 3 && word.length >= query.length) {
          const prefixDist = damerauLevenshtein(query, word.slice(0, query.length));
          if (prefixDist === 1) {
            const score = 75;
            if (score > bestScore) {
              bestScore = score;
              matchedWord = query;
              suggestedWord = word;
              reason = `Possible match for "${word}"`;
            }
          }
        }

        // Condition C: Subsequence / Omitted Characters (e.g. "kvo" in "kivo", "fnygo" in "fanyogo")
        if (query.length >= 3 && isSubsequence(query, word)) {
          const gap = word.length - query.length;
          if (gap <= 3) {
            const score = 70 - gap * 5;
            if (score > bestScore) {
              bestScore = score;
              matchedWord = query;
              suggestedWord = word;
              reason = `Omitted characters matching "${word}"`;
            }
          }
        }

        // Condition D: Consonant Skeleton Match (e.g. "kv" matches "kivo" -> "kv")
        if (qConsonants.length >= 2) {
          const wordConsonants = getConsonants(word);
          if (qConsonants === wordConsonants || wordConsonants.startsWith(qConsonants)) {
            const score = 65;
            if (score > bestScore) {
              bestScore = score;
              matchedWord = query;
              suggestedWord = word;
              reason = `Sound-alike phonetic match for "${word}"`;
            }
          }
        }
      }

      if (bestScore >= 50) {
        // Capitalize suggested word properly from product name if possible
        const properWord = product.name.split(/[\s,.-]+/).find(w => w.toLowerCase() === suggestedWord.toLowerCase()) || suggestedWord;
        typoMatches.push({
          product,
          score: bestScore,
          matchedWord,
          suggestedWord: properWord,
          matchReason: reason,
        });
      }
    }
  }

  // Sort typo matches descending by score
  typoMatches.sort((a, b) => b.score - a.score);

  // Combine: All Direct Matches FIRST, followed by Typo Matches
  const allRanked = [
    ...directMatches.map(m => m.product),
    ...typoMatches.map(m => m.product),
  ];

  return {
    query,
    directMatches,
    typoMatches,
    allRanked,
    hasMatches: allRanked.length > 0,
  };
}
