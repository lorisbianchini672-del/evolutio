import { NextResponse, type NextRequest } from "next/server";
import { billingEnabled } from "@/lib/config";
import { monthlyReportEmail, sendEmail } from "@/lib/email";
import { hasAccess } from "@/lib/entitlement";
import { loadReport, monthBounds } from "@/lib/report";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Account } from "@/lib/types";

export const maxDuration = 300;

// Le 1er de chaque mois (voir vercel.json) : envoie à chaque commerçant le rapport du mois écoulé.
// Un rapport déjà parti ce mois-ci n'est jamais renvoyé, même si la tâche est relancée.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Non autorisé", { status: 401 });
  }

  const admin = createAdminClient();
  const monthStart = monthBounds(0).start.toISOString();
  const [{ data: accounts }, { data: subscriptions }] = await Promise.all([
    admin.from("accounts").select("*").eq("report_email", true).returns<Account[]>(),
    admin.from("subscriptions").select("user_id, status"),
  ]);
  const statusByUser = new Map((subscriptions ?? []).map((s) => [s.user_id as string, s.status as string]));

  const summary = { sent: 0, skipped: 0, errors: 0 };
  for (const account of accounts ?? []) {
    if (account.last_report_at && account.last_report_at >= monthStart) {
      summary.skipped += 1;
      continue;
    }
    if (!hasAccess(statusByUser.get(account.id), billingEnabled())) {
      summary.skipped += 1;
      continue;
    }
    try {
      const report = await loadReport(admin, account, 1);
      if (report.totalReviews === 0) {
        summary.skipped += 1;
        continue;
      }
      const mail = monthlyReportEmail(report, account.business_name);
      const result = await sendEmail({ to: account.email, ...mail });
      if (!result.sent) throw new Error(result.error);
      await admin.from("accounts").update({ last_report_at: new Date().toISOString() }).eq("id", account.id);
      summary.sent += 1;
    } catch (err) {
      summary.errors += 1;
      console.error(`[rapport] ${account.id} :`, err instanceof Error ? err.message : err);
    }
  }
  return NextResponse.json(summary);
}
