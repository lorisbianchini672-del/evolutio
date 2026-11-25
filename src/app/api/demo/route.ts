import { NextResponse, type NextRequest } from "next/server";
import { aiConfigured, generateReply } from "@/lib/ai";
import { SECTORS, TONES, type Sector, type Tone } from "@/lib/config";
import { createLimiter } from "@/lib/rate-limit";

// Démo publique de la landing : le visiteur colle un avis, l'IA propose la réponse.
// Limitée par visiteur et au global pour maîtriser le coût de l'IA. Rien n'est enregistré.

const perVisitor = createLimiter(6, 10 * 60_000);
const global = createLimiter(300, 60 * 60_000);

export async function POST(request: NextRequest) {
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || request.headers.get("x-real-ip") || "inconnu";
  if (!perVisitor(ip) || !global("tous")) {
    return NextResponse.json({ error: "Beaucoup d'essais d'un coup : réessayez dans quelques minutes, ou créez votre compte gratuit." }, { status: 429 });
  }

  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const review = String(body.review ?? "").trim().slice(0, 800);
  const name = String(body.name ?? "").trim().slice(0, 40);
  const rating = Math.round(Number(body.rating));
  const sector = (String(body.sector ?? "") in SECTORS ? body.sector : "commerce") as Sector;
  const tone = (String(body.tone ?? "") in TONES ? body.tone : "chaleureux") as Tone;
  if (!(rating >= 1 && rating <= 5)) return NextResponse.json({ error: "Choisissez une note de 1 à 5." }, { status: 400 });
  if (review.length < 3) return NextResponse.json({ error: "Collez le texte d'un avis." }, { status: 400 });

  try {
    const reply = await generateReply(
      { reviewer_name: name || null, rating, comment: review },
      { business_name: "", sector, tone, signature: "", private_contact: "", extra_instructions: "" },
    );
    return NextResponse.json({ reply, ai: aiConfigured() });
  } catch (err) {
    console.error("[demo]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "L'IA n'a pas répondu. Réessayez dans un instant." }, { status: 502 });
  }
}
