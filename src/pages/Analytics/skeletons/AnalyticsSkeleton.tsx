import React from "react";
import { Skeleton } from "../../../components/ui/skeleton";
import { Card, CardHeader, CardContent } from "../../../components/ui/card";

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header & Filter Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 text-start">
          <Skeleton className="h-9 w-40 rounded-lg" />
          <Skeleton className="h-4 w-64 opacity-50" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-40 rounded-lg opacity-40" />
        </div>
      </div>

      <AnalyticsOverviewSkeleton />
    </div>
  );
}

export function AnalyticsOverviewSkeleton() {
  return (
    <div className="space-y-8">
      {/* Analytics KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-white/5 bg-zinc-950/20 p-5">
            <div className="flex justify-between items-start mb-4">
              <Skeleton className="h-4 w-20 opacity-40" />
              <Skeleton className="h-8 w-8 rounded-lg opacity-20" />
            </div>
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-3 w-16 opacity-30" />
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-white/5 bg-zinc-950/40">
          <CardHeader className="flex flex-row items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24 opacity-30" />
          </CardHeader>
          <CardContent className="h-[350px] flex items-end gap-2 px-6 pb-10">
            {[...Array(12)].map((_, i) => (
              <Skeleton 
                key={i} 
                className="flex-1 rounded-t-sm opacity-20" 
                style={{ height: `${Math.random() * 80 + 20}%` }} 
              />
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-zinc-950/40">
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center py-4">
              <Skeleton className="h-48 w-48 rounded-full border-8 border-white/5" />
            </div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-3 rounded-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-3 w-10 opacity-40" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function AnalyticsAiSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="border-white/5 bg-zinc-950/40 p-6">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-64 opacity-50" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg opacity-40" />
          ))}
        </div>
      </Card>
    </div>
  );
}

export function AnalyticsAudienceSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="border-white/5 bg-zinc-950/40 p-6">
          <Skeleton className="h-5 w-32 mb-6" />
          <div className="space-y-4">
            {[...Array(5)].map((_, j) => (
              <div key={j} className="flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-48 rounded-full" />
                <Skeleton className="h-3 w-8" />
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function AnalyticsContentSkeleton() {
  return (
    <Card className="border-white/5 bg-zinc-950/40">
      <CardHeader className="flex flex-row items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-24 opacity-30" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0">
              <Skeleton className="h-12 w-10 rounded shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-20 opacity-40" />
              </div>
              <Skeleton className="h-4 w-16 opacity-30" />
              <Skeleton className="h-4 w-16 opacity-30" />
              <Skeleton className="h-4 w-8 opacity-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function AnalyticsCreativeSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="overflow-hidden border-white/5 bg-zinc-950/20">
          <Skeleton className="aspect-square w-full" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-2/3 opacity-50" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function AnalyticsGamesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-6 border-white/5 bg-zinc-950/40">
            <Skeleton className="h-5 w-24 mb-4" />
            <Skeleton className="h-10 w-full" />
          </Card>
        ))}
      </div>
      <Card className="border-white/5 bg-zinc-950/40 p-6">
        <Skeleton className="h-[400px] w-full" />
      </Card>
    </div>
  );
}

export function AnalyticsGeoIntelSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2 border-white/5 bg-zinc-950/40 p-6 h-[500px]">
        <Skeleton className="h-full w-full rounded-lg" />
      </Card>
      <Card className="border-white/5 bg-zinc-950/40 p-6">
        <Skeleton className="h-5 w-32 mb-6" />
        <div className="space-y-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function AnalyticsPlatformsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="border-white/5 bg-zinc-950/40 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="space-y-4">
            {[...Array(4)].map((_, j) => (
              <div key={j} className="flex justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function AnalyticsRetentionSkeleton() {
  return (
    <Card className="border-white/5 bg-zinc-950/40 p-6">
      <CardHeader className="px-0">
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-64 opacity-50" />
      </CardHeader>
      <CardContent className="px-0 h-[400px]">
        <Skeleton className="h-full w-full rounded-lg opacity-20" />
      </CardContent>
    </Card>
  );
}
