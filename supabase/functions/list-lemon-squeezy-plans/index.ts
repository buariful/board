import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface PlanConfig {
  variantId: string; // e.g., "560079" (numeric ID for API)
  checkoutUrlPath: string; // e.g., "e761a092-f967-4aa6-842a-17b36238ef9d" (for constructing checkout URL)
}

// Your specific plans
const MY_PLANS_CONFIG: PlanConfig[] = [
  { variantId: "560079", checkoutUrlPath: "e761a092-f967-4aa6-842a-17b36238ef9d" },
  { variantId: "560099", checkoutUrlPath: "cf2a4077-b5ee-4c49-a7e1-540757f7f310" },
];

const LEMONSQUEEZY_API_KEY = Deno.env.get("LEMONSQUEEZY_API_KEY");
const LEMONSQUEEZY_STORE_SUBDOMAIN = "ardev"; // Replace 'ardev' with your actual LemonSqueezy store subdomain
const LEMONSQUEEZY_API_BASE = "https://api.lemonsqueezy.com/v1";

serve(async (req) => {
  // Handle OPTIONS request for CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!LEMONSQUEEZY_API_KEY) {
    console.error("LEMONSQUEEZY_API_KEY is not set.");
    return new Response(JSON.stringify({ error: "LemonSqueezy API key not configured." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
   if (!LEMONSQUEEZY_STORE_SUBDOMAIN) {
    console.error("LEMONSQUEEZY_STORE_SUBDOMAIN is not set.");
    return new Response(JSON.stringify({ error: "LemonSqueezy store subdomain not configured." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const plansDetailsPromises = MY_PLANS_CONFIG.map(async (planConfig) => {
      const response = await fetch(`${LEMONSQUEEZY_API_BASE}/variants/${planConfig.variantId}?include=product`, {
        headers: {
          Authorization: `Bearer ${LEMONSQUEEZY_API_KEY}`,
          Accept: "application/vnd.api+json",
          "Content-Type": "application/vnd.api+json",
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Error fetching variant ${planConfig.variantId}: ${response.status}`, errorBody);
        // Return null or a specific error structure for this plan if you want to show partial results
        return null; 
      }

      const { data: variantData, included } = await response.json();
      
      let productDetails = null;
      if (included && included.length > 0) {
        productDetails = included.find((item: any) => item.type === "products" && item.id === variantData.relationships.product.data.id);
      }

      // Construct the full checkout URL
      // Example: https://[your-store].lemonsqueezy.com/buy/[checkout-path]
      const checkout_url = `https://${LEMONSQUEEZY_STORE_SUBDOMAIN}.lemonsqueezy.com/buy/${planConfig.checkoutUrlPath}`;

      return {
        ...variantData, // Spread all variant data
        product_details: productDetails, // Add fetched product details
        checkout_url: checkout_url, // Add the constructed checkout URL
      };
    });

    const resolvedPlansDetails = (await Promise.all(plansDetailsPromises)).filter(plan => plan !== null);

    return new Response(JSON.stringify(resolvedPlansDetails), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Failed to fetch LemonSqueezy plans:", error);
    return new Response(JSON.stringify({ error: error.message || "An unexpected error occurred." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});