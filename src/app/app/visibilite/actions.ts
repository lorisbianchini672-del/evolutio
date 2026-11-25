"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generatePost } from "@/lib/ai";
import { MAX_COMPETITORS, refreshCompetitors } from "@/lib/competitors";
import { createLocalPost } from "@/lib/google";
import { placeDetails } from "@/lib/places";
import { getAccessTokenFor } from "@/lib/reviews";
import { requireSubscriber } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Location } from "@/lib/types";

const PAGE = "/app/visibilite";

function go(key: "ok" | "erreur", message: string, hash = ""): never {
  redirect(`${PAGE}?${key}=${encodeURIComponent(message)}${hash}`);
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : "Une erreur est survenue.";
}

async function ownLocation(userId: string, id: string): Promise<Location> {
  const { data } = await createAdminClient()
    .from("locations")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle<Location>();
  if (!data) go("erreur", "Établissement introuvable.");
  return data;
}

/** « C'est ma fiche » : relie l'établissement à sa fiche Google publique, pour l'audit. */
export async function setMyPlaceAction(formData: FormData) {
  const { user } = await requireSubscriber();
  const location = await ownLocation(user.id, String(formData.get("location_id") ?? ""));
  const placeId = String(formData.get("place_id") ?? "").slice(0, 200);
  if (!placeId) go("erreur", "Fiche introuvable.");
  await createAdminClient().from("locations").update({ place_id: placeId }).eq("id", location.id);
  revalidatePath(PAGE);
  go("ok", "Fiche reliée : voici son audit.", "#fiche");
}

export async function addCompetitorAction(formData: FormData) {
  const { user } = await requireSubscriber();
  const admin = createAdminClient();
  const placeId = String(formData.get("place_id") ?? "").slice(0, 200);
  const { count } = await admin.from("competitors").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if ((count ?? 0) >= MAX_COMPETITORS) go("erreur", `Vous suivez déjà ${MAX_COMPETITORS} concurrents.`, "#concurrents");
  let error: string | null = null;
  try {
    const p = await placeDetails(placeId);
    const { error: insertError } = await admin.from("competitors").insert({
      user_id: user.id,
      place_id: p.id,
      name: p.name,
      address: p.address,
      rating: p.rating,
      review_count: p.reviewCount,
      maps_url: p.mapsUrl,
    });
    if (insertError) error = "Ce concurrent est déjà suivi.";
  } catch (err) {
    error = messageOf(err);
  }
  revalidatePath(PAGE);
  if (error) go("erreur", error, "#concurrents");
  go("ok", "Concurrent ajouté.", "#concurrents");
}

export async function removeCompetitorAction(formData: FormData) {
  const { user } = await requireSubscriber();
  await createAdminClient().from("competitors").delete().eq("id", String(formData.get("id") ?? "")).eq("user_id", user.id);
  revalidatePath(PAGE);
  go("ok", "Concurrent retiré.", "#concurrents");
}

export async function refreshCompetitorsAction() {
  const { user } = await requireSubscriber();
  await refreshCompetitors(user.id);
  revalidatePath(PAGE);
  go("ok", "Chiffres des concurrents mis à jour.", "#concurrents");
}

export async function draftPostAction(formData: FormData) {
  const { user, account } = await requireSubscriber();
  const location = await ownLocation(user.id, String(formData.get("location_id") ?? ""));
  const idea = String(formData.get("idea") ?? "").trim().slice(0, 500);
  if (idea.length < 5) go("erreur", "Décrivez en quelques mots ce que vous voulez annoncer.", "#publications");
  let error: string | null = null;
  try {
    const text = await generatePost(account, idea);
    await createAdminClient().from("google_posts").insert({ user_id: user.id, location_id: location.id, text });
  } catch (err) {
    error = messageOf(err);
  }
  revalidatePath(PAGE);
  if (error) go("erreur", error, "#publications");
  go("ok", "Publication rédigée : relisez-la, puis publiez.", "#publications");
}

export async function publishPostAction(formData: FormData) {
  const { user } = await requireSubscriber();
  const admin = createAdminClient();
  const id = String(formData.get("post_id") ?? "");
  const text = String(formData.get("text") ?? "").trim().slice(0, 1500);
  if (!text) go("erreur", "La publication est vide.", "#publications");
  if (/(\+33|0)[1-9](?:[\s.-]?\d{2}){4}/.test(text)) {
    go("erreur", "Google refuse les numéros de téléphone dans les publications : retirez-le.", "#publications");
  }
  const { data: post } = await admin
    .from("google_posts")
    .select("id, location_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<{ id: string; location_id: string }>();
  if (!post) go("erreur", "Publication introuvable.", "#publications");
  const location = await ownLocation(user.id, post.location_id);
  if (!location.google_account_name || !location.google_location_name) {
    go("erreur", "Connectez d'abord la fiche Google pour publier depuis Evolutio. Vous pouvez aussi copier le texte.", "#publications");
  }
  let error: string | null = null;
  try {
    const token = await getAccessTokenFor(user.id);
    const name = await createLocalPost(token, location.google_account_name, location.google_location_name, text);
    await admin
      .from("google_posts")
      .update({ text, status: "published", google_post_name: name, published_at: new Date().toISOString(), error: null })
      .eq("id", post.id);
  } catch (err) {
    error = messageOf(err);
    await admin.from("google_posts").update({ text, status: "error", error: error.slice(0, 300) }).eq("id", post.id);
  }
  revalidatePath(PAGE);
  if (error) go("erreur", error, "#publications");
  go("ok", "Publication en ligne sur votre fiche Google.", "#publications");
}

export async function deletePostAction(formData: FormData) {
  const { user } = await requireSubscriber();
  await createAdminClient().from("google_posts").delete().eq("id", String(formData.get("post_id") ?? "")).eq("user_id", user.id);
  revalidatePath(PAGE);
  go("ok", "Publication supprimée d'Evolutio.", "#publications");
}
