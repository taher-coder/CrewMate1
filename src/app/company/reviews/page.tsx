import { createClient } from "@/lib/supabase/server";
import { getMyCompany } from "@/lib/company";
import { ReviewReplyForm } from "@/components/ReviewReplyForm";
import { Star } from "lucide-react";

export default async function CompanyReviewsPage() {
  const supabase = await createClient();
  const membership = await getMyCompany(supabase);
  if (!membership?.companies) return null;

  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating, comment, company_response, created_at, workers(full_name)")
    .eq("company_id", membership.companies.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-charcoal">Reviews</h1>
      {!reviews?.length ? (
        <p className="text-sm text-muted">No reviews yet.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="card rounded-2xl bg-warm-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-amber">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      fill={i < r.rating ? "currentColor" : "none"}
                      strokeWidth={1.5}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted">
                  {new Date(r.created_at).toLocaleDateString("en-IN", {
                    dateStyle: "medium",
                  })}
                </span>
              </div>
              {r.workers?.full_name && (
                <p className="mt-1 text-xs text-muted">
                  For {r.workers.full_name}
                </p>
              )}
              {r.comment && (
                <p className="mt-2 text-sm text-charcoal">{r.comment}</p>
              )}
              {r.company_response ? (
                <div className="mt-3 rounded-lg bg-sage p-3 text-xs text-charcoal">
                  <span className="font-semibold">Your reply: </span>
                  {r.company_response}
                </div>
              ) : (
                <ReviewReplyForm reviewId={r.id} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
