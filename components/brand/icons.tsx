/**
 * Line-icon set for the client app. Stroke icons on `currentColor`, sized by the
 * `className` (default 1.125rem). Inline (no icon dependency) so they inherit the
 * theme colours and tree-shake to nothing. Matches the promoter/admin icon style
 * (viewBox 24, strokeWidth 1.7) so the three apps read as one product.
 */
type IconProps = { className?: string };
const box = (className = 'h-[18px] w-[18px]') => ({
  className,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  xmlns: 'http://www.w3.org/2000/svg',
});

export function IconArrowRight({ className }: IconProps) {
  return (
    <svg {...box(className)}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export function IconArrowLeft({ className }: IconProps) {
  return (
    <svg {...box(className)}>
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </svg>
  );
}

export function IconExternal({ className }: IconProps) {
  return (
    <svg {...box(className)}>
      <path d="M14 5h5v5" />
      <path d="M19 5l-7 7" />
      <path d="M18 13.5V18a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 18V8a1.5 1.5 0 0 1 1.5-1.5H11" />
    </svg>
  );
}

export function IconDownload({ className }: IconProps) {
  return (
    <svg {...box(className)}>
      <path d="M12 4v11" />
      <path d="m8 11 4 4 4-4" />
      <path d="M5 19h14" />
    </svg>
  );
}

export function IconUpload({ className }: IconProps) {
  return (
    <svg {...box(className)}>
      <path d="M12 15V4" />
      <path d="m8 8 4-4 4 4" />
      <path d="M5 19h14" />
    </svg>
  );
}

export function IconCheck({ className }: IconProps) {
  return (
    <svg {...box(className)}>
      <path d="m5 13 4 4 10-11" />
    </svg>
  );
}

export function IconClose({ className }: IconProps) {
  return (
    <svg {...box(className)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function IconPause({ className }: IconProps) {
  return (
    <svg {...box(className)}>
      <path d="M9 5v14M15 5v14" />
    </svg>
  );
}

export function IconRefresh({ className }: IconProps) {
  return (
    <svg {...box(className)}>
      <path d="M20 11a8 8 0 0 0-13.7-4.9L4 8.5" />
      <path d="M4 4v4.5h4.5" />
      <path d="M4 13a8 8 0 0 0 13.7 4.9L20 15.5" />
      <path d="M20 20v-4.5h-4.5" />
    </svg>
  );
}

export function IconSparkle({ className }: IconProps) {
  return (
    <svg {...box(className)}>
      <path d="M12 4l1.7 4.8L18.5 10l-4.8 1.7L12 16.5l-1.7-4.8L5.5 10l4.8-1.5L12 4Z" />
      <path d="M18.5 15.5l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6.6-1.5Z" />
    </svg>
  );
}

export function IconPhone({ className }: IconProps) {
  return (
    <svg {...box(className)}>
      <path d="M6.5 4h3l1.4 3.6-1.8 1.3a11 11 0 0 0 4.9 4.9l1.3-1.8L19 13.5v3a1.5 1.5 0 0 1-1.6 1.5A14.5 14.5 0 0 1 5 6.6 1.5 1.5 0 0 1 6.5 4Z" />
    </svg>
  );
}

export function IconChat({ className }: IconProps) {
  return (
    <svg {...box(className)}>
      <path d="M5 5.5h14A1.5 1.5 0 0 1 20.5 7v7A1.5 1.5 0 0 1 19 15.5H10l-4 3.4V15.5H5A1.5 1.5 0 0 1 3.5 14V7A1.5 1.5 0 0 1 5 5.5Z" />
    </svg>
  );
}

export function IconSun({ className }: IconProps) {
  return (
    <svg {...box(className)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M21.5 12h-2M4.5 12h-2M18.4 5.6l-1.4 1.4M7 17l-1.4 1.4M18.4 18.4 17 17M7 7 5.6 5.6" />
    </svg>
  );
}

export function IconMoon({ className }: IconProps) {
  return (
    <svg {...box(className)}>
      <path d="M20 13.5A8 8 0 1 1 10.5 4a6.2 6.2 0 0 0 9.5 9.5Z" />
    </svg>
  );
}
