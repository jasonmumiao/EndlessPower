import type React from 'react'

type IconProps = React.SVGProps<SVGSVGElement> & {
  size?: number
}

function BaseIcon({ size = 20, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  )
}

export function MapIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M9 18L3.5 20.5V6L9 3.5L15 6L20.5 3.5V18L15 20.5L9 18Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M9 3.5V18" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M15 6V20.5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </BaseIcon>
  )
}

export function HeartIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </BaseIcon>
  )
}

export function SettingsIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M19.4 15a7.9 7.9 0 0 0 .1-1 7.9 7.9 0 0 0-.1-1l2-1.6-2-3.5-2.4 1a8 8 0 0 0-1.7-1l-.4-2.6H9.1l-.4 2.6a8 8 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.6a7.9 7.9 0 0 0-.1 1c0 .34.03.67.1 1l-2 1.6 2 3.5 2.4-1c.53.4 1.1.73 1.7 1l.4 2.6h5.8l.4-2.6c.6-.27 1.17-.6 1.7-1l2.4 1 2-3.5-2-1.6Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </BaseIcon>
  )
}

export function UsersIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M17 21v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="2" />
      <path
        d="M21 21v-1a4 4 0 0 0-3-3.87"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M16 3.13a4 4 0 0 1 0 7.75"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </BaseIcon>
  )
}

export function RefreshIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M20 12a8 8 0 0 1-14.9 4M4 12a8 8 0 0 1 14.9-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M20 4v6h-6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M4 20v-6h6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </BaseIcon>
  )
}

export function QrCodeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 4h6v6H4V4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14 4h6v6h-6V4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M4 14h6v6H4v-6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14 14h2v2h-2v-2Z" fill="currentColor" />
      <path d="M18 14h2v2h-2v-2Z" fill="currentColor" />
      <path d="M14 18h2v2h-2v-2Z" fill="currentColor" />
      <path d="M18 18h2v2h-2v-2Z" fill="currentColor" />
    </BaseIcon>
  )
}

export function CampusIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M12 3l9 5-9 5-9-5 9-5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M3 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M21 8v8M6 11.5V20h12v-8.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </BaseIcon>
  )
}

export function MonitorIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 19V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 19H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M6 15l4-4 3 3 5-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M18 7h2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </BaseIcon>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </BaseIcon>
  )
}

export function MinusIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </BaseIcon>
  )
}

export function FitIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8 3H3v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 3h5v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 16v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 16v5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </BaseIcon>
  )
}

export function XIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </BaseIcon>
  )
}
