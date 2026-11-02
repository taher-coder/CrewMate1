"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Briefcase, User } from "lucide-react";

const TABS = [
  { href: "/worker", label: "Home", Icon: Home },
  { href: "/worker/jobs", label: "Jobs", Icon: Briefcase },
  { href: "/worker/profile", label: "Profile", Icon: User },
];

export function WorkerNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-black/5 bg-warm-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-md">
        {TABS.map(({ href, label, Icon }) => {
          const active =
            href === "/worker" ? pathname === "/worker" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="group flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium"
            >
              <Icon
                size={21}
                strokeWidth={active ? 2.3 : 1.8}
                className={active ? "text-forest" : "text-muted group-hover:text-charcoal"}
              />
              <span className={active ? "text-forest" : "text-muted"}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
