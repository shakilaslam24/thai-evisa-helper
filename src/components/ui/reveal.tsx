"use client";
import { useEffect, useRef, type ElementType, type ReactNode } from "react";

/**
 * A single, small scroll reveal — fade plus a 14px rise, once.
 *
 * Uses IntersectionObserver directly rather than an animation library: it is
 * ~20 lines, ships no JavaScript to pages that don't use it, and honours
 * prefers-reduced-motion (the CSS neutralises the transform).
 */
export function Reveal({
  children,
  as: Tag = "div",
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  as?: ElementType;
  delay?: 0 | 1 | 2 | 3;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      node.dataset.visible = "true";
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.visible = "true";
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const delayClass = delay ? ` reveal-delay-${delay}` : "";
  return (
    <Tag ref={ref} className={`reveal${delayClass} ${className}`}>
      {children}
    </Tag>
  );
}
