import React from 'react'
import {
  BadgeCheck,
  Ban,
  Building2,
  CalendarDays,
  Check,
  ClipboardList,
  Droplets,
  FileBarChart2,
  FileText,
  FolderOpen,
  Handshake,
  HardDrive,
  KeyRound,
  MapPin,
  PencilLine,
  RefreshCw,
  Search,
  Ticket,
  User,
  Users,
  Wrench,
  type LucideProps,
} from 'lucide-react'

const iconBySymbol: Record<string, React.ComponentType<LucideProps>> = {
  '✅': BadgeCheck,
  '✓': Check,
  '❌': Ban,
  '✗': Ban,
  '🏛️': Building2,
  '📅': CalendarDays,
  '📋': ClipboardList,
  '📝': PencilLine,
  '📜': FileText,
  '📊': FileBarChart2,
  '💰': FileText,
  '👤': User,
  '👥': Users,
  '📍': MapPin,
  '🎫': Ticket,
  '🔧': Wrench,
  '🛠️': Wrench,
  '🔍': Search,
  '💧': Droplets,
  '🔄': RefreshCw,
  '🧾': FileText,
  '🤝': Handshake,
  '💾': HardDrive,
  '📁': FolderOpen,
  '🔑': KeyRound,
}

type Props = {
  symbol?: string
  className?: string
}

export function EmojiIcon({ symbol, className = 'h-4 w-4 text-muted-foreground' }: Props) {
  const Icon = (symbol && iconBySymbol[symbol]) || FileText
  return <Icon className={className} aria-hidden="true" />
}
