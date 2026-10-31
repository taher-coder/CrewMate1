import { redirect } from "next/navigation";
import { getCompanyContext } from "@/lib/data/company-context";

// Entry router: send the signed-in user wherever makes sense for their
// company's state. Middleware already guarantees they're authenticated
// by the time they reach here.
export default async function RootPage() {
  const ctx = await getCompanyContext();

  if (!ctx) {
    redirect("/apply");
  }
  if (ctx.company.status !== "verified") {
    redirect("/pending");
  }
  redirect("/dashboard");
}
