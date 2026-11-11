/**
 * Monochrome SVG replacement for the ↗ Unicode arrow, which iOS Safari
 * can otherwise render as a colorful emoji glyph (blue square).
 */
export default function ArrowUpRight() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "inline-block", verticalAlign: "-0.12em", marginLeft: "0.12em", flexShrink: 0 }}
    >
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}
