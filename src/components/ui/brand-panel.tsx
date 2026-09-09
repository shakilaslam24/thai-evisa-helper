/**
 * Brand panel — the designed stand-in for photography.
 *
 * Every image on this site is a CMS field. Rather than shipping stock photos
 * (invented content, and a licensing risk), an unset image renders this: a deep
 * navy field with a horizon glow and a flight path drawn from the logo's wing
 * geometry, plus a single gold aircraft mark. The page looks finished before a
 * photo is uploaded, and better afterwards.
 *
 * Pure inline SVG — no image request, a few hundred bytes, and it scales to any
 * aspect ratio without a crop.
 */

type Props = {
  /** Varies the composition so repeated panels don't look identical. */
  seed?: number;
  className?: string;
  /** Optional short label, e.g. a country name. */
  label?: string;
  tone?: "navy" | "light";
};

/** Three flight paths, offset per seed so a grid of panels stays varied. */
const PATHS = [
  "M-60 268 C 120 214, 300 150, 500 52",
  "M-60 300 C 140 258, 320 196, 500 104",
  "M-60 336 C 160 302, 340 248, 500 162",
];

export function BrandPanel({ seed = 0, className = "", label, tone = "navy" }: Props) {
  const variant = Math.abs(seed) % 3;
  const shift = variant * 26;
  const isLight = tone === "light";

  const ink = isLight ? "#101f40" : "#ffffff";
  const field = isLight ? "#f6f4f0" : "#101f40";
  const glow = isLight ? "#ffffff" : "#1c2e50";
  const gold = "#c19864";
  const uid = `df-panel-${variant}-${isLight ? "l" : "d"}`;

  // The panel is always a fill layer inside a sized, positioned container (the
  // hero's visual column, a card's aspect box). Owning `absolute inset-0` here
  // means a caller never has to pass a position that would collide with a base
  // class — which silently collapsed the panel to zero height.
  return (
    <div
      className={`absolute inset-0 isolate overflow-hidden ${className}`}
      style={{ backgroundColor: field }}
    >
      <svg
        viewBox="0 0 440 300"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          {/* Paths fade in from the left so they read as motion, not as rules */}
          <linearGradient id={`${uid}-fade`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={ink} stopOpacity="0" />
            <stop offset="38%" stopColor={ink} stopOpacity="0.85" />
            <stop offset="100%" stopColor={ink} stopOpacity="0.08" />
          </linearGradient>
          <radialGradient id={`${uid}-glow`} cx="0.72" cy="0.18" r="0.78">
            <stop offset="0%" stopColor={glow} stopOpacity={isLight ? "1" : "0.95"} />
            <stop offset="100%" stopColor={glow} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Horizon glow, anchored top-right */}
        <rect x="0" y="0" width="440" height="300" fill={`url(#${uid}-glow)`} />

        <g transform={`translate(${-shift * 0.5} ${shift * 0.5})`}>
          {PATHS.map((d, index) => (
            <path
              key={d}
              d={d}
              fill="none"
              stroke={`url(#${uid}-fade)`}
              strokeOpacity={[0.55, 0.3, 0.16][index]}
              strokeWidth={index === 0 ? 1.5 : 1}
            />
          ))}

          {/* The 5% gold: a short lit segment on the leading path, and the
              aircraft sitting at its head */}
          <path
            d={PATHS[0]}
            fill="none"
            stroke={gold}
            strokeOpacity="0.9"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="46 999"
            strokeDashoffset="-372"
          />
          <g transform="translate(462 46) rotate(-27)" fill={gold}>
            <path d="M0 0 -13 4.4 -13 1.6 -4 -1.2 -13 -4 -13 -6.8 0 -2.4 Z" opacity="0.95" />
          </g>
        </g>

        {/* Grounding wash at the foot so overlaid text always has contrast */}
        <rect
          x="0"
          y="180"
          width="440"
          height="120"
          fill={field}
          opacity={isLight ? "0.5" : "0.42"}
        />
      </svg>

      {label ? (
        <span
          className={`absolute bottom-4 left-4 font-display text-sm font-semibold tracking-tight ${
            isLight ? "text-navy-900/70" : "text-white/80"
          }`}
        >
          {label}
        </span>
      ) : null}
    </div>
  );
}
