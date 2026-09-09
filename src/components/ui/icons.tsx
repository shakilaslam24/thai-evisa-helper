import type { SVGProps } from "react";

/**
 * The design-owned icon set. One consistent 24px grid, 1.6px stroke, round
 * caps — so icons read as one family rather than a mixed bag. Content editors
 * pick from these keys; they cannot introduce off-brand artwork.
 */

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

function Svg({ title, children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={20}
      height={20}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export const IconVisa = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <path d="M3 9h18" />
    <circle cx="8.5" cy="13.5" r="1.75" />
    <path d="M13 13h5M13 16h3" />
  </Svg>
);

export const IconTour = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3.6 9h16.8M3.6 15h16.8" />
    <path d="M12 3c2.4 2.6 3.6 5.6 3.6 9s-1.2 6.4-3.6 9c-2.4-2.6-3.6-5.6-3.6-9S9.6 5.6 12 3Z" />
  </Svg>
);

export const IconPlane = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 15.5 3 10.2V7.6l2.2.6 1.5 1.6 4.4 1.3V5.4L13.4 3v8.7l5.2 1.5c1.3.4 2.4.9 2.4 1.6Z" />
    <path d="M6 19h12" />
  </Svg>
);

export const IconHotel = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 20V6.5a1.5 1.5 0 0 1 1.5-1.5h10A1.5 1.5 0 0 1 16 6.5V20" />
    <path d="M16 11h3.5A1.5 1.5 0 0 1 21 12.5V20" />
    <path d="M2 20h20" />
    <path d="M6.5 9h2M6.5 13h2M11 9h2M11 13h2" />
  </Svg>
);

export const IconHandshake = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8.5 12.5 11 15l1.6-1.6 2.4 2.4" />
    <path d="m2.5 10.5 4-4 3 1 3-1 3 1 4 4" />
    <path d="M6.5 6.5v7l3.5 3.5 2 2 2-2 3.5-3.5v-7" />
  </Svg>
);

export const IconShield = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3 5 6v5.5c0 4 2.9 7.6 7 9.5 4.1-1.9 7-5.5 7-9.5V6l-7-3Z" />
    <path d="m9 12 2 2 4-4" />
  </Svg>
);

export const IconCompass = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2 5.2-5.2 2 2-5.2 5.2-2Z" />
  </Svg>
);

export const IconUsers = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8.5" r="3.2" />
    <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
    <path d="M16 6.2a3.2 3.2 0 0 1 0 6.1" />
    <path d="M17.6 14.6a5.5 5.5 0 0 1 3 4.9" />
  </Svg>
);

export const IconSparkle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5c.6 3.6 1.9 4.9 5.5 5.5-3.6.6-4.9 1.9-5.5 5.5-.6-3.6-1.9-4.9-5.5-5.5 3.6-.6 4.9-1.9 5.5-5.5Z" />
    <path d="M18.5 15.5c.3 1.7.9 2.3 2.6 2.6-1.7.3-2.3.9-2.6 2.6-.3-1.7-.9-2.3-2.6-2.6 1.7-.3 2.3-.9 2.6-2.6Z" />
  </Svg>
);

export const IconClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5.2l3.2 1.9" />
  </Svg>
);

export const IconDocument = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6M9 16.5h4" />
  </Svg>
);

export const IconPhone = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.4 3.5h2.9l1.5 3.7-1.9 1.4a11.4 11.4 0 0 0 5.5 5.5l1.4-1.9 3.7 1.5v2.9a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.4 5.7a2 2 0 0 1 2-2.2Z" />
  </Svg>
);

export const IconMail = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3.8 6.5 8.2 6 8.2-6" />
  </Svg>
);

export const IconPin = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21.5s7-5.9 7-11.1a7 7 0 1 0-14 0c0 5.2 7 11.1 7 11.1Z" />
    <circle cx="12" cy="10.2" r="2.6" />
  </Svg>
);

export const IconArrowRight = (p: IconProps) => (
  <Svg width={16} height={16} {...p}>
    <path d="M4 12h15" />
    <path d="m13 6 6 6-6 6" />
  </Svg>
);

export const IconChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Svg>
);

export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Svg>
);

export const IconMenu = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
);

export const IconMinus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14" />
  </Svg>
);

/** WhatsApp glyph — filled, since the brand mark is not a stroke drawing. */
export const IconWhatsApp = ({ title, ...props }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={20}
    height={20}
    aria-hidden={title ? undefined : true}
    role={title ? "img" : undefined}
    {...props}
  >
    {title ? <title>{title}</title> : null}
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.17c-.25-.13-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.8-.78.97-.15.16-.29.19-.53.06-.25-.12-1.05-.38-1.99-1.23-.74-.65-1.23-1.46-1.38-1.71-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.09-.16.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.84-.2-.49-.4-.42-.56-.43h-.47c-.17 0-.43.06-.66.31-.22.25-.87.85-.87 2.07s.9 2.4 1.02 2.57c.12.16 1.75 2.67 4.25 3.75.59.25 1.06.41 1.42.52.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.19.21-.58.21-1.08.14-1.19-.06-.11-.22-.17-.47-.29Z" />
  </svg>
);

export const ICON_MAP = {
  visa: IconVisa,
  tour: IconTour,
  plane: IconPlane,
  hotel: IconHotel,
  b2b: IconHandshake,
  shield: IconShield,
  compass: IconCompass,
  users: IconUsers,
  sparkle: IconSparkle,
  clock: IconClock,
  document: IconDocument,
} as const;

export type IconKey = keyof typeof ICON_MAP;
export const ICON_KEYS = Object.keys(ICON_MAP) as IconKey[];

export function Icon({ name, ...props }: { name: string } & IconProps) {
  const Component = ICON_MAP[name as IconKey] ?? IconSparkle;
  return <Component {...props} />;
}
