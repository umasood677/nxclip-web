import { toast } from "sonner";
import { identityApi } from "./apiClient";
import { setPersistedUser, getPersistedUser } from "./auth/authService";

export type CheckoutPlanId = "pro_monthly" | "pro_annual" | "studio_monthly" | "studio_annual";

/** Start Stripe Checkout (full-page redirect). Guests should be sent to /signup first. */
export async function startCheckout(
  planId: CheckoutPlanId,
  billingInterval?: "monthly" | "annual",
): Promise<void> {
  const res = await identityApi.createCheckout({
    planId,
    billingInterval,
  });
  if (!res?.checkoutUrl) {
    throw new Error("Checkout URL missing from billing service");
  }
  window.location.href = res.checkoutUrl;
}

export async function startProCheckout(billingCycle: "monthly" | "yearly"): Promise<void> {
  const planId = billingCycle === "yearly" ? "pro_annual" : "pro_monthly";
  const interval = billingCycle === "yearly" ? "annual" : "monthly";
  await startCheckout(planId, interval);
}

/** Apply auth response after checkout confirm — updates tokens + returns plan. */
export function applyAuthBillingResponse(auth: {
  accessToken: string;
  refreshToken: string;
  user: { plan?: string; email?: string; username?: string; id?: string; [k: string]: unknown };
}): string {
  const existing = getPersistedUser() || {};
  setPersistedUser({
    ...existing,
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
    email: auth.user?.email || existing.email,
    username: auth.user?.username || existing.username,
    id: auth.user?.id || existing.id,
  });
  return (auth.user?.plan || "FREE").toString().toLowerCase();
}

export function toastBillingError(err: unknown, fallback = "Billing request failed") {
  let message = fallback;
  if (err instanceof Error) {
    message = err.message || fallback;
  } else if (err && typeof err === "object") {
    const body = err as { message?: string; code?: string; statusCode?: number };
    if (typeof body.message === "string" && body.message.trim()) {
      message = body.message;
    }
    if (body.code === "STRIPE_NOT_CONFIGURED" || body.code === "PRICE_NOT_CONFIGURED") {
      message = `${body.message || message} Redeploy identity-service after setting GitHub Stripe secrets (or fill apps/identity-service/.env for local).`;
    }
  }
  toast.error(message);
}
