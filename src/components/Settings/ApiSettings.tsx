import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { setMockApiEnabled, setApiEnv } from "../../store/slices/uiSlice";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { Database, Server, ShieldAlert, Sparkles, AlertCircle } from "lucide-react";
import { cn } from "../../lib/utils";
import { isCorsToastEnabled, setCorsToastEnabled, triggerTestCorsError } from "../../lib/corsInterceptor";

export function ApiSettings() {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  // Load localStorage-synced state using useLocalStorage custom hook
  const [mockApiVal, setMockApiVal] = useLocalStorage<"true" | "false">("nxclip_mock_api", "false");
  const [apiEnvVal, setApiEnvVal] = useLocalStorage<"development" | "staging" | "production">("nxclip_api_env", "development");
  const [corsToastState, setCorsToastState] = useState<boolean>(() => isCorsToastEnabled());

  // Keep Redux in sync whenever persistent state changes
  useEffect(() => {
    const isMock = mockApiVal === "true";
    dispatch(setMockApiEnabled(isMock));
  }, [mockApiVal, dispatch]);

  useEffect(() => {
    dispatch(setApiEnv(apiEnvVal));
  }, [apiEnvVal, dispatch]);

  const handleMockChange = (checked: boolean) => {
    const newVal = checked ? "true" : "false";
    setMockApiVal(newVal);
    toast.success(
      checked 
        ? "Mock API sandbox mode enabled" 
        : "Live gateway API routing restored"
    );
  };

  const handleEnvChange = (env: "development" | "staging" | "production") => {
    setApiEnvVal(env);
    toast.success(`API environment context updated to "${env}"`);
  };

  const handleCorsToastToggle = (checked: boolean) => {
    setCorsToastEnabled(checked);
    setCorsToastState(checked);
    toast.info(
      checked 
        ? "CORS Error Toast Notifications Enabled" 
        : "CORS Error Toast Notifications Disabled"
    );
  };

  const handleTestCorsToast = () => {
    triggerTestCorsError();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h3 className="text-2xl font-display font-bold text-foreground mb-2">API Integration Settings</h3>
        <p className="text-muted-foreground font-sans text-sm">
          Configure API connection endpoints, simulate mocked responses, and map active development env environments.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Mock API Toggle Card */}
        <Card className="border border-white/10 bg-black/40 backdrop-blur-md rounded-2xl overflow-hidden shadow-xl">
          <CardHeader className="p-6 border-b border-white/5 bg-gradient-to-r from-white/[0.01] to-transparent">
            <div className="flex items-center gap-2">
              <Database className="size-4 text-amber-400" />
              <div className="flex flex-col">
                <CardTitle className="text-sm font-bold text-white tracking-wide uppercase">
                  Mock API Simulation
                </CardTitle>
                <CardDescription className="text-xs text-neutral-400 mt-0.5">
                  Simulate static server responses without calling the real development servers.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-zinc-950/45 border border-white/5 rounded-xl">
              <div className="space-y-1 pr-4">
                <Label htmlFor="mock-api-switch" className="text-xs font-bold text-zinc-200 uppercase tracking-widest font-mono">
                  Mock Response Interceptor
                </Label>
                <p className="text-[11px] text-zinc-400 leading-normal font-sans">
                  When enabled, the application bypasses remote gateway queries and resolves offline mocked records.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={mockApiVal === "true" ? "default" : "outline"} className={cn(
                  "text-[10px] font-mono tracking-wider font-semibold",
                  mockApiVal === "true" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "text-neutral-500 border-white/5"
                )}>
                  {mockApiVal === "true" ? "Mock Enabled" : "Live Routing"}
                </Badge>
                <Switch
                  id="mock-api-switch"
                  checked={mockApiVal === "true"}
                  onCheckedChange={handleMockChange}
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Environment Selection Card */}
        <Card className="border border-white/10 bg-black/40 backdrop-blur-md rounded-2xl overflow-hidden shadow-xl">
          <CardHeader className="p-6 border-b border-white/5 bg-gradient-to-r from-white/[0.01] to-transparent">
            <div className="flex items-center gap-2">
              <Server className="size-4 text-purple-400" />
              <div className="flex flex-col">
                <CardTitle className="text-sm font-bold text-white tracking-wide uppercase">
                  Target API Environment
                </CardTitle>
                <CardDescription className="text-xs text-neutral-400 mt-0.5">
                  Direct networking clusters to target specific deploy and pipeline profiles.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-3">
              <Label className="text-xs font-bold text-zinc-200 uppercase tracking-widest font-mono block">
                Active Env Cluster Profile
              </Label>
              
              <div className="bg-zinc-950/65 p-1 rounded-xl flex border border-white/5 w-full max-w-md">
                {(["development", "staging", "production"] as const).map((env) => (
                  <button
                    key={env}
                    onClick={() => handleEnvChange(env)}
                    className={cn(
                      "flex-1 py-2 text-center text-[10px] font-bold uppercase tracking-wider rounded-lg relative transition-all outline-none",
                      apiEnvVal === env 
                        ? "text-purple-400 bg-neutral-900 shadow-inner border border-white/5" 
                        : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    {env}
                  </button>
                ))}
              </div>
              
              <p className="text-[11px] text-zinc-400 leading-normal font-sans pt-1">
                Your environment affects the endpoints targeted by analytics, user credentials, and workspace compilation servers.
              </p>
            </div>
          </CardContent>
        </Card>
        {/* CORS Error Toast Developer Inspector Card */}
        <Card className="border border-white/10 bg-black/40 backdrop-blur-md rounded-2xl overflow-hidden shadow-xl">
          <CardHeader className="p-6 border-b border-white/5 bg-gradient-to-r from-red-500/5 to-transparent">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-red-400" />
              <div className="flex flex-col">
                <CardTitle className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
                  CORS Error Inspector & Toaster
                  <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-[9px] font-mono">DEV MODE</Badge>
                </CardTitle>
                <CardDescription className="text-xs text-neutral-400 mt-0.5">
                  Automatically catches cross-origin security blocks across Fetch, Axios, and XHR to show triggering URLs.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-zinc-950/45 border border-white/5 rounded-xl">
              <div className="space-y-1 pr-4">
                <Label htmlFor="cors-toast-switch" className="text-xs font-bold text-zinc-200 uppercase tracking-widest font-mono">
                  Display CORS Error Toasts
                </Label>
                <p className="text-[11px] text-zinc-400 leading-normal font-sans">
                  Pops up a detailed toast showing the exact target URL, HTTP method, and origin whenever a CORS failure is detected.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={corsToastState ? "default" : "outline"} className={cn(
                  "text-[10px] font-mono tracking-wider font-semibold",
                  corsToastState ? "bg-red-500/10 text-red-400 border-red-500/20" : "text-neutral-500 border-white/5"
                )}>
                  {corsToastState ? "Active" : "Muted"}
                </Badge>
                <Switch
                  id="cors-toast-switch"
                  checked={corsToastState}
                  onCheckedChange={handleCorsToastToggle}
                  className="data-[state=checked]:bg-red-500"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-red-950/15 border border-red-500/20 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertCircle className="size-4 text-red-400 shrink-0 mt-0.5" />
                <div className="text-xs text-zinc-300">
                  <span className="font-semibold text-white">Test CORS Toast Notification: </span>
                  Verify the toast format, URL display, and error details copy function.
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestCorsToast}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-300 border-red-500/30 text-xs font-mono font-bold shrink-0"
              >
                <Sparkles className="size-3 mr-1.5 text-red-400" />
                Trigger Sample Toast
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
