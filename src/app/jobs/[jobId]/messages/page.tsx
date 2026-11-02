import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MessageThread } from "@/components/MessageThread";
import { BackButton } from "@/components/BackButton";

/**
 * Shared job-conversation page for all three roles (customer, company,
 * worker) — get_or_create_job_conversation() does the authorization check
 * server-side (raises if the caller has no relationship to this job), so
 * this page is safe to reach from any role's job detail screen.
 */
export default async function JobMessagesPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) notFound();

  const { data: conversationId, error } = await supabase.rpc(
    "get_or_create_job_conversation",
    { p_job_id: jobId },
  );

  if (error || !conversationId) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("id, body, sender_id, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  return (
    <main className="flex min-h-screen flex-col bg-sage">
      <header className="flex items-center gap-3 bg-gradient-to-br from-forest to-forest-dark px-5 py-5 text-white">
        <BackButton />
        <h1 className="text-sm font-semibold">Messages</h1>
      </header>

      <MessageThread
        conversationId={conversationId}
        initialMessages={messages ?? []}
        currentUserId={userData.user.id}
      />
    </main>
  );
}
