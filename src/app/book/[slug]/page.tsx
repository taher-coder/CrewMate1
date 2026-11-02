import { createClient } from "@/lib/supabase/server";
import { BookingForm } from "@/components/BookingForm";
import { notFound } from "next/navigation";

export default async function BookCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: category } = await supabase
    .from("service_categories")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (!category) notFound();

  const { data: problems } = await supabase
    .from("service_problems")
    .select("id, name")
    .eq("category_id", category.id);

  return (
    <main className="min-h-screen bg-sage">
      <BookingForm category={category} problems={problems ?? []} />
    </main>
  );
}
