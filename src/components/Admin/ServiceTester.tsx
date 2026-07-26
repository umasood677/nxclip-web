import { useState, useEffect } from "react";
import { 
  SlidersHorizontal,
  Wifi, 
  WifiOff, 
  Database, 
  RefreshCcw, 
  Flame, 
  ToggleLeft, 
  ToggleRight, 
  Play, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle,
  Server
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";
import { resolveBaseGatewayUrl, getEnvVarNameForEnv } from "../../services/apiClient";
import { safeLocalStorage, safeSessionStorage } from "../../lib/safeStorage";
import { useDispatch, useSelector } from "react-redux";
import { setApiEnv, setConnectionStatus, selectConnectionStatus } from "../../store/slices/uiSlice";
import { useLocalStorage } from "../../hooks/useLocalStorage";

export function ServiceTester() {
  const dispatch = useDispatch();
  const connectionStatus = useSelector(selectConnectionStatus);

  // Custom localStorage-synced persistent states
  const [apiEnvVal, setApiEnvVal] = useLocalStorage<"development" | "staging" | "production">("nxclip_api_env", "development");

  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    statusText: string;
    timestamp: string;
    targetUrl?: string;
    errorDetails?: string;
  } | null>(null);

  // Automated synchronization to keep Redux store responsive and fully in sync with persistent states
  useEffect(() => {
    dispatch(setApiEnv(apiEnvVal));
  }, [apiEnvVal, dispatch]);

  const handleRunPingDiagnostics = async (
    overrideEnv?: "development" | "staging" | "production"
  ) => {
    setIsTestingConnection(true);
    setTestResult(null);

    const now = new Date().toLocaleTimeString();
    const targetEnv = overrideEnv !== undefined ? overrideEnv : apiEnvVal;
    const targetGatewayUrl = resolveBaseGatewayUrl(targetEnv);

    // Update connection status to "testing"
    dispatch(setConnectionStatus({ env: targetEnv, status: "testing" }));

    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 8000); // 8-second timeout for Cloud Run cold starts

      const targetUrl = `${targetGatewayUrl}/health`;
      const isCrossOrigin = typeof window !== "undefined" && !targetUrl.startsWith(window.location.origin) && targetUrl.startsWith("http");

      let response: Response;

      // Primary attempt: Direct fetch to verify connectivity AND CORS
      try {
        response = await fetch(targetUrl, {
          method: "GET",
          signal: controller.signal,
        });
      } catch (err) {
        // If it's cross-origin and failed, it might be a CORS block
        if (isCrossOrigin && !(err instanceof DOMException && err.name === "AbortError")) {
          // Try secondary attempt via proxy to confirm if it's online but CORS-blocked
          const proxyUrl = `/api/proxy-health?url=${encodeURIComponent(targetUrl)}`;
          try {
            const proxyResponse = await fetch(proxyUrl, { method: "GET", signal: controller.signal });
            if (proxyResponse.ok) {
              // Online and reachable via Proxy!
              setIsTestingConnection(false);
              dispatch(setConnectionStatus({ env: targetEnv, status: "connected" }));
              setTestResult({
                success: true,
                statusText: "200 Connected (CORS Bypassed)",
                timestamp: now,
                targetUrl,
                errorDetails: undefined
              });
              toast.success(`Connected to ${targetEnv} gateway via Proxy!`, {
                description: "Direct connection was blocked by CORS, but requests are automatically and safely routed through the server proxy."
              });
              clearTimeout(id);
              return;
            }
          } catch { /* ignore proxy failure */ }
        }
        throw err; // Re-throw to main catch if it wasn't a CORS block we handled
      }

      clearTimeout(id);

      if (response.ok) {
        setIsTestingConnection(false);
        dispatch(setConnectionStatus({ env: targetEnv, status: "connected" }));
        setTestResult({
          success: true,
          statusText: "200 Connected (API Gateway Online)",
          timestamp: now,
          targetUrl,
          errorDetails: undefined
        });
        toast.success("Successfully connected to API Gateway!");
      } else {
        setIsTestingConnection(false);
        dispatch(setConnectionStatus({ env: targetEnv, status: "failed" }));
        
        let errorDetails = `Gateway at ${targetUrl} returned status code ${response.status}.`;
        
        try {
          const errJson = await response.json();
          if (errJson?.proxySource === "nxclip-server") {
            errorDetails = `Internal Proxy Error (${response.status}). The server-side proxy attempted to reach ${targetUrl} but the target gateway was unreachable or rejected the request. ${errJson.error || ""}`;
          } else if (errJson?.error) {
            errorDetails += ` Details: ${errJson.error}`;
          }
        } catch (e) {
          // Fallback if parsing fails
        }

        setTestResult({
          success: false,
          statusText: `${response.status} Error`,
          timestamp: now,
          targetUrl,
          errorDetails
        });
        toast.warning("Gateway returned an unexpected status code.");
      }
    } catch (err: any) {
      setIsTestingConnection(false);
      dispatch(setConnectionStatus({ env: targetEnv, status: "failed" }));
      const isTimeout = err?.name === "AbortError" || err?.message?.toLowerCase().includes("abort") || err?.message?.toLowerCase().includes("signal");
      
      const now = new Date().toLocaleTimeString();
      let errorDesc = "";
      
      if (isTimeout) {
        errorDesc = `Connection timed out (8s limit exceeded). The target service at ${targetGatewayUrl} is likely cold-starting (scaled down to zero) or entirely offline.`;
      } else {
        errorDesc = `Network / Connection Block: The browser failed to establish a network connection to the target endpoint. Error: ${err?.message || "Unknown Connection Failure"}`;
      }

      setTestResult({
        success: false,
        statusText: isTimeout ? "Connection Timeout" : "Network Block / Offline",
        timestamp: now,
        targetUrl: `${targetGatewayUrl}/health`,
        errorDetails: errorDesc
      });
      toast.error("Gateway connection failed.");
    }
  };

  const handlePurgeCaches = () => {
    try {
      let count = 0;
      safeLocalStorage.keys().forEach((key) => {
        if (key.startsWith("nx_api_cache_")) {
          safeLocalStorage.removeItem(key);
          count++;
        }
      });
      safeSessionStorage.keys().forEach((key) => {
        if (key.startsWith("nx_api_cache_")) {
          safeSessionStorage.removeItem(key);
          count++;
        }
      });
      toast.success(`Purged ${count} API response cache entries.`);
    } catch (err) {
      toast.error("Failed to clean browser caches safely.");
    }
  };

  return (
    <Card className="border border-white/10 bg-black/40 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden mb-8">
      <CardHeader className="p-6 border-b border-white/5 bg-gradient-to-r from-white/[0.01] to-transparent">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-primary" />
          <CardTitle className="text-sm font-bold text-white tracking-wide uppercase">
            Service Tester & Environment Controller
          </CardTitle>
        </div>
        <CardDescription className="text-xs text-neutral-400">
          Validate live gateway integration and control localStorage environment flags. Operating in strictly Live Mode.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Dynamic Integration & Routing Overview Callout */}
        <div className="p-4 rounded-xl border border-white/10 bg-zinc-950/70 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider font-mono">
                Active System Routing
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="size-2 rounded-full animate-pulse bg-emerald-500" />
                <span className="text-sm font-semibold text-white">
                  Main API Gateway (Live Mode)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-[10px] uppercase tracking-wider font-semibold py-0.5 px-2 font-mono bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                REST API GATEWAY ROUTING
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-white/[0.05] text-[11px]">
            <div>
              <span className="text-neutral-500 font-medium">Target Gateway Endpoint:</span>
              <div className="font-mono text-neutral-300 mt-1 select-all bg-black/40 px-2 py-1 rounded border border-white/5 truncate flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="truncate">{resolveBaseGatewayUrl(apiEnvVal)}</span>
                  <span className="text-[9px] text-neutral-500 uppercase font-bold shrink-0 ml-2">
                    {apiEnvVal}
                  </span>
                </div>
                <div className="text-[8px] text-neutral-600 uppercase tracking-widest font-bold border-t border-white/5 pt-1">
                  Source: {getEnvVarNameForEnv(apiEnvVal)}
                </div>
              </div>
            </div>
            <div>
              <span className="text-neutral-500 font-medium">Auto-Recovery Strategy:</span>
              <p className="text-neutral-400 mt-1 leading-relaxed">
                Direct connection mode. If any microservice times out, the circuit breaker protects the UI. All operations are strictly routed to cloud microservices.
              </p>
            </div>
          </div>
        </div>

        {/* State Toggle Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1: Environment Profile Picker */}
          <div className="p-5 rounded-xl border border-white/5 bg-neutral-900/30 flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-200 tracking-wide uppercase flex items-center gap-2">
                  <Server className="size-3.5 text-purple-400" />
                  API Env Profile
                </span>
                <Badge variant="outline" className="text-[10px] font-mono tracking-wider font-semibold border-white/5 text-purple-400">
                  {apiEnvVal}
                </Badge>
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Manually control the <code className="text-purple-400 font-mono bg-neutral-950 px-1 py-0.5 rounded">nxclip_api_env</code> variable. Directs endpoint targeting profiles.
              </p>
            </div>

            <div className="bg-zinc-950/65 p-1 rounded-xl flex border border-white/5">
              {(["development", "staging", "production"] as const).map((env) => (
                <button
                  key={env}
                  onClick={() => {
                    setApiEnvVal(env);
                    safeLocalStorage.setItem("nxclip_api_env", env);
                    toast.success(`Switched target environment context to "${env}"`);
                    handleRunPingDiagnostics(env);
                  }}
                  className={cn(
                    "flex-1 py-1 text-center text-[10px] font-bold uppercase tracking-wider rounded-lg relative transition-all outline-none",
                    apiEnvVal === env ? "text-purple-400 bg-neutral-900 shadow-inner border border-white/5" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {env.slice(0, 4)}
                </button>
              ))}
            </div>
          </div>

          {/* Card 2: Diagnostics and Ping Panel */}
          <div className="p-5 rounded-xl border border-white/5 bg-neutral-900/30 flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-neutral-200 tracking-wide uppercase flex items-center gap-2">
                <Wifi className="size-3.5 text-emerald-400" />
                Live Connection Probe
              </span>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Validate whether the API Gateway serves packets smoothly. Triggers a test probe fetch.
              </p>
            </div>

            {/* Always visible Target URL Display */}
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest font-mono">
                    Target Ping Gateway
                  </span>
                  {typeof window !== "undefined" && !(`${resolveBaseGatewayUrl(apiEnvVal)}/health`).startsWith(window.location.origin) && (
                    <Badge variant="outline" className="text-[8px] py-0 px-1 border-purple-500/30 text-purple-400 bg-purple-500/5 h-3.5">
                      PROXY MODE
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[8px] text-emerald-500/80 font-bold font-mono tracking-tighter">ACTIVE</span>
                </div>
              </div>
              <div className="font-mono text-[10px] text-neutral-300 select-all bg-black/20 px-2 py-1.5 rounded border border-white/5 truncate">
                {resolveBaseGatewayUrl(apiEnvVal)}/health
              </div>
            </div>

            {/* Test result display */}
            {testResult && (
              <div className="space-y-3 pt-1">
                {/* Main Status Bar */}
                <div className={cn(
                  "rounded-lg border p-2.5 text-[11px] font-mono flex items-center justify-between",
                  testResult.success 
                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" 
                    : "bg-destructive/5 border-destructive/20 text-destructive"
                )}>
                  <span className="flex items-center gap-1.5 overflow-hidden">
                    {testResult.success ? (
                      <CheckCircle2 className="size-3 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="size-3 text-destructive shrink-0" />
                    )}
                    <span className="font-semibold uppercase tracking-wider">
                      Gateway: {testResult.success ? "ONLINE" : "OFFLINE / BLOCK"}
                    </span>
                  </span>
                  <span className="text-[9px] text-neutral-400 font-mono shrink-0">
                    {testResult.timestamp}
                  </span>
                </div>

                {/* Precise Error Details (If Failed) */}
                {!testResult.success && testResult.errorDetails && (
                  <div className="p-3 rounded-lg bg-zinc-950/80 border border-destructive/20 text-[10px] space-y-1">
                    <span className="font-bold text-destructive uppercase tracking-wider font-mono block">
                      Diagnosis & Reason:
                    </span>
                    <p className="leading-relaxed font-sans text-neutral-300">
                      {testResult.errorDetails}
                    </p>
                  </div>
                )}
                
                {/* Gateway Online success indicator */}
                {testResult.success && (
                  <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-[10px] space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-wider font-mono">
                      <span className="size-1.5 rounded-full bg-emerald-400 shrink-0" />
                      Live Transaction Syncing
                    </div>
                    <p className="leading-relaxed text-neutral-300 font-sans">
                      Direct connection established. Transactions are routed live to the cloud microservices.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRunPingDiagnostics()}
                className="flex-1 h-8 text-[11px] border-white/10 hover:bg-white/5 font-semibold"
                disabled={isTestingConnection}
              >
                <Play className={cn("size-3 mr-2 text-emerald-400", isTestingConnection && "animate-spin")} />
                {isTestingConnection ? "Probing Upstream..." : "Ping API Gateway"}
              </Button>
            </div>
          </div>
        </div>

        {/* Environmental variables inspect row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5 pt-5">
          
          <div className="p-3 bg-black/30 rounded border border-white/5 flex flex-col justify-between space-y-1.5">
            <span className="text-[9px] font-mono tracking-wider text-neutral-500 uppercase">
              VARIABLE: nxclip_api_env
            </span>
            <div className="flex items-center justify-between">
              <code className="text-xs font-mono font-bold text-purple-400">
                "{apiEnvVal}"
              </code>
              <span className="text-[9px] font-bold text-neutral-500 font-mono">
                [LocalStorage]
              </span>
            </div>
          </div>

          <div className="p-3 bg-black/30 rounded border border-white/5 flex flex-col justify-between space-y-1.5">
            <span className="text-[9px] font-mono tracking-wider text-neutral-500 uppercase">
              Storage Cache Maintenance
            </span>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] text-neutral-400 leading-tight">
                Clear network response caches.
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePurgeCaches}
                className="h-7 px-2 text-[9px] font-bold text-destructive hover:text-white hover:bg-destructive/10 border border-white/5 shrink-0 uppercase"
              >
                <Trash2 className="size-3 mr-1" />
                Purge
              </Button>
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}

