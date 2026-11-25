import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Export CSV de tous les avis et réponses du compte (ouvrable dans Excel, Numbers, Google Sheets).

function cell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  // Neutralise les formules (=, +, -, @) pour éviter l'injection dans un tableur.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Non connecté", { status: 401 });

  const [{ data: reviews }, { data: locations }] = await Promise.all([
    supabase
      .from("reviews")
      .select("review_created_at, location_id, reviewer_name, rating, comment, status, reply_text, reply_published_at, is_demo")
      .order("review_created_at", { ascending: false })
      .limit(10000),
    supabase.from("locations").select("id, title"),
  ]);
  const titles = new Map((locations ?? []).map((l) => [l.id as string, l.title as string]));
  const head = ["Date de l'avis", "Établissement", "Auteur", "Note", "Avis", "Statut", "Réponse", "Date de la réponse", "Démonstration"];
  const lines = (reviews ?? []).map((r) =>
    [
      r.review_created_at,
      titles.get(r.location_id as string) ?? "",
      r.reviewer_name,
      r.rating,
      r.comment,
      r.status,
      r.reply_text,
      r.reply_published_at,
      r.is_demo ? "oui" : "non",
    ]
      .map(cell)
      .join(";"),
  );
  const csv = "﻿" + [head.map(cell).join(";"), ...lines].join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="avis-evolutio-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
