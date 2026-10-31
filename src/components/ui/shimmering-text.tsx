"use client";

import type { CSSProperties } from "react";

const SHIMMER_STYLES = `
  .ai-shimmer {
    --base-color: var(--muted-foreground);
    --shimmer-color: var(--foreground);
    position: relative;
    display: inline-block;
    color: transparent;
    background-color: var(--base-color);
    background-image:
      linear-gradient(90deg, transparent calc(50% - var(--spread)), var(--shimmer-color), transparent calc(50% + var(--spread))),
      linear-gradient(var(--base-color), var(--base-color));
    background-size: 250% 100%, auto;
    background-repeat: no-repeat, no-repeat;
    background-position: 100% center, 0 0;
    -webkit-background-clip: text;
    background-clip: text;
    opacity: 0;
    animation: ai-shimmer 2.5s linear infinite, ai-shimmer-fade-in 0.3s ease-out forwards;
  }

  :root:not(.dark) .ai-shimmer {
    --base-color: color-mix(in oklch, var(--muted-foreground) 72%, var(--foreground));
  }

  @keyframes ai-shimmer {
    0% { background-position: 100% center, 0 0; }
    80%, 100% { background-position: 0% center, 0 0; }
  }

  @keyframes ai-shimmer-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    .ai-shimmer {
      animation: none;
      opacity: 1;
      color: var(--base-color);
      background: none;
    }
  }
`;

export function ShimmeringText({ text, className }: { text: string; className?: string }) {
  const style = { "--spread": `${text.length * 2}px` } as CSSProperties;

  return (
    <>
      <style>{SHIMMER_STYLES}</style>
      <span className={`ai-shimmer text-sm font-medium ${className ?? ""}`} style={style}>
        {text}
      </span>
    </>
  );
}
