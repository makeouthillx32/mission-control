// src/components/Layouts/sidebar/data/index.ts

import type { LucideIcon } from "lucide-react";
import {
  HomeIcon,
  MonitorIcon,
  FolderOpenIcon,
  BrainIcon,
  BotIcon,
  Building2Icon,
  MessageSquareIcon,
  ActivityIcon,
  ClockIcon,
  PuzzleIcon,
  DollarSignIcon,
  SettingsIcon,
  HistoryIcon,
} from "../icons";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/",         label: "Dashboard",        icon: HomeIcon },
  { href: "/system",   label: "System Monitor",   icon: MonitorIcon },
  { href: "/files",    label: "Files",             icon: FolderOpenIcon },
  { href: "/memory",   label: "Memory",            icon: BrainIcon },
  { href: "/agents",   label: "Agents",            icon: BotIcon },
  { href: "/office",   label: "Office",            icon: Building2Icon },
  { href: "/messages", label: "Messages",          icon: MessageSquareIcon },
  { href: "/activity", label: "Activity",          icon: ActivityIcon },
  { href: "/cron",     label: "Cron Jobs",         icon: ClockIcon },
  { href: "/sessions", label: "Sessions",          icon: HistoryIcon },
  { href: "/skills",   label: "Skills",            icon: PuzzleIcon },
  { href: "/costs",    label: "Costs & Analytics", icon: DollarSignIcon },
  { href: "/settings", label: "Settings",          icon: SettingsIcon },
];