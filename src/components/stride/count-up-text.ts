const numberPattern = /\d{1,3}(?:[\u202f\u00a0]\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g;

function formatLike(source: string, value: number, fixedWidth: boolean) {
  const [whole, fraction] = source.split(",");
  const digits = fraction?.length ?? 0;
  const separator = /[\u202f\u00a0]/.exec(whole)?.[0];
  const fixed = value.toFixed(digits);
  const [integer, decimals] = fixed.split(".");
  const padded = fixedWidth ? integer.padStart(whole.length, "0") : integer;
  const grouped = separator
    ? padded.replace(/\B(?=(\d{3})+(?!\d))/g, separator)
    : padded;
  return decimals ? `${grouped},${decimals}` : grouped;
}

function parse(source: string) {
  return Number(source.replace(/[\u202f\u00a0]/g, "").replace(",", "."));
}

export function countUpText(text: string, progress: number) {
  if (progress >= 1) return text;
  const eased = 1 - (1 - Math.max(0, progress)) ** 3;
  return text.replace(numberPattern, (match, offset: number) =>
    formatLike(
      match,
      parse(match) * eased,
      /^0\d/.test(match) || /[h:]$/.test(text.slice(0, offset)),
    ),
  );
}
