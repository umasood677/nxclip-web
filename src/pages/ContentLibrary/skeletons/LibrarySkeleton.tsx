import React from "react";
import { Skeleton } from "../../../components/ui/skeleton";
import { Card } from "../../../components/ui/card";

export function LibrarySkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Section */}
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

      {/* Grid Controls (Search + Filters) */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <Skeleton className="h-10 w-full md:w-96 rounded-lg" />
        <div className="flex gap-2 w-full md:w-auto">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* Content Grid Skeletons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-card/40 border border-white/5 rounded-xl overflow-hidden flex flex-col justify-between">
            {/* Thumbnail skeleton */}
            <div className="aspect-video w-full bg-muted/20 relative p-3 flex justify-between items-start">
              <Skeleton className="h-6 w-16 rounded-full opacity-60" />
              <Skeleton className="h-6 w-20 rounded-full opacity-60" />
            </div>
            
            {/* Body skeleton */}
            <div className="p-4 space-y-3">
              <Skeleton className="h-4 w-3/4 rounded-md" />
              <Skeleton className="h-3 w-1/2 opacity-40 rounded-md" />
            </div>

            {/* Footer skeleton */}
            <div className="p-3 bg-muted/10 border-t border-white/5 flex items-center justify-between">
              <div className="flex gap-3">
                <Skeleton className="h-3 w-10 opacity-30" />
                <Skeleton className="h-3 w-10 opacity-30" />
              </div>
              <Skeleton className="h-7 w-7 rounded-lg opacity-20" />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center pt-4">
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-9 rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}
