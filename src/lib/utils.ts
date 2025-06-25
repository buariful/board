import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { supabase } from "./supabaseClient";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: "monthly-plans" | "yearly-plan" | "custom-pricing-1";
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
// store id = "194128"

// Fetch subscription plans from LemonSqueezy
export async function getPlans(): Promise<Plan[]> {
  try {
    const headers = {
      Authorization: `Bearer ${import.meta.env.VITE_LEMONSQUEEZY_API_KEY}`,
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
          `  https://api.lemonsqueezy.com/v1/products/${productId}/variants`,
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

// Create checkout session
// export async function createCheckoutSession(
//   userId: string,
//   planId: string
// ): Promise<string> {
//   try {
//     const response = await fetch(
//       `${
//         import.meta.env.VITE_SUPABASE_URL
//       }/functions/v1/create-checkout-session`,
//       {
//         method: "POST",
//         headers: {
//           Authorization: Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY},
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           userId,
//           planId,
//         }),
//       }
//     );

//     if (!response.ok) {
//       throw new Error("Failed to create checkout session");
//     }

//     const data = await response.json();
//     return data.checkoutUrl;
//   } catch (error) {
//     console.error("Error creating checkout session:", error);
//     throw error;
//   }
// }

// Get user's subscription
export async function getUserSubscription(
  userId: string
): Promise<Subscription | null> {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // No subscription found
      }
      throw error;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      user_id: data.user_id,
      plan_id: data.plan_id,
      plan_name: data.plan_name,
      subscription_id: data.subscription_id,
      status: data.status,
      start_date: data.start_date,
      end_date: data.end_date,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error("Error fetching user subscription:", error);
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
          Authorization: ` Bearer ${import.meta.env.VITE_LEMONSQUEEZY_API_KEY}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to cancel subscription in LemonSqueezy");
    }

    // Then update the status in Supabase orders table
    const { error: updateError } = await supabase
      .from("orders")
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

// Static free plan for display
export const FREE_PLAN: Plan = {
  id: "free",
  name: "Free Plan",
  description: "Perfect for trying out our chatbot platform",
  price: 0,
  interval: "monthly-plans",
  features: [
    "1 Chatbot",
    "Basic customization",
    "Email support",
    "1,000 messages/month",
  ],
  buy_now_url: "",
  variant_id: "",
  store_id: "",
};
