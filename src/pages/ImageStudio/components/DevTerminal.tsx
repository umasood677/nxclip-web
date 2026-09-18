import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Terminal as TerminalIcon, 
  ChevronUp, 
  ChevronDown, 
  X, 
  Trash2, 
  Copy, 
  Check, 
  Layers, 
  Activity, 
  Maximize2, 
  Minimize2, 
  Play, 
  Search, 
  AlertCircle,
  Code,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Clock,
  ArrowRightLeft,
  Key,
  Database,
  Image as ImageIcon,
  Info,
  Globe,
  ExternalLink,
  Sparkles
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { cn } from "../../../lib/utils";
import { toast } from "sonner";
import { useAppSelector } from "../../../store/hooks";
import { selectAuthUser } from "../../../store/slices/authSlice";
import { getAccessToken, getRefreshToken } from "../../../services/auth/authService";

function decodeJwt(token: string) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

function formatTokenDate(timestamp: number) {
  if (!timestamp) return "N/A";
  try {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  } catch (e) {
    return "Invalid Date";
  }
}

export interface ApiCallLog {
  id: string;
  timestamp: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "WS";
  url: string;
  status: "pending" | "success" | "failed";
  statusCode?: number;
  requestPayload?: any;
  responsePayload?: any;
  duration?: number;
  message?: string;
  traceId?: string;
  proxyUrl?: string;
  resolvedUrl?: string;
  routedService?: string;
}

interface DevTerminalProps {
  logs: ApiCallLog[];
  isOpen: boolean;
  onClose: () => void;
  isMinimized: boolean;
  setIsMinimized: (val: boolean) => void;
  onClear: () => void;
  currentTraceId?: string;
  isGenerating?: boolean;
  resultImage?: string | null;
}

