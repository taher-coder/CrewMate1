"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions";
import {
  LayoutDashboard,
  Inbox,
  Briefcase,
  Users,
  Wrench,
  Wallet,
  Star,
  LifeBuoy,
  LogOut,
} from "lucide-react";

const GROUPS = [
  {
    label: "Workspace",
    items: [
      { href: "/company", label: "Dashboard", Icon: LayoutDashboard },
      { href: "/company/requests", label: "Requests", Icon: Inbox },
      { href: "/company/jobs", label: "Jobs", Icon: Briefcase },
    ],
  },
  {
    label: "Team & services",
    items: [
      { href: "/company/workers", label: "Workers", Icon: Users },
      { href: "/company/services", label: "Services", Icon: Wrench },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/company/earnings", label: "Earnings", Icon: Wallet },
      { href: "/company/reviews", label: "Reviews", Icon: Star },
      { href: "/company/support", label: "Support", Icon: LifeBuoy },
    ],
  },
];

export function CompanySidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-col justify-between bg-forest-dark px-3 py-5 text-white/90">
      <div>
        <div className="mb-7 flex items-center gap-2.5 px-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-emerald to-emerald-light text-sm font-bold text-white shadow-[0_4px_12px_rgba(31,157,107,0.4)]">
            CM
          </div>
          <span className="text-[15px] font-bold tracking-tight text-white">
            CrewMate
          </span>
        </div>
        {GROUPS.map((g) => (
          <div key={g.label} className="mb-5">
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-white/35">
              {g.label}
            </p>
            {g.items.map(({ href, label, Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-white/65 hover:bg-white/5 hover:text-white/90"
                  }`}
                >
                  <Icon size={16} strokeWidth={2} />
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
      <form action={signOut}>
        <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-white/50 hover:bg-white/5 hover:text-white/80">
          <LogOut size={16} strokeWidth={2} />
          Sign out
        </button>
      </form>
    </aside>
  );
}
