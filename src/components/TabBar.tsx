"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconCamera,
  IconDashboard,
  IconDumbbell,
  IconScale,
  IconTimeline,
} from "./Icons";

const TABS = [
  { href: "/", label: "Home", Icon: IconDashboard, match: (p: string) => p === "/" },
  {
    href: "/workout",
    label: "Workout",
    Icon: IconDumbbell,
    match: (p: string) => p.startsWith("/workout"),
  },
  {
    href: "/timeline",
    label: "Timeline",
    Icon: IconTimeline,
    match: (p: string) => p.startsWith("/timeline"),
  },
  {
    href: "/body",
    label: "Body",
    Icon: IconScale,
    match: (p: string) => p.startsWith("/body"),
  },
  {
    href: "/photos",
    label: "Photos",
    Icon: IconCamera,
    match: (p: string) => p.startsWith("/photos"),
  },
];

export function TabBar() {
  const pathname = usePathname() || "/";
  return (
    <nav className="tabbar no-select" aria-label="Primary">
      {TABS.map(({ href, label, Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            className={`tab${active ? " tab-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <div className="tab-icon-wrap">
              <Icon />
            </div>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
