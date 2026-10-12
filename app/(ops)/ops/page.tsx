import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Card, Loading, PageShell } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { pageTitle } from "@/lib/site";
import { EnrolSecondFactor, VerifySecondFactor } from "./second-factor";

export const metadata: Metadata = {
  title: pageTitle("Admin"),
  robots: { index: false },
};

export default function OpsPage() {
  return (
    <PageShell title="Toran admin">
      <Suspense fallback={<Loading />}>
        <Ops />
      </Suspense>
    </PageShell>
  );
}

async function Ops() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fops");
  // Hide the admin area's existence from everyone else.
  if (!user.isToranAdmin) notFound();

  if (user.aal !== "aal2") {
    return (
      <Card>
        {user.hasSecondFactor ? <VerifySecondFactor /> : <EnrolSecondFactor />}
      </Card>
    );
  }

  return (
    <Card>
      <p className="text-xl font-semibold">Unlocked.</p>
      <p className="text-muted">
        Mandir claims to approve and the event review queue will appear here.
      </p>
    </Card>
  );
}
