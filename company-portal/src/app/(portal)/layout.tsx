import { redirect } from "next/navigation";
import { getCompanyContext } from "@/lib/data/company-context";
import { SidebarNav } from "@/components/layout/sidebar-nav";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCompanyContext();

  if (!ctx) redirect("/apply");
  if (ctx.company.status !== "verified") redirect("/pending");

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <SidebarNav companyName={ctx.company.legal_name} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
