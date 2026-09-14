import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";

export default function BillingCancelPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-foreground">Checkout canceled</h1>
        <p className="text-sm text-muted-foreground">
          No charge was made. You can stay on Free or try upgrading again anytime.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <Button asChild>
            <Link to="/upgrade">Back to plans</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/feed">Continue with Free</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
