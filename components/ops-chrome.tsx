import Link from "next/link";
import { OpsNav } from "@/components/ops-nav";
import { Logo } from "@/components/ornaments";
import { SiteHeader } from "@/components/public-shell";
import { SiteMenu } from "@/components/site-menu";
import { attentionCount, readAttention } from "@/lib/attention";
import { getCurrentUser } from "@/lib/auth";
import type { OpsCounts } from "@/lib/ops-tools";
import { createSessionClient } from "@/lib/supabase/session";

// The admin area's frame (app/(ops)/ops/layout.tsx): for a Toran admin
// signed in with their second factor, a midnight side bar on a laptop
// (the tools in groups, with counts of what's waiting) and a top bar with
// "Admin menu" on a phone. Anyone else, including an admin who hasn't
// unlocked yet, gets the site's own header, so the admin area's tools
// aren't shown to them at all.
export async function OpsChrome() {
  const user = await getCurrentUser();
  if (!user?.isToranAdmin || user.aal !== "aal2") return <SiteHeader />;
  const counts = await opsCounts();
  return (
    <>
      <aside className="ops-sidebar bg-night text-on-night sticky top-0 hidden h-svh flex-col gap-6 overflow-y-auto px-4 py-5 lg:flex">
        <Link
          href="/ops"
          className="text-night-accent flex items-center gap-2 px-3 no-underline"
        >
          <Logo size="sm" night />
          <span className="text-night-muted pt-1 text-base font-semibold">
            Admin
          </span>
        </Link>
        <OpsNav counts={counts} />
        <div className="border-on-night/15 mt-auto flex flex-col gap-1 border-t pt-4 text-base">
          <Link
            href="/"
            className="text-on-night hover:bg-on-night/10 rounded-xl px-3 py-2 font-semibold no-underline"
          >
            View the site <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </aside>
      <header className="bg-night sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-2 lg:hidden">
        <Link
          href="/ops"
          className="text-night-accent flex items-center gap-2 no-underline"
        >
          <Logo size="sm" night />
          <span className="text-night-muted hidden pt-1 text-base font-semibold min-[26rem]:inline">
            Admin
          </span>
        </Link>
        <SiteMenu label="Admin menu" close="Close">
          <div className="px-1">
            <OpsNav counts={counts} />
          </div>
          <Link href="/" className="text-peacock px-4 text-lg font-semibold">
            View the site ↗
          </Link>
        </SiteMenu>
      </header>
    </>
  );
}

// What's waiting, for the counts beside the tools. A count that can't be
// read is left off rather than shown as nought.
async function opsCounts(): Promise<OpsCounts> {
  const supabase = await createSessionClient();
  if (!supabase) return {};
  const [review, claims, attention] = await Promise.all([
    supabase
      .from("event_claims")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase.rpc("pending_mandir_claims"),
    supabase.rpc("needs_attention"),
  ]);
  return {
    review: review.count ?? undefined,
    claims: claims.data?.length,
    attention: attention.error
      ? undefined
      : attentionCount(readAttention(attention.data)),
  };
}
