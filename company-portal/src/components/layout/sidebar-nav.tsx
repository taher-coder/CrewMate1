"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Sec 7.1 — company portal navigation. Only the items actually built so
// far are linked; the rest are listed greyed-out so the nav shape matches
// the full blueprint without pretending unfinished pages work.
const LIVE_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/requests", label: "Requests" },
  { href: "/dispatch", label: "Dispatch" },
  { href: "/jobs", label: "Jobs" },
  { href: "/workers", label: "Workers" },
  { href: "/services", label: "Services" },
  { href: "/service-areas", label: "Service Areas" },
];

const PLANNED_ITEMS = [
  "Earnings",
  "Reviews",
  "Messages",
  "Support",
  "Company Profile",
  "Documents",
  "Settings",
];

export function SidebarNav({ companyName }: { companyName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <aside className="flex w-60 flex-col border-r border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-5 py-4">
        <div className="text-sm font-semibold text-neutral-900">CrewMate for Business</div>
        <div className="mt-0.5 truncate text-xs text-neutral-500">{companyName}</div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {LIVE_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm font-medium ${
                active ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}

        <div className="mt-4 border-t border-neutral-100 pt-4">
          <div className="px-3 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
            Coming next
          </div>
          {PLANNED_ITEMS.map((label) => (
            <div key={label} className="mt-0.5 cursor-default rounded-md px-3 py-2 text-sm text-neutral-350 text-neutral-400">
              {label}
            </div>
          ))}
        </div>
      </nav>

      <div className="border-t border-neutral-200 px-3 py-3">
        <button
          onClick={signOut}
          className="w-full rounded-md px-3 py-2 text-left text-sm text-neutral-600 hover:bg-neutral-100"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
