// Line-art SVGs: 2.5px round strokes, black on light, one filled accent.
const S = { fill: "none", stroke: "#0a0a0a", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function PassportHero({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 140" className={className} aria-hidden>
      <rect x="34" y="14" width="84" height="104" rx="10" fill="#fff" {...S} />
      <path d="M50 40h42M50 56h52M50 72h30" {...S} />
      <rect x="98" y="84" width="40" height="22" rx="11" fill="#fff" {...S} />
      <rect x="124" y="84" width="40" height="22" rx="11" fill="#fff" {...S} />
      <rect x="150" y="84" width="34" height="22" rx="11" fill="#0a0a0a" stroke="#0a0a0a" strokeWidth="2.5" />
      <circle cx="132" cy="38" r="18" fill="#0a0a0a" />
      <path d="M123 38l7 7 12-14" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M170 24v10M165 29h10M22 100v8M18 104h8" {...S} strokeWidth={2} />
    </svg>
  );
}

export function EmptyBook({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 90" className={className} aria-hidden>
      <path d="M12 22c16-6 32-4 48 6 16-10 32-12 48-6v52c-16-6-32-4-48 6-16-10-32-12-48-6z" fill="#fff" {...S} />
      <path d="M60 28v52" {...S} />
      <path d="M24 36c8-2 16-1 24 3M24 50c8-2 16-1 24 3M72 39c8-4 16-5 24-3M72 53c8-4 16-5 24-3" {...S} strokeWidth={2} />
    </svg>
  );
}
