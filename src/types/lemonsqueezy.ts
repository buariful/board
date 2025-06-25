export interface LemonSqueezyVariant {
  id: string; // This is the numeric ID, e.g., "560079"
  type: "variants";
  attributes: {
    product_id: number;
    name: string;
    slug: string;
    description: string;
    price: number; // Price in cents
    is_subscription: boolean;
    interval: "day" | "week" | "month" | "year" | null;
    interval_count: number | null;
    has_free_trial: boolean;
    trial_interval: "day" | "week" | "month" | "year" | null;
    trial_interval_count: number | null;
    sort: number;
    status: "published" | "draft";
    created_at: string;
    updated_at: string;
  };
  relationships: {
    product: {
      data: {
        type: "products";
        id: string;
      };
    };
  };
}

export interface LemonSqueezyProduct {
  id: string;
  type: "products";
  attributes: {
    store_id: number;
    name: string;
    slug: string;
    description: string;
    status: "published" | "draft" | "pending";
    // ... other product attributes
  };
}

export interface PlanDetails extends LemonSqueezyVariant {
  checkout_url: string; // We'll add this manually based on your provided links
  product_details?: LemonSqueezyProduct; // To store fetched product name
}

// export interface UserSubscription {
//   id: string;
//   user_id: string;
//   lemon_squeezy_subscription_id: string;
//   lemon_squeezy_variant_id: string;
//   status: "active" | "trialing" | "past_due" | "cancelled" | "unpaid" | "expired" | string; // string for other statuses
//   renews_at: string | null;
//   ends_at: string | null;
//   trial_ends_at: string | null;
//   product_name?: string;
//   variant_name?: string;
// }

export interface UserSubscription {
  subscription_id: string; // LemonSqueezy subscription ID (stringified number)
  order_id: number; // Order ID
  product_id: number; // Product ID
  product_name: string; // Product name (e.g. "Platinum")
  variant_id: number; // Variant ID
  variant_name: string; // Variant name (e.g. "Default")
  status:
    | "active"
    | "trialing"
    | "past_due"
    | "cancelled"
    | "unpaid"
    | "expired"; // Subscription status
  renews_at: string; // ISO timestamp string
  ends_at: string | null; // ISO timestamp or null
  trial_ends_at: string | null; // ISO timestamp or null
  url: string; // Customer portal or billing management URL
}

// For webhook payload
export interface LemonSqueezySubscriptionWebhookAttributes {
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
  status: string; // "active", "cancelled", "expired", "past_due", "unpaid", "on_trial"
  status_formatted: string;
  card_brand: string | null;
  card_last_four: string | null;
  pause: null | {
    mode: "void" | "free";
    resumes_at: string | null;
  };
  cancelled: boolean;
  trial_ends_at: string | null;
  renews_at: string | null;
  ends_at: string | null; // This is important. If cancelled, it's when access ends.
  created_at: string;
  updated_at: string;
  test_mode: boolean;
  urls: {
    update_payment_method: string | null;
    customer_portal: string | null;
  };
}

export interface LemonSqueezyWebhookPayload {
  meta: {
    event_name:
      | "subscription_created"
      | "subscription_updated"
      | "subscription_cancelled"
      | string; // Add other events as needed
    custom_data?: {
      user_id?: string; // We will pass this
      // Add other custom data fields you might pass
    };
  };
  data: {
    type: "subscriptions";
    id: string; // Lemon Squeezy Subscription ID (e.g., "sub_...")
    attributes: LemonSqueezySubscriptionWebhookAttributes;
  };
}
