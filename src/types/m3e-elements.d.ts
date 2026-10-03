import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "m3e-loading-indicator": DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & {
          variant?: "uncontained" | "contained";
        },
        HTMLElement
      >;
    }
  }
}

export {};