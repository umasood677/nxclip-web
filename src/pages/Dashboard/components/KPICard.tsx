import { memo } from "react";
import { Card } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { cn } from "../../../lib/utils";
import type { ElementType } from "react";

export interface KPICardProps {
  label: string;
  value: string;
  trend: "up" | "down" | "neutral";
  status: string;
  icon: ElementType;
}

export const KPICard = memo(({ label, value, trend, status, icon: Icon }: KPICardProps) => {
  return (
    <Card className="ui-dashboard-kpi-card group cursor-pointer relative overflow-hidden p-5 rounded-xl border border-border bg-card shadow-soft hover:shadow-md hover:border-primary/35 transition-all duration-200">
      <div className="flex justify-between items-start mb-3 relative z-10">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
          <Icon size={16} />
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-[11px] h-5 px-2 border-none font-semibold rounded-md leading-none",
            trend === "up"
              ? "bg-teal-500/15 text-teal-700 dark:text-teal-300"
              : trend === "down"
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-foreground/80",
          )}
        >
          {status}
        </Badge>
      </div>
      <div className="space-y-1.5 relative z-10">
        <p className="text-xs font-semibold text-muted-foreground leading-none">{label}</p>
        <h3 className="text-2xl font-display font-bold text-foreground" dir="ltr">
          {value}
        </h3>
      </div>
    </Card>
  );
});

KPICard.displayName = "KPICard";
