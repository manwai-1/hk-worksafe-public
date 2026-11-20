import type { ReactNode } from "react";

const URL_PATTERN = /https?:\/\/[^\s<>「」『』]+/g;

function trimTrailingPunctuation(url: string): { href: string; rest: string } {
  let href = url;
  let rest = "";
  while (/[),.;:，。；、）]$/.test(href)) {
    rest = href.slice(-1) + rest;
    href = href.slice(0, -1);
  }
  return { href, rest };
}

export function LinkText({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0;
    if (start > cursor) nodes.push(text.slice(cursor, start));
    const { href, rest } = trimTrailingPunctuation(match[0]);
    nodes.push(
      <a key={`${start}-${href}`} href={href} target="_blank" rel="noopener noreferrer">
        {href}
        <span className="sr-only">（在新分頁開啟）</span>
      </a>,
    );
    if (rest) nodes.push(rest);
    cursor = start + match[0].length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}
