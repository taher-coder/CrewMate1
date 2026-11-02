import { createClient } from "@/lib/supabase/server";
import { ReviewModerationActions } from "@/components/ReviewModerationActions";
import { Star } from "lucide-react";

const STATE_LABEL: Record<string, string> = {
  visible: "Visible",
  flagged: "Flagged",
  hidden: "Hidden",
};

export default async function AdminReviewsPage() {
  const supabase = await createClient();
  const { data: reviews } = await supabase
    .from("reviews")
    .select(
      "id, rating, comment, moderation_state, created_at, companies(display_name, legal_name)",
    )
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-charcoal">
        Reviews moderation
      </h1>
      <div className="space-y-3">
        {reviews?.map((r) => (
          <div key={r.id} className="card max-w-xl rounded-2xl bg-warm-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-charcoal">
                {r.companies?.display_name ?? r.companies?.legal_name}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  r.moderation_state === "hidden"
                    ? "bg-danger-bg text-danger"
                    : r.moderation_state === "flagged"
                      ? "bg-amber-bg text-amber"
                      : "bg-success-bg text-success"
                }`}
              >
                {STATE_LABEL[r.moderation_state]}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-amber">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={12}
                  fill={i < r.rating ? "currentColor" : "none"}
                  strokeWidth={1.5}
                />
              ))}
            </div>
            {r.comment && (
              <p className="mt-2 text-sm text-charcoal">{r.comment}</p>
            )}
            <ReviewModerationActions
              reviewId={r.id}
              moderationState={r.moderation_state}
            />
          </div>
        ))}
        {!reviews?.length && (
          <p className="text-sm text-muted">No reviews yet.</p>
        )}
      </div>
    </div>
  );
}
