export function TitleMark({ kind }: { kind: "watch" | "follow" | "list" | "types" }) {
  const common = { width: 18, height: 18, viewBox: "0 0 18 18", "aria-hidden": true as const, focusable: false as const };
  if (kind === "watch") {
    return (
      <svg {...common}>
        <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="9" cy="9" r="2" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "follow") {
    return (
      <svg {...common}>
        <line x1="9" y1="3" x2="9" y2="15" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="9" cy="3.5" r="1.8" fill="currentColor" />
        <circle cx="9" cy="9" r="1.8" fill="currentColor" />
        <circle cx="9" cy="14.5" r="1.8" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "types") {
    return (
      <svg {...common}>
        <rect x="3" y="10" width="3.2" height="5" rx="0.6" fill="currentColor" />
        <rect x="7.4" y="6" width="3.2" height="9" rx="0.6" fill="currentColor" />
        <rect x="11.8" y="8" width="3.2" height="7" rx="0.6" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <line x1="4" y1="5" x2="14" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="4" y1="9" x2="14" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="4" y1="13" x2="14" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
