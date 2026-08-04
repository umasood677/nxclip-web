import React from "react";
import { Skeleton } from "../../../components/ui/skeleton";

/** Placeholder that mirrors the justified gallery the library renders once loaded. */
export function LibrarySkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48 rounded-lg" />
          <Skeleton className="h-4 w-64 opacity-50" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-32 rounded-lg" />
          <Skeleton className="h-11 w-40 rounded-lg" />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <Skeleton className="h-10 w-full md:w-96 rounded-lg" />
        <div className="flex gap-2 w-full md:w-auto">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {[
          ["16/9", "9/16", "1/1"],
          ["1/1", "16/9", "4/5", "9/16"],
          ["9/16", "16/9", "1/1"],
        ].map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-4 h-48">
            {row.map((ratio, i) => (
              <div
                key={`${rowIndex}-${i}`}
                className="min-w-0 h-full rounded-[24px] overflow-hidden border border-white/5 bg-card/40"
                style={{ flexGrow: Number(ratio.split("/")[0]) / Number(ratio.split("/")[1]), flexBasis: 0 }}
              >
                <Skeleton className="h-full w-full rounded-none opacity-40" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
