export type MatchRange = { start: number; end: number };

export type TitleMatch = { score: number; ranges: MatchRange[] };

const wordStartScore = 3;
const substringScore = 2;
const typoScore = 1;
const minimumTypoLength = 4;

function foldCharacter(character: string) {
  const base = character.normalize("NFD").charAt(0);
  return base.toLocaleLowerCase("fr-FR").charAt(0) || character;
}

export function foldText(text: string) {
  return Array.from(text, (character) =>
    character.length === 1 ? foldCharacter(character) : character,
  )
    .join("")
    .replace(/’/g, "'");
}

function isWordCharacter(character: string | undefined) {
  return character !== undefined && /[\p{L}\p{N}]/u.test(character);
}

function isWordStart(original: string, folded: string, index: number) {
  if (index === 0) return true;
  const previous = folded[index - 1];
  if (!isWordCharacter(previous)) return true;
  const current = original[index];
  return (
    current !== undefined &&
    current !== current.toLocaleLowerCase("fr-FR") &&
    original[index - 1] === original[index - 1]?.toLocaleLowerCase("fr-FR")
  );
}

export function queryTerms(query: string) {
  return foldText(query)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length > 0);
}

function words(folded: string) {
  const found: MatchRange[] = [];
  const pattern = /[\p{L}\p{N}]+/gu;
  for (const match of folded.matchAll(pattern))
    found.push({ start: match.index, end: match.index + match[0].length });
  return found;
}

function editDistance(left: string, right: string) {
  const rows = left.length + 1;
  const columns = right.length + 1;
  const table: number[][] = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) =>
      row === 0 ? column : column === 0 ? row : 0,
    ),
  );
  for (let row = 1; row < rows; row += 1)
    for (let column = 1; column < columns; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      let best = Math.min(
        table[row - 1]![column]! + 1,
        table[row]![column - 1]! + 1,
        table[row - 1]![column - 1]! + cost,
      );
      if (
        row > 1 &&
        column > 1 &&
        left[row - 1] === right[column - 2] &&
        left[row - 2] === right[column - 1]
      )
        best = Math.min(best, table[row - 2]![column - 2]! + 1);
      table[row]![column] = best;
    }
  return table[left.length]![right.length]!;
}

function exactTerm(
  original: string,
  folded: string,
  term: string,
): { score: number; range: MatchRange } | null {
  let substring: MatchRange | null = null;
  let index = folded.indexOf(term);
  while (index !== -1) {
    const range = { start: index, end: index + term.length };
    if (isWordStart(original, folded, index))
      return { score: wordStartScore, range };
    substring ??= range;
    index = folded.indexOf(term, index + 1);
  }
  return substring ? { score: substringScore, range: substring } : null;
}

function typoTerm(
  folded: string,
  term: string,
): { score: number; range: MatchRange } | null {
  if (term.length < minimumTypoLength) return null;
  for (const word of words(folded)) {
    const text = folded.slice(word.start, word.end);
    for (const length of [term.length, term.length - 1, term.length + 1]) {
      if (length < minimumTypoLength - 1 || length > text.length) continue;
      if (editDistance(term, text.slice(0, length)) <= 1)
        return {
          score: typoScore,
          range: { start: word.start, end: word.start + length },
        };
    }
  }
  return null;
}

function mergeRanges(ranges: MatchRange[]) {
  const sorted = [...ranges].sort((left, right) => left.start - right.start);
  const merged: MatchRange[] = [];
  for (const range of sorted) {
    const last = merged.at(-1);
    if (last && range.start <= last.end)
      last.end = Math.max(last.end, range.end);
    else merged.push({ ...range });
  }
  return merged;
}

export function matchTitle(title: string, terms: string[]): TitleMatch | null {
  if (terms.length === 0) return null;
  const folded = foldText(title);
  let score = 0;
  const ranges: MatchRange[] = [];
  for (const term of terms) {
    const found = exactTerm(title, folded, term) ?? typoTerm(folded, term);
    if (!found) return null;
    score += found.score;
    ranges.push(found.range);
  }
  return { score: score / terms.length, ranges: mergeRanges(ranges) };
}

export function highlightParts(text: string, ranges: readonly MatchRange[]) {
  const parts: { text: string; match: boolean }[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start > cursor)
      parts.push({ text: text.slice(cursor, range.start), match: false });
    parts.push({ text: text.slice(range.start, range.end), match: true });
    cursor = range.end;
  }
  if (cursor < text.length)
    parts.push({ text: text.slice(cursor), match: false });
  return parts;
}
