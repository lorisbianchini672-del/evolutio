import type { Sector, Tone } from "./config";
import type { Insights } from "./prompt";

export type Account = {
  id: string;
  email: string;
  business_name: string;
  sector: Sector;
  tone: Tone;
  signature: string;
  private_contact: string;
  extra_instructions: string;
  auto_publish_min_rating: 4 | 5 | null;
  alert_email: boolean;
  insights: Insights | null;
  insights_at: string | null;
  created_at: string;
};

export type Subscription = {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: string | null;
  status: string;
  trial_end: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

export type Location = {
  id: string;
  user_id: string;
  google_account_name: string | null;
  google_location_name: string | null;
  title: string;
  review_url: string | null;
  slug: string;
  is_demo: boolean;
  created_at: string;
};

export type ReviewStatus = "new" | "drafted" | "published" | "ignored";

export type Review = {
  id: string;
  user_id: string;
  location_id: string;
  google_review_name: string | null;
  reviewer_name: string | null;
  rating: number;
  comment: string | null;
  review_created_at: string;
  draft_text: string | null;
  reply_text: string | null;
  reply_published_at: string | null;
  status: ReviewStatus;
  is_demo: boolean;
  created_at: string;
};

export type Feedback = {
  id: string;
  location_id: string;
  user_id: string;
  message: string;
  contact: string | null;
  created_at: string;
};
