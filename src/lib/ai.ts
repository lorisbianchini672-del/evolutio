import Anthropic from "@anthropic-ai/sdk";
import {
  buildInsightsPrompt,
  buildSystemPrompt,
  buildUserPrompt,
  fallbackReply,
  parseInsights,
  type Insights,
  type ReplySettings,
  type ReviewInput,
} from "./prompt";

let client: Anthropic | null = null;
let clientKey = "";

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Rédige un brouillon de réponse. Sans clé d'IA, renvoie un modèle sobre :
 * l'application reste utilisable pour une démonstration.
 */
export async function generateReply(review: ReviewInput, settings: ReplySettings): Promise<string> {
  if (!aiConfigured()) return fallbackReply(review, settings);
  if (!client || clientKey !== process.env.ANTHROPIC_API_KEY) {
    clientKey = process.env.ANTHROPIC_API_KEY as string;
    client = new Anthropic({ apiKey: clientKey });
  }

  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
    max_tokens: 400,
    system: buildSystemPrompt(settings),
    messages: [{ role: "user", content: buildUserPrompt(review) }],
  });

  const text = message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();
  return text || fallbackReply(review, settings);
}

/** Synthèse des forces et des irritants à partir des derniers avis. Renvoie null si la réponse est inexploitable. */
export async function generateInsights(
  businessName: string,
  reviews: { rating: number; comment: string | null }[],
): Promise<Insights | null> {
  if (!aiConfigured()) return null;
  if (!client || clientKey !== process.env.ANTHROPIC_API_KEY) {
    clientKey = process.env.ANTHROPIC_API_KEY as string;
    client = new Anthropic({ apiKey: clientKey });
  }
  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
    max_tokens: 900,
    messages: [{ role: "user", content: buildInsightsPrompt(businessName, reviews) }],
  });
  return parseInsights(message.content.map((block) => (block.type === "text" ? block.text : "")).join(""));
}
