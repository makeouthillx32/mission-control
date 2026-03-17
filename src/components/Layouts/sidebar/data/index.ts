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
  MicIcon,
  SmartphoneIcon,
  SlidersIcon,
  CpuIcon,
  RadioIcon,
  GitBranchIcon,
  SearchIcon,
  FileTextIcon,
  TerminalIcon,
  BarChart2Icon,
  CalendarIcon,
  WorkflowIcon,
} from "../icons";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  // ── Core ──────────────────────────────────────────────
  { href: "/",           label: "Dashboard",        icon: HomeIcon },
  { href: "/agents",     label: "Agents",            icon: BotIcon },
  { href: "/messages",   label: "Messages",          icon: MessageSquareIcon },
  { href: "/sessions",   label: "Sessions",          icon: HistoryIcon },

  // ── Gateway ───────────────────────────────────────────
  { href: "/models",     label: "Models",            icon: CpuIcon },
  { href: "/channels",   label: "Channels",          icon: RadioIcon },
  { href: "/nodes",      label: "Nodes",             icon: SmartphoneIcon },
  { href: "/voice",      label: "Voice",             icon: MicIcon },

  // ── Workspace ─────────────────────────────────────────
  { href: "/files",      label: "Files",             icon: FolderOpenIcon },
  { href: "/memory",     label: "Memory",            icon: BrainIcon },
  { href: "/skills",     label: "Skills",            icon: PuzzleIcon },
  { href: "/git",        label: "Git",               icon: GitBranchIcon },
  { href: "/terminal",   label: "Terminal",          icon: TerminalIcon },

  // ── Automation ────────────────────────────────────────
  { href: "/cron",       label: "Cron Jobs",         icon: ClockIcon },
  { href: "/workflows",  label: "Workflows",         icon: WorkflowIcon },
  { href: "/calendar",   label: "Calendar",          icon: CalendarIcon },

  // ── Observability ─────────────────────────────────────
  { href: "/activity",   label: "Activity",          icon: ActivityIcon },
  { href: "/logs",       label: "Logs",              icon: FileTextIcon },
  { href: "/analytics",  label: "Analytics",         icon: BarChart2Icon },
  { href: "/costs",      label: "Costs",             icon: DollarSignIcon },
  { href: "/reports",    label: "Reports",           icon: FileTextIcon },
  { href: "/search",     label: "Search",            icon: SearchIcon },

  // ── System ────────────────────────────────────────────
  { href: "/system",     label: "System Monitor",    icon: MonitorIcon },
  { href: "/config",     label: "Config",            icon: SlidersIcon },
  { href: "/office",     label: "Office",            icon: Building2Icon },
  { href: "/settings",   label: "Settings",          icon: SettingsIcon },
];