export function DevTerminal({
  logs,
  isOpen,
  onClose,
  isMinimized,
  setIsMinimized,
  onClear,
  currentTraceId,
  isGenerating,
  resultImage
}: DevTerminalProps) {
  const [activeTab, setActiveTab] = useState<"terminal" | "inspector" | "access" | "refresh" | "decoded" | "image-audit">("terminal");
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const user = useAppSelector(selectAuthUser);
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [showRawToken, setShowRawToken] = useState(false);

  const isTargetUser = 
    user?.email?.toLowerCase() === "azhernx1@mailto.plus" ||
    user?.email?.toLowerCase() === "sidra.fahim@gmail.com" ||
    user?.email?.toLowerCase() === "azheriqbal80@gmail.com";

  useEffect(() => {
    if (!isTargetUser) return;

    const loadTokens = () => {
      setAccessToken(getAccessToken());
      setRefreshToken(getRefreshToken());
    };

    loadTokens();

    window.addEventListener("storage", loadTokens);
    window.addEventListener("nx_auth_state_changed", loadTokens);

    return () => {
      window.removeEventListener("storage", loadTokens);
      window.removeEventListener("nx_auth_state_changed", loadTokens);
    };
  }, [isTargetUser, user]);

  const decodedAccess = decodeJwt(accessToken);

  // Auto scroll terminal logs
  useEffect(() => {
    if (activeTab === "terminal" && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, activeTab, isMinimized]);

  // Set selected log to the latest one when logs change and we are in inspector
  useEffect(() => {
    if (logs.length > 0 && !selectedLogId) {
      setSelectedLogId(logs[logs.length - 1].id);
    }
  }, [logs]);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  const selectedLog = logs.find(l => l.id === selectedLogId) || logs[logs.length - 1];

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toTimeString().split(" ")[0] + "." + String(date.getMilliseconds()).padStart(3, "0");
    } catch {
      return "00:00:00.000";
    }
  };

  const getStatusColor = (status: ApiCallLog["status"]) => {
    switch (status) {
      case "success": return "text-emerald-400";
      case "failed": return "text-rose-500";
      case "pending": return "text-amber-400 animate-pulse";
      default: return "text-zinc-400";
    }
  };

  const getMethodBadge = (method: ApiCallLog["method"]) => {
    const base = "font-mono text-[9px] font-bold px-1.5 py-0.5 rounded mr-2 uppercase";
    switch (method) {
      case "POST": return <span className={cn(base, "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20")}>POST</span>;
      case "GET": return <span className={cn(base, "bg-sky-500/10 text-sky-400 border border-sky-500/20")}>GET</span>;
      case "DELETE": return <span className={cn(base, "bg-rose-500/10 text-rose-400 border border-rose-500/20")}>DEL</span>;
      case "WS": return <span className={cn(base, "bg-purple-500/10 text-purple-400 border border-purple-500/20")}>WS</span>;
      default: return <span className={cn(base, "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20")}>{method}</span>;
    }
  };

  // Determine height based on state
  const heightClass = isMinimized 
    ? "h-11" 
    : isFullscreen 
      ? "h-[75vh] md:h-[65vh] lg:h-[600px]" 
      : "h-[360px] md:h-[420px]";

  return (
    <motion.div
      initial={{ y: 150, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 150, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 180 }}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-neutral-950/95 border-t border-white/10 backdrop-blur-md shadow-2xl flex flex-col font-mono text-xs text-zinc-300 overflow-hidden select-none",
        heightClass
      )}
    >
      {/* TERMINAL HEADER */}
      <div className="flex items-center justify-between px-4 h-11 bg-neutral-900 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>

          <div className="flex items-center gap-2 border-l border-white/10 pl-3 overflow-hidden">
            <TerminalIcon size={14} className="text-zinc-500 shrink-0" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider shrink-0 hidden sm:inline">
              Creator-API DevConsole
            </span>
            {isGenerating && (
              <span className="flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[10px] text-emerald-400 animate-pulse font-bold">API ACTIVE</span>
              </span>
            )}
            {currentTraceId && (
              <span className="text-[10px] text-zinc-500 border border-white/5 bg-white/5 rounded px-1.5 font-mono truncate max-w-[150px] md:max-w-[220px]">
                TRC: {currentTraceId.substring(14)}
              </span>
            )}
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          {!isMinimized && (
            <>
              {/* Tab Selector */}
              <div className="flex border border-white/10 rounded overflow-x-auto mr-1 md:mr-3 bg-neutral-950 p-0.5 max-w-[240px] sm:max-w-md md:max-w-xl scrollbar-none">
                <button
                  onClick={() => setActiveTab("terminal")}
                  className={cn(
                    "px-2 py-1 text-[9px] font-bold rounded uppercase tracking-wide transition-all shrink-0",
                    activeTab === "terminal" 
                      ? "bg-white/10 text-white" 
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  Terminal
                </button>
                <button
                  onClick={() => setActiveTab("inspector")}
                  className={cn(
                    "px-2 py-1 text-[9px] font-bold rounded uppercase tracking-wide transition-all shrink-0",
                    activeTab === "inspector" 
                      ? "bg-white/10 text-white" 
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  JSON Inspector ({logs.length})
                </button>
                <button
                  onClick={() => setActiveTab("image-audit")}
                  className={cn(
                    "px-2 py-1 text-[9px] font-bold rounded uppercase tracking-wide transition-all shrink-0 flex items-center gap-1 border-l border-white/5",
                    activeTab === "image-audit" 
                      ? "bg-emerald-500/15 text-emerald-400 font-bold" 
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <ImageIcon size={10} /> Image Audit
                </button>
                {isTargetUser && (
                  <>
                    <button
                      onClick={() => setActiveTab("access")}
                      className={cn(
                        "px-2 py-1 text-[9px] font-bold rounded uppercase tracking-wide transition-all shrink-0 flex items-center gap-1 border-l border-white/5",
                        activeTab === "access" 
                          ? "bg-purple-500/15 text-purple-400 font-bold" 
                          : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      <Shield size={10} /> Access
                    </button>
                    <button
                      onClick={() => setActiveTab("refresh")}
                      className={cn(
                        "px-2 py-1 text-[9px] font-bold rounded uppercase tracking-wide transition-all shrink-0 flex items-center gap-1",
                        activeTab === "refresh" 
                          ? "bg-purple-500/15 text-purple-400 font-bold" 
                          : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      <ArrowRightLeft size={10} /> Refresh
                    </button>
                    <button
                      onClick={() => setActiveTab("decoded")}
                      className={cn(
                        "px-2 py-1 text-[9px] font-bold rounded uppercase tracking-wide transition-all shrink-0 flex items-center gap-1",
                        activeTab === "decoded" 
                          ? "bg-purple-500/15 text-purple-400 font-bold" 
                          : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      <Database size={10} /> Decoded JWT
                    </button>
                  </>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={onClear}
                title="Clear Logs"
                className="h-7 w-7 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded animate-none"
              >
                <Trash2 size={13} />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? "Restore size" : "Maximize Console"}
                className="h-7 w-7 text-zinc-500 hover:text-white hover:bg-white/5 rounded animate-none hidden md:inline-flex"
              >
                {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? "Expand console" : "Minimize console"}
            className="h-7 w-7 text-zinc-500 hover:text-white hover:bg-white/5 rounded animate-none"
          >
            {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            title="Close DevConsole"
            className="h-7 w-7 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded animate-none"
          >
            <X size={14} />
          </Button>
        </div>
      </div>

      {/* MINIMIZED QUICK STATUS BAR */}
      {isMinimized && (
        <div 
          onClick={() => setIsMinimized(false)}
          className="flex-1 flex items-center justify-between px-4 cursor-pointer bg-neutral-950 hover:bg-neutral-900 transition-colors"
        >
          <div className="flex items-center gap-4 text-[10px] text-zinc-400 w-full truncate">
            {logs.length === 0 ? (
              <span className="text-zinc-500">No active API logs. Click Generate to stream.</span>
            ) : (
              <>
                <span className="text-emerald-400 font-bold shrink-0">
                  LATEST API RUN:
                </span>
                <span className="font-mono truncate">
                  {logs[logs.length - 1].method} {logs[logs.length - 1].resolvedUrl || logs[logs.length - 1].url} 
                </span>
                <span className={cn("font-bold uppercase", getStatusColor(logs[logs.length - 1].status))}>
                  [{logs[logs.length - 1].status}]
                </span>
                {logs[logs.length - 1].duration && (
                  <span className="text-zinc-500 font-mono hidden sm:inline">
                    ({logs[logs.length - 1].duration}ms)
                  </span>
                )}
              </>
            )}
          </div>
          <span className="text-[10px] font-bold text-primary hover:underline shrink-0 pl-2">
            EXPAND
          </span>
        </div>
      )}

      {/* EXPANDED PANEL VIEW */}
      {!isMinimized && (
        <div className="flex-1 flex overflow-hidden min-h-0 bg-neutral-950">
          {/* TAB 1: TERMINAL STREAM VIEW */}
          {activeTab === "terminal" && (
            <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-2 selection:bg-primary/20 selection:text-white">
              <div className="text-zinc-500 text-[10px] pb-2 border-b border-white/5 flex justify-between">
                <span>[system] Connected to local API Gateway. Real-time trace engine enqueued.</span>
                <span>UTC {new Date().toISOString().substring(11, 19)}</span>
              </div>

              {logs.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-zinc-500 select-none">
                  <Code size={24} className="text-zinc-600 mb-2 animate-pulse" />
                  <p>Developer console is empty.</p>
                  <p className="text-[10px]">Generate an image to trace HTTP request pipelines in real-time.</p>
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={log.id} className="space-y-1">
                    {/* Log entry line */}
                    <div className="flex items-start md:items-center flex-wrap gap-x-2 border-l-2 border-white/5 pl-2 py-0.5 hover:bg-white/5 transition-colors rounded-r">
                      <span className="text-zinc-500 font-mono shrink-0 select-none">
                        [{formatTimestamp(log.timestamp)}]
                      </span>
                      <span className="text-primary font-bold shrink-0 select-none">
                        sidra@nxclip.app:~$
                      </span>
                      <div className="flex items-center shrink-0 min-w-0">
                        {getMethodBadge(log.method)}
                        <span className="font-semibold text-emerald-400 select-all font-mono break-all" title="Upstream API Address">
                          {log.resolvedUrl || log.url}
                        </span>
                      </div>
                      <span className={cn("font-bold uppercase tracking-wider text-[10px] px-1 bg-white/5 rounded shrink-0", getStatusColor(log.status))}>
                        {log.status}
                      </span>
                      {log.statusCode && (
                        <span className={cn("font-bold font-mono", log.statusCode < 400 ? "text-emerald-400" : "text-rose-400")}>
                          HTTP {log.statusCode}
                        </span>
                      )}
                      {log.duration && (
                        <span className="text-zinc-500 font-mono text-[10px]">
                          in {log.duration}ms
                        </span>
                      )}
                    </div>

                    {/* Dual-layer details (Proxy Endpoint and Routed Service Indicator) */}
                    {log.proxyUrl && (
                      <div className="pl-6 text-[10px] text-zinc-500 flex flex-wrap items-center gap-x-2">
                        <span className="select-all">
                          Proxy Gateway: <span className="text-zinc-400 break-all">{log.proxyUrl}</span>
                        </span>
                        {log.routedService && (
                          <span className="text-[9px] font-bold bg-white/5 border border-white/10 px-1 py-0.2 rounded text-zinc-400 font-mono">
                            ➔ {log.routedService}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Secondary response summary if logged */}
                    {log.message && (
                      <div className="pl-6 text-zinc-400 italic text-[10px] break-words">
                        ↳ {log.message}
                      </div>
                    )}

                    {/* Show payload / response toggle on hover or select */}
                    <div className="pl-6 flex gap-3 text-[9px] text-zinc-500">
                      {log.requestPayload && (
                        <button 
                          onClick={() => {
                            setSelectedLogId(log.id);
                            setActiveTab("inspector");
                          }}
                          className="hover:text-primary transition-colors hover:underline flex items-center gap-1 font-bold uppercase"
                        >
                          <Activity size={10} /> Request Payload
                        </button>
                      )}
                      {log.responsePayload && (
                        <button 
                          onClick={() => {
                            setSelectedLogId(log.id);
                            setActiveTab("inspector");
                          }}
                          className="hover:text-emerald-400 transition-colors hover:underline flex items-center gap-1 font-bold uppercase"
                        >
                          <Layers size={10} /> Response Body
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={terminalEndRef} />
            </div>
          )}

          {/* TAB 2: RICH JSON INSPECTOR VIEW */}
          {activeTab === "inspector" && (
            <div className="flex-1 flex overflow-hidden">
              {/* Logs Sidebar */}
              <div className="w-48 border-r border-white/5 flex flex-col overflow-y-auto shrink-0 bg-neutral-900">
                <div className="p-2 border-b border-white/5 text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
                  API REQUESTS
                </div>
                {logs.length === 0 ? (
                  <div className="p-4 text-center text-zinc-600 text-[10px]">
                    No calls logged.
                  </div>
                ) : (
                  logs.map((log) => (
                    <button
                      key={log.id}
                      onClick={() => setSelectedLogId(log.id)}
                      className={cn(
                        "w-full text-left p-2.5 border-b border-white/5 transition-all flex flex-col gap-1 hover:bg-white/5",
                        selectedLog?.id === log.id 
                          ? "bg-white/10 text-white border-l-2 border-primary" 
                          : "text-zinc-400"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-[9px] uppercase font-mono px-1 bg-white/5 rounded">
                          {log.method}
                        </span>
                        <span className={cn("text-[9px] font-bold uppercase font-mono", getStatusColor(log.status))}>
                          {log.statusCode ? `HTTP ${log.statusCode}` : log.status}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] truncate block w-full text-zinc-200" title={log.resolvedUrl || log.url}>
                        {log.resolvedUrl || log.url}
                      </span>
                      <span className="text-[8px] font-mono text-zinc-500 block">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </button>
                  ))
                )}
              </div>

              {/* Inspector Content Panel */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {selectedLog ? (
                  <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    {/* REQUEST PAYLOAD */}
                    <div className="flex-1 border-r border-white/5 flex flex-col overflow-hidden">
                      <div className="h-8 border-b border-white/5 bg-neutral-900/50 flex items-center justify-between px-3 shrink-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                          <Activity size={10} className="text-primary" />
                          Request Body (JSON)
                        </span>
                        {selectedLog.requestPayload && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopyText(JSON.stringify(selectedLog.requestPayload, null, 2), `${selectedLog.id}-req`)}
                            className="h-6 w-6 text-zinc-500 hover:text-white rounded"
                          >
                            {copiedId === `${selectedLog.id}-req` ? (
                              <Check size={11} className="text-emerald-400" />
                            ) : (
                              <Copy size={11} />
                            )}
                          </Button>
                        )}
                      </div>
                      <div className="flex-1 p-3 overflow-y-auto bg-neutral-950 font-mono text-[10px] text-emerald-400 selection:bg-primary/20">
                        {selectedLog.requestPayload ? (
                          <pre className="whitespace-pre-wrap">{JSON.stringify(selectedLog.requestPayload, null, 2)}</pre>
                        ) : (
                          <p className="text-zinc-600 italic">No request payload (e.g. GET request)</p>
                        )}
                      </div>
                    </div>

                    {/* RESPONSE PAYLOAD */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <div className="h-8 border-b border-white/5 bg-neutral-900/50 flex items-center justify-between px-3 shrink-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                          <Layers size={10} className="text-emerald-400" />
                          Response Body (JSON)
                        </span>
                        {selectedLog.responsePayload && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopyText(JSON.stringify(selectedLog.responsePayload, null, 2), `${selectedLog.id}-res`)}
                            className="h-6 w-6 text-zinc-500 hover:text-white rounded"
                          >
                            {copiedId === `${selectedLog.id}-res` ? (
                              <Check size={11} className="text-emerald-400" />
                            ) : (
                              <Copy size={11} />
                            )}
                          </Button>
                        )}
                      </div>
                      <div className="flex-1 p-3 overflow-y-auto bg-neutral-950 font-mono text-[10px] text-sky-400 selection:bg-primary/20">
                        {selectedLog.responsePayload ? (
                          <pre className="whitespace-pre-wrap">{JSON.stringify(selectedLog.responsePayload, null, 2)}</pre>
                        ) : (
                          selectedLog.status === "pending" ? (
                            <div className="flex items-center gap-2 text-amber-500 italic">
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                              Request pending, waiting for server response...
                            </div>
                          ) : (
                            <p className="text-zinc-600 italic">No response payload returned</p>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
                    <AlertCircle size={20} className="text-zinc-600 mb-2" />
                    <p>Select a request from the sidebar to inspect raw JSON payloads.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ACCESS TOKEN VIEW */}
          {activeTab === "access" && isTargetUser && (
            <div className="flex-1 p-5 overflow-y-auto space-y-4 max-w-4xl mx-auto selection:bg-purple-500/20">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-purple-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300">Access Token Manager</span>
                </div>
                <button
                  onClick={() => setShowRawToken(!showRawToken)}
                  className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 font-bold uppercase tracking-wide"
                >
                  {showRawToken ? <EyeOff size={12} /> : <Eye size={12} />}
                  <span>{showRawToken ? "Hide Raw" : "Reveal Raw"}</span>
                </button>
              </div>

              <div className="space-y-3">
                <div className="relative group rounded-lg border border-purple-500/20 bg-zinc-900/40 p-4 font-mono text-xs leading-relaxed break-all max-h-[140px] overflow-y-auto select-all text-zinc-300">
                  {accessToken ? (
                    showRawToken ? accessToken : `${accessToken.slice(0, 32)}••••••••••••••••••••${accessToken.slice(-32)}`
                  ) : (
                    <span className="text-zinc-500 italic">No access token stored. Please log in.</span>
                  )}
                </div>

                {accessToken && (
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => handleCopyText(accessToken, "access-raw")}
                      className="flex items-center gap-1.5 py-2 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[10px] font-bold uppercase tracking-wider text-zinc-300 transition-all active:scale-95"
                    >
                      {copiedId === "access-raw" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copiedId === "access-raw" ? "Copied" : "Copy Raw Token"}</span>
                    </button>
                    <button
                      onClick={() => handleCopyText(`Bearer ${accessToken}`, "access-auth")}
                      className="flex items-center gap-1.5 py-2 px-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded text-[10px] font-bold uppercase tracking-wider text-purple-300 transition-all active:scale-95"
                    >
                      {copiedId === "access-auth" ? <Check size={12} className="text-emerald-400" /> : <Database size={12} />}
                      <span>{copiedId === "access-auth" ? "Header Copied" : "Copy Bearer Header"}</span>
                    </button>
                  </div>
                )}

                {decodedAccess && (
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-lg flex items-start gap-2.5 text-xs">
                    <TerminalIcon size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-emerald-400 uppercase tracking-wider block mb-1">JWT Claims Parsed</span>
                      <p className="text-zinc-400 leading-normal">
                        This active Access Token expires on <span className="text-emerald-300 font-mono font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">{formatTokenDate(decodedAccess.exp)}</span>.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: REFRESH TOKEN VIEW */}
          {activeTab === "refresh" && isTargetUser && (
            <div className="flex-1 p-5 overflow-y-auto space-y-4 max-w-4xl mx-auto selection:bg-purple-500/20">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft size={16} className="text-purple-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300">Refresh Token & Lifetime Rotation</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="relative group rounded-lg border border-white/5 bg-zinc-900/40 p-4 font-mono text-xs leading-relaxed break-all max-h-[140px] overflow-y-auto select-all text-zinc-300">
                  {refreshToken ? (
                    showRawToken ? refreshToken : `${refreshToken.slice(0, 24)}••••••••••••••••••••${refreshToken.slice(-24)}`
                  ) : (
                    <span className="text-zinc-500 italic">No refresh token stored.</span>
                  )}
                </div>

                {refreshToken && (
                  <button
                    onClick={() => handleCopyText(refreshToken, "refresh-raw")}
                    className="flex items-center gap-1.5 py-2 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[10px] font-bold uppercase tracking-wider text-zinc-300 transition-all active:scale-95"
                  >
                    {copiedId === "refresh-raw" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedId === "refresh-raw" ? "Copied" : "Copy Refresh Token"}</span>
                  </button>
                )}

                <div className="p-4 bg-sky-500/5 border border-sky-500/10 rounded-lg flex gap-3 text-xs">
                  <Lock size={16} className="text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-sky-400 uppercase tracking-wider block mb-1">Secure Rotation Flow</span>
                    <p className="text-zinc-400 leading-relaxed">
                      Our API proxy gateway automatically performs silent token rotation whenever your standard access token expires. This keeps your active sessions authenticated securely in the background without needing manual user credentials input.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DECODED JWT CLAIMS VIEW */}
          {activeTab === "decoded" && isTargetUser && (
            <div className="flex-1 p-5 overflow-y-auto space-y-4 max-w-4xl mx-auto selection:bg-purple-500/20">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Database size={16} className="text-purple-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300">Decoded Access Claims (Payload)</span>
                </div>
              </div>

              {decodedAccess ? (
                <div className="rounded-lg border border-white/5 bg-zinc-900/30 overflow-hidden text-xs font-mono">
                  <div className="grid grid-cols-3 border-b border-white/10 bg-zinc-950 px-4 py-2.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                    <span>Claim / Field</span>
                    <span className="col-span-2">Value</span>
                  </div>
                  {Object.entries(decodedAccess).map(([key, val]) => (
                    <div key={key} className="grid grid-cols-3 border-b border-white/5 last:border-0 px-4 py-2 hover:bg-white/5 transition-colors align-top">
                      <span className="text-purple-400 font-bold select-all">{key}</span>
                      <span className="col-span-2 text-zinc-300 break-all select-all font-medium">
                        {key === "exp" || key === "iat" || key === "auth_time" ? (
                          <span className="flex flex-col">
                            <span>{String(val)}</span>
                            <span className="text-[10px] text-zinc-500 font-sans mt-1 flex items-center gap-1.5">
                              <Clock size={10} /> {formatTokenDate(Number(val))}
                            </span>
                          </span>
                        ) : typeof val === "object" ? (
                          JSON.stringify(val)
                        ) : (
                          String(val)
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 rounded-lg border border-zinc-800 bg-zinc-900/40 text-center text-xs text-zinc-500 font-medium">
                  {accessToken ? "Access token is not a standard 3-part JWT" : "No active access token loaded"}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: IMAGE ASSET AUDIT VIEW */}
          {activeTab === "image-audit" && (
            <div className="flex-1 p-5 overflow-y-auto space-y-4 max-w-4xl mx-auto selection:bg-purple-500/20">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <ImageIcon size={16} className="text-emerald-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 font-mono">Canvas Image Asset Audit</span>
                </div>
              </div>

              {!resultImage ? (
                <div className="p-8 rounded-lg border border-dashed border-zinc-800 bg-zinc-900/40 text-center text-xs text-zinc-500 font-medium font-mono">
                  <AlertCircle size={20} className="text-zinc-600 mx-auto mb-2 animate-bounce" />
                  No active image currently rendered on the canvas. Generate an image first to audit its lifecycle.
                </div>
              ) : (() => {
                const isBase64 = resultImage.startsWith("data:");
                const hasToken = !!getAccessToken();
                const domain = (() => {
                  try {
                    return isBase64 ? "Inline Base64 Data Payload" : new URL(resultImage).hostname;
                  } catch (e) {
                    return "Relative Path / Local Storage";
                  }
                })();

                return (
                  <div className="space-y-4">
                    {/* Status card */}
                    <div className="p-4 rounded-lg border flex items-start gap-3 text-xs leading-relaxed font-sans bg-emerald-500/5 border-emerald-500/20">
                      <Check size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                      <div className="space-y-1 text-left">
                        <span className="font-bold uppercase tracking-wider text-[11px] block font-mono text-emerald-400">
                          {isBase64 ? "Direct Base64 AI Image Payload" : "Live API Image Asset"}
                        </span>
                        <p className="text-zinc-400">
                          {isBase64 
                            ? "This image is a real base64-encoded visual directly generated by the Gemini AI model API response."
                            : "This image is a live generated visual asset retrieved from the content API endpoint."
                          }
                        </p>
                      </div>
                    </div>

                    {/* URL Card */}
                    <div className="p-4 rounded-lg border border-white/5 bg-zinc-900/40 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1 text-left">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block font-mono">Payload Source</span>
                          <span className="font-mono text-zinc-300 text-xs flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded w-fit border border-white/5">
                            <Globe size={11} className="text-zinc-400" />
                            {domain}
                          </span>
                        </div>
                        <div className="space-y-1 text-left">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block font-mono">Authorization Status</span>
                          <span className={cn(
                            "font-mono text-xs px-2 py-1 rounded w-fit border flex items-center gap-1.5",
                            hasToken 
                              ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" 
                              : "bg-amber-500/5 border-amber-500/10 text-amber-400"
                          )}>
                            <Shield size={11} />
                            {hasToken ? "Authorized Bearer Header Present" : "Active Session"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
