import { motion } from "motion/react";

const METRICS = [
  { value: "Create", label: "AI images · memes · clips" },
  { value: "Moderate", label: "Quality before you ship" },
  { value: "Publish", label: "Feed + social Live" },
  { value: "Measure", label: "Real analytics overview" },
];

export default function CompactTrust() {
  return (
    <section className="border-y border-border/50 bg-background/70 backdrop-blur-sm">
      <div className="ui-container-landing py-6 md:py-7">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {METRICS.map((m, i) => (
            <motion.div
              key={m.value}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="text-center md:text-start"
            >
              <p className="font-display text-lg md:text-xl font-bold text-foreground tracking-tight">
                {m.value}
              </p>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{m.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
