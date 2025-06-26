import { supabase } from "./supabaseClient";

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval:
    | "monthly-plans"
    | "yearly-plan"
    | "custom-pricing"
    | "lifetime-access";
  features: string[];
  buy_now_url: string;
  variant_id: string;
  store_id: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  subscription_id: string;
  plan_name: string;
  status: "active" | "cancelled" | "past_due" | "paid" | "refunded";
  start_date: string;
  end_date: string | null;
  updated_at: string;
}

interface LemonSqueezyResponse {
  data: {
    attributes: {
      url: string;
    };
  };
}

// Fetch subscription plans from LemonSqueezy
export async function getPlans(): Promise<Plan[]> {
  try {
    const headers = {
      Authorization: `Bearer ${import.meta.env.VITE_LEMON_API_KEY}`,
      Accept: "application/json",
    };

    // STEP 1: Get store ID manually
    const storeRes = await fetch("https://api.lemonsqueezy.com/v1/stores", {
      headers,
    });
    if (!storeRes.ok) throw new Error("Failed to fetch store ID");
    const storeData = await storeRes.json();
    const fallbackStoreId = storeData.data?.[0]?.id;

    if (!fallbackStoreId) {
      throw new Error("No store ID found");
    }

    // STEP 2: Get product list
    const productRes = await fetch("https://api.lemonsqueezy.com/v1/products", {
      headers,
    });
    if (!productRes.ok) throw new Error("Failed to fetch plans");
    const productData = await productRes.json();

    // STEP 3: Build plan list
    const plans = await Promise.all(
      productData.data.map(async (product: any) => {
        const productId = product.id;

        // STEP 4: Get variant for the product
        const variantRes = await fetch(
          `https://api.lemonsqueezy.com/v1/products/${productId}/variants`,
          { headers }
        );
        const variantData = await variantRes.json();
        const variantId = variantData.data?.[0]?.id || null;

        return {
          id: productId,
          name: product.attributes.name,
          description: product.attributes.description || "",
          price: product.attributes.price / 100,
          interval: product.attributes.slug,
          features: product.attributes.feature_list || [],
          buy_now_url: product.attributes.buy_now_url || "",
          variant_id: variantId,
          store_id: fallbackStoreId,
        };
      })
    );

    return plans;
  } catch (error) {
    console.error("Error fetching plans:", error);
    throw error;
  }
}

// Get user's subscription
export async function getUserSubscription(userId: string): Promise<any | null> {
  try {
    const { data: subscription, error: subError } = await supabase
      .from("subscription")
      .select("*")
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (subError) {
      throw subError;
    }

    if (!subscription) {
      return null;
    }

    return {
      subscription,
    };
  } catch (error) {
    console.error("Error fetching user subscription:", error);
    throw error;
  }
}
// Get user's subscription
export async function getCompanySubscriptionByUserId(
  userId: string
): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from("user_profile")
      .select("company_id")
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (error) throw error;

    const { data: subscription, error: subError } = await supabase
      .from("subscription")
      .select("*")
      .eq("company_id", data.company_id)
      .limit(1)
      .single();

    if (subError) {
      throw subError;
    }

    if (!subscription) {
      return null;
    }

    return {
      subscription,
    };
  } catch (error) {
    console.error("Error fetching company subscription:", error);
    throw error;
  }
}

