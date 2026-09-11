"use client";

import { useState } from "react";
import { IconMinus } from "@/components/ui/icons";

type Faq = { id: string; question: string; answer: string };

/**
 * Accordion built on native <details>-style semantics with explicit ARIA, so it
 * works with a keyboard and a screen reader. Only one panel opens at a time,
 * which keeps a long FAQ list scannable on a phone.
 */
export function FaqList({ faqs }: { faqs: Faq[] }) {
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id ?? null);
  if (faqs.length === 0) return null;

  return (
    <div className="border-t border-line">
      {faqs.map((faq) => {
        const isOpen = openId === faq.id;
        return (
          <div key={faq.id} className="border-b border-line">
            <h3>
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : faq.id)}
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${faq.id}`}
                id={`faq-button-${faq.id}`}
                className="flex w-full items-start justify-between gap-5 py-5 text-left font-display text-[1.0625rem] font-semibold tracking-[-0.015em] text-ink transition-colors hover:text-gold-600"
              >
                <span>{faq.question}</span>
                <span
                  className={`relative mt-1 flex h-5 w-5 shrink-0 items-center justify-center text-gold-500 transition-transform duration-300 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                >
                  <IconMinus width={16} height={16} />
                  <IconMinus
                    width={16}
                    height={16}
                    className={`absolute rotate-90 transition-opacity duration-300 ${
                      isOpen ? "opacity-0" : "opacity-100"
                    }`}
                  />
                </span>
              </button>
            </h3>

            <div
              id={`faq-panel-${faq.id}`}
              role="region"
              aria-labelledby={`faq-button-${faq.id}`}
              hidden={!isOpen}
              className="pb-6 pr-10 text-[0.9375rem] leading-relaxed text-ink-muted"
            >
              {faq.answer.split(/\n{2,}/).map((paragraph, index) => (
                <p key={index} className={index > 0 ? "mt-3" : undefined}>
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
