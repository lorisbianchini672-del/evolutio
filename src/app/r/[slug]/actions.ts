"use server";

import { redirect } from "next/navigation";
import { sendPushToUser } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";

/** Message privé laissé par un visiteur de la page de collecte. Proposé à tous, quelle que soit leur satisfaction. */
export async function sendFeedbackAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const message = String(formData.get("message") ?? "").trim().slice(0, 2000);
  const contact = String(formData.get("contact") ?? "").trim().slice(0, 160);
  const trap = String(formData.get("site_web") ?? ""); // champ invisible : rempli seulement par les robots
  const path = `/r/${encodeURIComponent(slug)}`;

  if (trap) redirect(`${path}?merci=1`);
  if (message.length < 3) redirect(`${path}?erreur=1`);

  const admin = createAdminClient();
  const { data: location } = await admin
    .from("locations")
    .select("id, user_id, title")
    .eq("slug", slug)
    .maybeSingle<{ id: string; user_id: string; title: string }>();
  if (!location) redirect("/");

  await admin
    .from("feedback")
    .insert({ location_id: location.id, user_id: location.user_id, message, contact: contact || null });
  await sendPushToUser(location.user_id, {
    title: `Message privé · ${location.title}`,
    body: message.slice(0, 140),
    url: "/app/collecte#messages",
    tag: "message-prive",
  }).catch(() => 0);
  redirect(`${path}?merci=1`);
}
