/**
 * Inline SVG icon set.
 *
 * Hand-written rather than pulled from a package: the app needs eight glyphs,
 * and a dependency for that would be hard to justify. Every icon inherits
 * `currentColor` and the surrounding font size, so colour and state styling
 * live entirely in CSS.
 */

interface IconProps {
  /** Pixel size of the square viewport. */
  size?: number
  className?: string
}

function Svg({
  size = 20,
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export function MicIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </Svg>
  )
}

export function MicOffIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3a3 3 0 0 1 3 3v5" />
      <path d="M9 8v4a3 3 0 0 0 4.6 2.5" />
      <path d="M5 11a7 7 0 0 0 10.5 6" />
      <path d="M12 18v3" />
      <path d="M4 4l16 16" />
    </Svg>
  )
}

export function StopIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none" />
    </Svg>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  )
}

export function MinusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12h14" />
    </Svg>
  )
}

export function TrashIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
    </Svg>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20 6L9 17l-5-5" />
    </Svg>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.6-3.6" />
    </Svg>
  )
}

export function SendIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </Svg>
  )
}

export function SwapIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 4v13M4 14l3 3 3-3" />
      <path d="M17 20V7M14 10l3-3 3 3" />
    </Svg>
  )
}

/** Indeterminate ring; the spin itself comes from CSS. */
export function SpinnerIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      className={`spinner ${className ?? ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" />
    </svg>
  )
}
