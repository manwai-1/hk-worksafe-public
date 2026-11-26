import type { ReactNode } from "react";
import { linkSegments } from "./links";
import { dateFragments } from "./period";

export function DateText({ value }: { value: string }) {
  const parts = dateFragments(value);
  return (
    <span className="date-value">
      {parts.map((part, index) => (
        <span key={`${part.kind}-${index}`} className={part.kind === "token" ? "date-token" : "date-note"}>
          {part.text}
        </span>
      ))}
    </span>
  );
}

export function LinkText({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  linkSegments(text).forEach((segment, index) => {
    if (segment.kind === "text") {
      nodes.push(segment.text);
      return;
    }
    nodes.push(
      <a key={`${index}-${segment.href}`} href={segment.href} target="_blank" rel="noopener noreferrer">
        {segment.href}
        <span className="sr-only">（在新分頁開啟）</span>
      </a>,
    );
  });
  return <>{nodes}</>;
}
