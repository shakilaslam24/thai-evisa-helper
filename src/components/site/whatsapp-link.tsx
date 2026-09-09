import { whatsappHref, type WhatsAppContext } from "@/lib/whatsapp";
import { IconWhatsApp } from "@/components/ui/icons";

type Props = {
  /** Digits-only number, always sourced from Global Settings. */
  number: string;
  context?: WhatsAppContext;
  className?: string;
  children?: React.ReactNode;
  showIcon?: boolean;
  ariaLabel?: string;
};

/**
 * The one WhatsApp control used everywhere (brief §17).
 *
 * The number is passed in from Global Settings — never written into a
 * component — and the message is derived from page context. When no number is
 * configured the component renders nothing rather than a dead link.
 */
export function WhatsAppLink({
  number,
  context = { kind: "general" },
  className = "btn btn-primary",
  children = "WhatsApp Us",
  showIcon = true,
  ariaLabel,
}: Props) {
  const href = whatsappHref(number, context);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={
        ariaLabel ?? (typeof children === "string" ? `${children} on WhatsApp` : undefined)
      }
    >
      {showIcon ? <IconWhatsApp width={17} height={17} /> : null}
      {children}
    </a>
  );
}
