"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions";
import {
  LayoutDashboard,
  Building2,
  Users,
  UserRound,
  Star,
  LifeBuoy,
  CreditCard,
  Percent,
  Landmark,
  BarChart3,
  FileClock,
  LogOut,
} from "lucide-react";

const GROUPS = [
  {
    label: "Operations",
    items: [
      { href: "/internal-access", label: "Overview", Icon: LayoutDashboard },
    ],
  },
  {
    label: "Marketplace",
    items: [
      { href: "/internal-access/companies", label: "Companies", Icon: Building2 },
      { href: "/internal-access/workers", label: "Workers", Icon: Users },
      { href: "/internal-access/customers", label: "Customers", Icon: UserRound },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/internal-access/payments", label: "Payments", Icon: CreditCard },
      { href: "/internal-access/commissions", label: "Commissions", Icon: Percent },
      { href: "/internal-access/payouts", label: "Payouts", Icon: Landmark },
    ],
  },
  {
    label: "Trust & support",
    items: [
      { href: "/internal-access/reviews", label: "Reviews", Icon: Star },
      { href: "/internal-access/support", label: "Support cases", Icon: LifeBuoy },
    ],
  },
  {
    label: "Configuration",
    items: [
      { href: "/internal-access/analytics", label: "Analytics", Icon: BarChart3 },
      { href: "/internal-access/audit-logs", label: "Audit logs", Icon: FileClock },
    ],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-sage">
      <aside className="flex h-screen w-60 flex-col justify-between overflow-y-auto bg-forest-dark px-3 py-5 text-white/90">
        <div>
          <div className="mb-7 flex items-center gap-2.5 px-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber text-sm font-bold text-white">
              CM
            </div>
            <span className="text-[15px] font-bold tracking-tight text-white">
              Admin
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
          <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-white/50 hover:bg-white/5">
            <LogOut size={16} strokeWidth={2} />
            Sign out
          </button>
        </form>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
