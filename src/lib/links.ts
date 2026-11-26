const URL_PATTERN = /https?:\/\/[^\s<>「」『』（）]+/g;

function trimTrailingPunctuation(url: string): { href: string; rest: string } {
  let href = url;
  let rest = "";
  while (/[),.;:，。；、）]$/.test(href)) {
    rest = href.slice(-1) + rest;
    href = href.slice(0, -1);
  }
  return { href, rest };
}

export type LinkSegment = { kind: "text"; text: string } | { kind: "link"; href: string };

export function linkSegments(text: string): LinkSegment[] {
  const nodes: LinkSegment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0;
    if (start > cursor) nodes.push({ kind: "text", text: text.slice(cursor, start) });
    const { href, rest } = trimTrailingPunctuation(match[0]);
    nodes.push({ kind: "link", href });
    if (rest) nodes.push({ kind: "text", text: rest });
    cursor = start + match[0].length;
  }
  if (cursor < text.length) nodes.push({ kind: "text", text: text.slice(cursor) });
  return nodes;
}
