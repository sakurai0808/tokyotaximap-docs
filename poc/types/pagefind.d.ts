import type { DetailedHTMLProps, HTMLAttributes } from "react";

type PagefindElement<P = object> = DetailedHTMLProps<
  HTMLAttributes<HTMLElement>,
  HTMLElement
> &
  P;

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "pagefind-input": PagefindElement<{
        placeholder?: string;
        autofocus?: boolean;
      }>;
      "pagefind-summary": PagefindElement;
      "pagefind-results": PagefindElement;
    }
  }
}
