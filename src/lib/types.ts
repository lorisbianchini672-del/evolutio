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
  alert_phone: string;
  alert_channel: AlertChannel;
  report_email: boolean;
  last_report_at: string | null;
  last_alert_review_id: string | null;
  referral_code: string | null;
  referred_by: string | null;
  referral_rewarded_at: string | null;
  onboarding_done: boolean;
  created_at: string;
};

export type Competitor = {
  id: string;
  user_id: string;
  place_id: string;
  name: string;
  address: string;
  rating: number | null;
  review_count: number | null;
  previous_rating: number | null;
  previous_count: number | null;
  maps_url: string | null;
  updated_at: string;
};

export type GooglePost = {
  id: string;
  location_id: string;
  text: string;
  status: "draft" | "published" | "error";
  error: string | null;
  created_at: string;
  published_at: string | null;
};

export type AlertChannel = "none" | "sms" | "whatsapp";

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
  place_id?: string | null;
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
