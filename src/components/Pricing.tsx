import { useState } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { PRICING_PLANS } from "../lib/pricing-data";

export default function Pricing() {
  const { t } = useTranslation();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");

  return (
    <section id="pricing" className="ui-landing-section">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-primary/5 rounded-full blur-[140px]" />
      </div>

      <div className="ui-container-landing relative z-10">
        <div className="flex flex-col items-center text-center mb-10 md:mb-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="ui-landing-label !mb-4"
          >
            <span>{t("pricing.label")}</span>
          </motion.div>
          <h2 className="ui-landing-title mx-auto">{t("pricing.title")}</h2>

          <div className="mt-4 flex flex-col items-center gap-3 px-4 w-full">
            <Tabs
              value={billingCycle}
              onValueChange={(v) => setBillingCycle(v as "monthly" | "yearly")}
              className="w-full max-w-[280px]"
            >
              <TabsList className="ui-tabs-list grid w-full grid-cols-2 h-11 mb-2">
                <TabsTrigger value="monthly" className="ui-tabs-trigger">
                  {t("pricing.monthly")}
                </TabsTrigger>
                <TabsTrigger value="yearly" className="ui-tabs-trigger">
                  {t("pricing.yearly")}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider"
            >
              <Sparkles size={11} fill="currentColor" className="shrink-0" />
              <span>{t("pricing.page.discount")}</span>
            </motion.div>
          </div>
        </div>

        {/* Room above for the Pro badge; no scale transform so nothing clips. */}
        <div className="grid md:grid-cols-3 gap-5 lg:gap-6 items-stretch pt-5">
          {PRICING_PLANS.map((plan, index) => {
            const features = t(`pricing.plans.${plan.id}.features`, {
              returnObjects: true,
            }) as string[];

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className={cn(
                  "relative flex h-full flex-col rounded-xl border bg-card p-6",
                  plan.popular
                    ? "z-10 border-primary shadow-xl shadow-primary/10 ring-1 ring-primary/25"
                    : "border-border hover:border-primary/20",
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-3.5 py-1 text-[10px] font-bold tracking-[0.18em] text-primary-foreground shadow-lg">
                    {t("pricing.popular")}
                  </div>
                )}

                <div className="mb-4">
                  <div
                    className={cn(
                      "mb-3 flex h-9 w-9 items-center justify-center rounded-lg",
                      plan.popular
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-primary",
                    )}
                  >
                    <plan.icon size={18} />
                  </div>
                  <h3 className="ui-card-title !mb-0.5">
                    {t(`pricing.plans.${plan.id}.name`)}
                  </h3>
                  <p className="mb-3 text-xs font-medium tracking-tight text-muted-foreground">
                    {t(`pricing.plans.${plan.id}.who`)}
                  </p>

                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-4xl font-bold text-foreground lg:text-[2.75rem]">
                      $
                      {billingCycle === "yearly"
                        ? plan.priceYearly
                        : plan.priceMonthly}
                    </span>
                    <span className="text-xs font-bold tracking-widest text-muted-foreground">
                      /{t("pricing.mo")}
                    </span>
                  </div>
                  {billingCycle === "yearly" && plan.priceYearly > 0 && (
                    <p className="mt-1 text-[10px] font-medium text-muted-foreground">
                      {t("pricing.billing_annually")} ${plan.priceYearly * 12}
                    </p>
                  )}
                  {billingCycle === "monthly" && (
                    <p className="mt-1 text-[10px] font-medium text-muted-foreground">
                      {plan.priceMonthly === 0
                        ? t("pricing.infinite_potential")
                        : t("pricing.billed_monthly")}
                    </p>
                  )}
                  {/* Keep header height even when Free has no annual line. */}
                  {billingCycle === "yearly" && plan.priceYearly === 0 && (
                    <p className="mt-1 text-[10px] font-medium text-muted-foreground">
                      {t("pricing.infinite_potential")}
                    </p>
                  )}
                </div>

                <ul className="mb-5 space-y-2.5">
                  {features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-sm font-medium text-foreground/80"
                    >
                      <CheckCircle2
                        size={14}
                        className={cn(
                          "mt-0.5 shrink-0",
                          plan.popular ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                      <span className="text-[13px] leading-snug">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-1">
                  <Button
                    variant={plan.popular ? "default" : "outline"}
                    size="xl"
                    asChild
                    className={cn(
                      "w-full font-bold",
                      plan.popular &&
                        "bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90",
                    )}
                  >
                    <Link to="/signup">
                      {plan.popular
                        ? t("pricing.upgrade")
                        : t("pricing.get_started")}
                    </Link>
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/pricing"
            className="group inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition-colors hover:text-primary"
          >
            {t("pricing.compare")}
            <ArrowRight
              size={14}
              className="transition-transform group-hover:translate-x-1 rtl:rotate-180"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
