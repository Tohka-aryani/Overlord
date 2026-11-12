type OverlordLogoProps = {
  className?: string;
  /** Mark size in rem (default 1.75). */
  size?: number;
  showWordmark?: boolean;
};

/**
 * Custom Overlord mark: geometric crown / overwatch chevron.
 * Intentional industrial heraldry — not a generic AI shield.
 */
export function OverlordLogo({
  className = "",
  size = 1.75,
  showWordmark = true,
}: OverlordLogoProps) {
  const px = `${size}rem`;
  return (
    <span
      className={`inline-flex items-center gap-2.5 ${className}`}
      aria-label="Overlord"
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        className="shrink-0"
      >
        <rect
          x="1"
          y="1"
          width="38"
          height="38"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-[var(--border-strong)]"
        />
        {/* Overwatch chevron */}
        <path
          d="M8 26 L20 10 L32 26"
          stroke="var(--accent)"
          strokeWidth="2.25"
          strokeLinecap="square"
          strokeLinejoin="miter"
          fill="none"
        />
        <path
          d="M12 26 L20 16 L28 26"
          stroke="var(--text)"
          strokeWidth="1.5"
          strokeLinecap="square"
          fill="none"
          opacity="0.55"
        />
        {/* Base bar */}
        <path
          d="M10 30 H30"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="square"
        />
        <circle cx="20" cy="22" r="1.75" fill="var(--accent)" />
      </svg>
      {showWordmark ? (
        <span className="flex flex-col leading-none">
          <span className="font-[family-name:var(--font-display)] text-[0.95rem] font-semibold tracking-[0.18em] text-[var(--text)] uppercase">
            Overlord
          </span>
          <span className="mt-1 font-mono text-[0.58rem] tracking-[0.14em] text-[var(--muted)] uppercase">
            Dark Web Monitoring · MY
          </span>
        </span>
      ) : null}
    </span>
  );
}
