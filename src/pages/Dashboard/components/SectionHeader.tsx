import { memo } from "react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

export const SectionHeader = memo(({ title, subtitle }: SectionHeaderProps) => (
  <div className="mb-3">
    <h3 className="text-lg font-display font-bold text-foreground tracking-tight">{title}</h3>
    {subtitle && (
      <p className="text-sm font-medium text-muted-foreground mt-1 leading-snug">{subtitle}</p>
    )}
  </div>
));

SectionHeader.displayName = "SectionHeader";
