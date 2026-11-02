import { WorkerNav } from "@/components/WorkerNav";

export default function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-sage pb-24">
      {children}
      <WorkerNav />
    </div>
  );
}
