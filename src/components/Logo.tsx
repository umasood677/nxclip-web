import React from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import logo from "../contents/images/nexa-logo.png";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  iconSize?: string;
  textSize?: string;
  gap?: string;
  showText?: boolean;
}

/** Graceful domain suffix — sits on the wordmark baseline, never shouts. */
export const BrandTld: React.FC<{ className?: string }> = ({ className }) => (
  <span
    className={cn(
      "font-medium lowercase leading-none tracking-tight text-muted-foreground/70",
      className,
    )}
  >
    .app
  </span>
);

export const Logo: React.FC<LogoProps> = ({
  className,
  iconSize = "w-10 h-10",
  textSize = "text-[11px]",
  gap = "gap-1",
  showText = true,
}) => {
  return (
    <Link to="/" className={cn("flex items-center cursor-pointer group", className)}>
      <motion.div
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.98 }}
        className={cn("flex items-end", gap)}
      >
        <div
          className={cn(
            "flex items-center justify-center overflow-hidden rounded-lg shadow-sm group-hover:shadow-md transition-shadow shrink-0",
            iconSize,
          )}
        >
          <img
            src={logo}
            alt="nxClip"
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        {showText && (
          <BrandTld className={cn("pb-[3px] -ms-0.5", textSize)} />
        )}
      </motion.div>
    </Link>
  );
};
