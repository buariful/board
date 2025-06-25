import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
// Note: Deno standard library for crypto is still evolving.
// For production, consider a more robust crypto library or ensure Deno's std/crypto is stable.
import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts";

// Define the expected structure of the webhook payload from your types
// (Assuming LemonSqueezyWebhookPayload and related types are defined elsewhere,
// for Supabase Functions, you might need to redefine or import them if possible,
// or handle as `any` with careful parsing if type sharing is complex)
interface LemonSqueezySubscriptionWebhookAttributes {
  store_id: number;
  customer_id: number;
  order_id: number;
  order_item_id: number;
  product_id: number;
  variant_id: number;
  product_name: string;
  variant_name: string;
  user_name: string;
  user_email: string;
  status: string;
  status_formatted: string;
  card_brand: string | null;
  card_last_four: string | null;
  pause: null | { mode: "void" | "free"; resumes_at: string | null };
  cancelled: boolean;
  trial_ends_at: string | null;
  renews_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
  test_mode: boolean;
  urls: { update_payment_method: string | null; customer_portal: string | null };
}

interface LemonSqueezyWebhookPayload {
  meta: {
    event_name: "subscription_created" | "subscription_updated" | "subscription_cancelled" | string;
    custom_data?: { user_id?: string };
  };
  data: {
    type: "subscriptions";
    id: string; // Lemon Squeezy Subscription ID (e.g., "sub_...")
    attributes: LemonSqueezySubscriptionWebhookAttributes;
  };
}


const LEMONSQUEEZY_WEBHOOK_SECRET = Deno.env.get("LEMONSQUEEZY_WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!LEMONSQUEEZY_WEBHOOK_SECRET) {
    console.error("LEMONSQUEEZY_WEBHOOK_SECRET is not set.");
    return new Response("Webhook secret not configured.", { status: 500 });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Supabase URL or Service Role Key not configured.");
    return new Response("Supabase connection details missing.", { status: 500 });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Verify signature
  const signature = req.headers.get("X-Signature");
  const requestBody = await req.text(); // Read body once as text

  if (!signature) {
    console.warn("Webhook received without X-Signature header.");
    return new Response("Signature missing.", { status: 400 });
  }

  try {
    const digest = hmac("sha256", LEMONSQUEEZY_WEBHOOK_SECRET, requestBody, "utf-8", "hex");
    if (digest !== signature) {
      console.warn("Invalid webhook signature.");
      return new Response("Invalid signature.", { status: 401 });
    }
  } catch (err) {
    console.error("Error during signature verification:", err);
    return new Response("Signature verification failed.", { status: 500 });
  }
  
  let payload: LemonSqueezyWebhookPayload;
  try {
    payload = JSON.parse(requestBody); // Parse the body text now
  } catch (e) {
    console.error("Failed to parse webhook payload:", e);
    return new Response("Invalid payload.", { status: 400 });
  }

  const { meta, data } = payload;
  const { event_name, custom_data } = meta;
  const userIdFromCustomData = custom_data?.user_id; // This is crucial

  if (!userIdFromCustomData) {
    console.warn("Webhook received without user_id in custom_data. Cannot process.", payload);
    // Depending on your logic, you might still want to store some subscriptions
    // even without a user_id, or handle this case differently.
    // For now, we'll skip if no user_id is present.
    return new Response("User ID missing in custom_data.", { status: 400 });
  }

  const attributes = data.attributes;
  const subscriptionData = {
    user_id: userIdFromCustomData,
    lemon_squeezy_subscription_id: data.id,
    lemon_squeezy_order_id: attributes.order_id?.toString(),
    lemon_squeezy_product_id: attributes.product_id?.toString(),
    lemon_squeezy_variant_id: attributes.variant_id?.toString(),
    status: attributes.status,
    renews_at: attributes.renews_at ? new Date(attributes.renews_at).toISOString() : null,
    ends_at: attributes.ends_at ? new Date(attributes.ends_at).toISOString() : null,
    trial_ends_at: attributes.trial_ends_at ? new Date(attributes.trial_ends_at).toISOString() : null,
    product_name: attributes.product_name,
    variant_name: attributes.variant_name,
    updated_at: new Date().toISOString(),
  };

  console.log(`Processing webhook event: ${event_name} for user ${userIdFromCustomData} and subscription ${data.id}`);

  try {
    if (event_name === "subscription_created" || event_name === "subscription_updated") {
      // Upsert logic: update if exists, insert if not
      const { error } = await supabaseAdmin
        .from("subscriptions")
        .upsert(
          { ...subscriptionData, created_at: event_name === "subscription_created" ? new Date(attributes.created_at).toISOString() : undefined },
          { onConflict: "lemon_squeezy_subscription_id" }
        );

      if (error) throw error;
      console.log(`Subscription ${data.id} ${event_name === "subscription_created" ? 'created' : 'updated'} for user ${userIdFromCustomData}.`);

    } else if (event_name === "subscription_cancelled") {
      // Update existing subscription status and ends_at
      const { error } = await supabaseAdmin
        .from("subscriptions")
        .update({
          status: attributes.status, // Should be 'cancelled' or similar
          ends_at: attributes.ends_at ? new Date(attributes.ends_at).toISOString() : new Date().toISOString(), // If ends_at is not provided, assume it ends now or based on policy
          updated_at: new Date().toISOString(),
        })
        .eq("lemon_squeezy_subscription_id", data.id);
      
      if (error) throw error;
      console.log(`Subscription ${data.id} cancelled for user ${userIdFromCustomData}.`);

    } else {
      console.log(`Received unhandled event: ${event_name}`);
    }

    return new Response("Webhook processed.", { status: 200 });
  } catch (error) {
    console.error("Error processing webhook and updating Supabase:", error);
    return new Response(`Webhook processing error: ${error.message}`, { status: 500 });
  }
});