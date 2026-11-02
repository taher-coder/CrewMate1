import { CompanySidebar } from "@/components/CompanySidebar";

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-sage">
      <CompanySidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
