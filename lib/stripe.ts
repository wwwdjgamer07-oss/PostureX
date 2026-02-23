import { loadStripe } from "@stripe/stripe-js";
import Stripe from "stripe";

let stripePromise: ReturnType<typeof loadStripe> | null = null;
let stripeServer: Stripe | null = null;

export function getStripeClient() {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error("Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
  }

  if (!stripePromise) {
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}

export function getStripeServer() {
  if (!stripeServer) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("Missing STRIPE_SECRET_KEY");
    }
    stripeServer = new Stripe(key, {
      apiVersion: "2025-02-24.acacia",
      typescript: true
    });
  }
  return stripeServer;
}

export const STRIPE_PRICE_IDS = {
  PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY || "",
  PRO_YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY || "",
  ENTERPRISE_MONTHLY: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || "",
  ENTERPRISE_YEARLY: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || ""
};
