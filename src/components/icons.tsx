import type { LucideProps } from 'lucide-react'
import {
  ChartNoAxesCombined,
  Heart,
  LocateFixed,
  Map,
  Minus,
  Plus,
  QrCode,
  RefreshCw,
  Scan,
  School,
  Settings,
  Users,
  X,
} from 'lucide-react'

export type IconProps = LucideProps

// Keep the app's semantic icon names stable while using one consistent icon set.
// Callers can continue to control size, color, classes, and accessibility.
export function MapIcon(props: IconProps) {
  return <Map {...props} />
}

export function HeartIcon(props: IconProps) {
  return <Heart {...props} />
}

export function LocateIcon(props: IconProps) {
  return <LocateFixed {...props} />
}

export function SettingsIcon(props: IconProps) {
  return <Settings {...props} />
}

export function UsersIcon(props: IconProps) {
  return <Users {...props} />
}

export function RefreshIcon(props: IconProps) {
  return <RefreshCw {...props} />
}

export function QrCodeIcon(props: IconProps) {
  return <QrCode {...props} />
}

export function CampusIcon(props: IconProps) {
  return <School {...props} />
}

export function MonitorIcon(props: IconProps) {
  return <ChartNoAxesCombined {...props} />
}

export function PlusIcon(props: IconProps) {
  return <Plus {...props} />
}

export function MinusIcon(props: IconProps) {
  return <Minus {...props} />
}

export function FitIcon(props: IconProps) {
  return <Scan {...props} />
}

export function XIcon(props: IconProps) {
  return <X {...props} />
}
