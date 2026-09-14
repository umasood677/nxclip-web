import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { identityApi } from "../../services/apiClient";
import { applyAuthBillingResponse, toastBillingError } from "../../services/billingService";
import { useAppDispatch } from "../../store/hooks";
import { setAuthProfile, selectAuthProfile } from "../../store/slices/authSlice";
import { useAppSelector } from "../../store/hooks";

export default function BillingSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const profile = useAppSelector(selectAuthProfile);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("Confirming your Pro subscription…");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!sessionId) {
        setStatus("error");
        setMessage("Missing checkout session. If you paid, open Settings → Billing.");
        return;
      }
      try {
        const auth = await identityApi.confirmCheckoutSession(sessionId);
        if (cancelled) return;
        const plan = applyAuthBillingResponse(auth);
        dispatch(
          setAuthProfile({
            ...(profile || {}),
            ...(auth.user as any),
            plan: plan as any,
          }),
        );
        setStatus("ok");
        setMessage("You're on Pro. Unlimited generations and watermark-free exports are unlocked.");
        toast.success("Welcome to Pro!");
      } catch (err) {
        if (cancelled) return;
        // Webhook may have already upgraded — refresh /users/me as fallback.
        try {
          const me = await identityApi.getUserMe();
          if (cancelled) return;
          const plan = (me.plan || "free").toLowerCase();
          dispatch(setAuthProfile({ ...(profile || {}), ...me, plan }));
          if (plan === "pro" || plan === "studio") {
            setStatus("ok");
            setMessage("You're on Pro. Unlimited generations and watermark-free exports are unlocked.");
            toast.success("Welcome to Pro!");
            return;
          }
        } catch {
          // ignore
        }
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Could not confirm payment yet.");
        toastBillingError(err, "Payment confirmation pending — try refreshing in a moment.");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center space-y-4">
        {status === "loading" && <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />}
        {status === "ok" && <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />}
        {status === "error" && <XCircle className="mx-auto h-10 w-10 text-destructive" />}
        <h1 className="font-display text-2xl font-bold text-foreground">
          {status === "ok" ? "Upgrade complete" : status === "loading" ? "Finishing checkout" : "Almost there"}
        </h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={() => navigate("/image-studio")}>Open Image Studio</Button>
          <Button variant="outline" asChild>
            <Link to="/settings">Billing settings</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
