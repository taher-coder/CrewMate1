import { createClient } from "@/lib/supabase/server";
import { getMyCompany } from "@/lib/company";
import { ServiceToggleCard } from "@/components/ServiceToggleCard";

export default async function CompanyServicesPage() {
  const supabase = await createClient();
  const membership = await getMyCompany(supabase);
  if (!membership?.companies) return null;

  const { data: categories } = await supabase
    .from("service_categories")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("sort_order");

  const { data: myServices } = await supabase
    .from("company_services")
    .select("category_id")
    .eq("company_id", membership.companies.id);

  const enabledCategoryIds = new Set(
    (myServices ?? []).map((s) => s.category_id),
  );

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-charcoal">Services</h1>
      <p className="mb-6 text-sm text-muted">
        Turn on the categories your company offers — you&apos;ll only
        receive requests for enabled services.
      </p>
      <div className="space-y-3">
        {categories?.map((c) => (
          <ServiceToggleCard
            key={c.id}
            companyId={membership.companies!.id}
            category={c}
            enabled={enabledCategoryIds.has(c.id)}
          />
        ))}
      </div>
    </div>
  );
}