// Cancel subscription
export async function cancelSubscription(
  subscription: Subscription
): Promise<void> {
  try {
    // First, cancel the subscription in LemonSqueezy
    const response = await fetch(
      `https://api.lemonsqueezy.com/v1/subscriptions/${subscription.subscription_id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_LEMON_API_KEY}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to cancel subscription in LemonSqueezy");
    }

    // Then update the status in Supabase order table
    const { error: updateError } = await supabase
      .from("order")
      .update({
        status: "cancelled",
        end_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("subscription_id", subscription.subscription_id);

    if (updateError) {
      throw new Error("Failed to update subscription status in database");
    }
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    throw error;
  }
}

// Refund subscription
export async function refundSubscription(
  subscription: { subscription_id: string },
  amount?: number // optional partial refund amount in cents
): Promise<void> {
  try {
    // Get session token
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) throw new Error("No session available");

    const token = session.access_token;

    // Prepare body for refund API call
    const bodyPayload: Record<string, any> = {
      order_id: `${subscription.subscription_id}`,
    };

    if (amount !== undefined) {
      if (!Number.isInteger(amount) || amount <= 0) {
        throw new Error("Amount must be a positive integer (cents)");
      }
      bodyPayload.amount = amount;
    }

    // Call Supabase Edge Function
    const response = await fetch(
      "https://dkuwvwmlkztxkluuondn.supabase.co/functions/v1/refund-order",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyPayload),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error("Failed to refund: " + text);
    }

    // Update order status in DB after successful refund
    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("order")
      .update({
        status: "refunded",
        end_date: now,
        updated_at: now,
      })
      .eq("subscription_id", subscription.subscription_id);

    if (updateError) {
      throw new Error("Failed to update DB: " + updateError.message);
    }
  } catch (error) {
    console.error("Refund error:", error);
    throw error;
  }
}

export async function createCustomPriceOrder(
  storeId: string,
  variantId: string,
  amount: number
): Promise<string> {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      throw new Error("User is not authenticated.");
    }

    const response = await fetch(
      "https://dkuwvwmlkztxkluuondn.supabase.co/functions/v1/custom-subscription",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          store_id: storeId,
          variant_id: variantId,
          amount, // in cents
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Checkout creation failed: ${errorText}`);
    }

    const result: LemonSqueezyResponse = await response.json();

    const checkoutUrl = result?.data?.attributes?.url;

    if (!checkoutUrl) {
      throw new Error("Checkout URL not found in response.");
    }

    return checkoutUrl;
  } catch (err: any) {
    console.error("Error creating custom order:", err.message);
    throw err;
  }
}

/* 

lemon squeezy webhook DENO

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature'
};
function hexToUint8Array(hex) {
  if (hex.length % 2 !== 0) throw new Error('Invalid hex string');
  const arr = new Uint8Array(hex.length / 2);
  for(let i = 0; i < hex.length; i += 2){
    arr[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return arr;
}
function uint8ArrayToHex(arr) {
  return Array.from(arr).map((b)=>b.toString(16).padStart(2, '0')).join('');
}
async function verifySignature(body, signature, secret) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, {
    name: 'HMAC',
    hash: 'SHA-256'
  }, false, [
    'sign'
  ]);
  const data = encoder.encode(body);
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, data);
  // Convert generated signature buffer to hex string
  const generatedSignature = uint8ArrayToHex(new Uint8Array(signatureBuffer));
  // Compare the generated signature hex with the header signature (assumed hex)
  return generatedSignature === signature.toLowerCase();
}
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    console.log('Webhook request received');
    const signature = req.headers.get('x-signature');
    if (!signature) {
      console.error('No signature found in headers');
      throw new Error('No signature found');
    }
    const webhookSecret = Deno.env.get('LEMON_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('Webhook secret not configured');
    }
    const body = await req.text();
    // Verify signature
    const isValid = await verifySignature(body, signature, webhookSecret);
    if (!isValid) {
      console.error('Invalid webhook signature');
      throw new Error('Invalid webhook signature');
    }
    const payload = JSON.parse(body);
    const eventType = payload.meta.event_name;
    const data = payload.data;
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const email = data.attributes.user_email || data.attributes.customer_email;
    const { data: user, error: userError } = await supabase.from('user_profiles').select('id').eq('email', email).single();
    if (userError) throw userError;
    if (!user) {
      return new Response('User not found', {
        status: 404
      });
    }
    const orderPayload = {
      user_id: user.id,
      plan_id: eventType === 'order_created' ? data.attributes.first_order_item.product_id : data.attributes.product_id,
      plan_name: eventType === 'order_created' ? data.attributes.first_order_item.product_name : data.attributes.product_name,
      subscription_id: data.id,
      status: data.attributes.status,
      start_date: data.attributes.renews_at,
      end_date: data.attributes.ends_at,
      updated_at: new Date().toISOString()
    };
    if (eventType === 'subscription_created') {
      const { error } = await supabase.from('orders').insert(orderPayload);
      if (error) throw error;
    } else if (eventType === 'order_created') {
      const { error } = await supabase.from('orders').insert(orderPayload);
      if (error) throw error;
    } else if (eventType === 'subscription_updated' || eventType === 'order_updated') {
      const { error } = await supabase.from('orders').update(orderPayload).eq('subscription_id', data.id);
      if (error) throw error;
    } else if (eventType === 'subscription_cancelled' || eventType === 'order_cancelled' || eventType === "refunded") {
      const { error } = await supabase.from('orders').update({
        updated_at: new Date().toISOString()
      }).eq('subscription_id', data.id);
      if (error) throw error;
    }
    return new Response(JSON.stringify({
      message: 'Webhook processed successfully'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});










*/
