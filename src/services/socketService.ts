import { io, Socket } from "socket.io-client";
import { getAccessToken } from "./auth/authService";
import { resolveBaseGatewayUrl } from "./apiClient";

// Type definitions for WebSocket payloads as specified in frontend-integration-guide.md
export interface WebSocketEnvelope<T> {
  notificationId: string;
  data: T;
}

export interface GenerationProgressPayload {
  contentId: string;
  progress: number; // 0 to 100
  step?: string;
}

export interface GenerationCompletePayload {
  contentId: string;
  assetUrl: string;
}

export interface GenerationFailedPayload {
  contentId: string;
  reason: string;
  retryable: boolean;
}

export interface ModerationCompletePayload {
  contentId: string;
  status: "approved" | "rejected";
  reason?: string;
}

export interface SubscriptionChangedPayload {
  plan: "FREE" | "PRO" | "STUDIO";
}

export type SocketStatus = "disconnected" | "connecting" | "connected" | "simulated";

type StatusCallback = (status: SocketStatus) => void;
type EventCallback = (event: string, payload: any) => void;

/**
 * Socket.IO lives on **notification-service** (`/events`), not api-gateway.
 * Set `VITE_NOTIFICATION_WS_URL` to the Cloud Run notification URL (no path), e.g.
 * `https://notification-service-….run.app` — client appends `/events`.
 * Local stack: defaults to `http://localhost:5006/events`.
 */
function resolveNotificationWsUrl(): string | null {
  const fromEnv =
    (import.meta.env.VITE_NOTIFICATION_WS_URL as string | undefined)?.trim() ||
    (import.meta.env.VITE_WS_URL as string | undefined)?.trim();

  if (fromEnv) {
    const base = fromEnv.replace(/\/$/, "");
    return base.endsWith("/events") ? base : `${base}/events`;
  }

  const gatewayUrl = resolveBaseGatewayUrl();
  if (gatewayUrl.includes("localhost") || gatewayUrl.includes("127.0.0.1")) {
    return "http://localhost:5006/events";
  }

  // api-gateway does not proxy Socket.IO — do not use `${gateway}/events`.
  return null;
}

class SocketService {
  private socket: Socket | null = null;
  private status: SocketStatus = "disconnected";
  private statusCallbacks: Set<StatusCallback> = new Set();
  private eventCallbacks: Map<string, Set<EventCallback>> = new Map();
  private simulationTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Do not auto-connect on construct — wait for login / explicit init()
    // so marketing pages do not spam failed handshakes with stale tokens.
  }

  /**
   * Initialize and connect the Socket.IO client
   */
  public init(): void {
    if (this.socket) {
      return;
    }

    const token = getAccessToken();
    if (!token) {
      this.updateStatus("disconnected");
      return;
    }

    const wsUrl = resolveNotificationWsUrl();
    if (!wsUrl) {
      console.info(
        "[SocketService] Skipping live WS — set VITE_NOTIFICATION_WS_URL to the notification-service Cloud Run origin (Socket.IO is not on api-gateway).",
      );
      this.updateStatus("disconnected");
      return;
    }

    try {
      this.updateStatus("connecting");
      console.log(`[SocketService] Connecting to ${wsUrl}`);

      this.socket = io(wsUrl, {
        auth: { token },
        extraHeaders: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
        transports: ["websocket", "polling"],
        autoConnect: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 2000,
        timeout: 8000,
        path: "/socket.io",
      });

      this.setupListeners();
    } catch (err) {
      console.warn("[SocketService] Failed to create socket:", err);
      this.updateStatus("disconnected");
    }
  }

  /**
   * Sets up native Socket.IO listeners
   */
  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("[SocketService] Connected to notification-service.");
      this.updateStatus("connected");
    });

    this.socket.on("connect_error", (error) => {
      console.warn("[SocketService] Connection error:", error.message);
      this.cleanupNative();
      // Simulation only in local/dev playground — not when pointed at production APIs
      const gateway = resolveBaseGatewayUrl();
      if (import.meta.env.DEV && gateway.includes("localhost")) {
        this.engageSimulationFallback();
      } else {
        this.updateStatus("disconnected");
      }
    });

    this.socket.on("disconnect", (reason) => {
      console.log("[SocketService] Disconnected:", reason);
      if (reason === "io server disconnect") {
        this.socket?.connect();
      } else {
        this.updateStatus("disconnected");
      }
    });

    const mandatedEvents = [
      "content:processing",
      "content:generation_complete",
      "content:generation_failed",
      "content:moderation_complete",
      "analytics:report_ready",
      "billing:subscription_changed",
      "social:engagement",
      "system:update",
      "onboarding:complete",
      "coach:token",
      "coach:progress",
      "content:transcribing",
      "content:transcription_complete",
      "content:render_complete",
      "content:render_failed",
      "content:captions_ready",
      "content:polish_complete",
    ];

    mandatedEvents.forEach((eventName) => {
      this.socket?.on(eventName, (data) => {
        this.triggerEventCallbacks(eventName, data);
      });
    });
  }

  /**
   * Fallback to a highly realistic simulation loop in local sandbox
   */
  private engageSimulationFallback(): void {
    this.cleanupNative();
    console.log("[SocketService] Simulated mode (local playground only).");
    this.updateStatus("simulated");
  }

  /**
   * Manually trigger a simulated event (extremely useful for development testing)
   */
  public simulateEvent(eventName: string, payload: any): void {
    console.log(`[SocketService] [Simulated Event Trigger] ${eventName}:`, payload);
    
    // Add unique notification envelope identifier
    const envelope: WebSocketEnvelope<any> = {
      notificationId: `notif_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...payload
    };

    // Broadcast to local listeners
    this.triggerEventCallbacks(eventName, envelope);
    
    // Dispatch as custom window event to trigger general notifications UI or updates
    if (typeof window !== "undefined") {
      const customEvent = new CustomEvent("nx_ws_simulation", {
        detail: { event: eventName, data: envelope }
      });
      window.dispatchEvent(customEvent);
    }
  }

  /**
   * Start a multi-step simulation of a content generation pipeline
   */
  public startSimulatedGenerationPipeline(prompt: string, contentId: string = "content-uuid-123"): void {
    if (this.simulationTimer) {
      clearTimeout(this.simulationTimer);
    }

    // Step 1: Processing starts
    this.simulateEvent("content:processing", {
      contentId,
      progress: 10,
      step: "Initializing AI cluster context..."
    });

    // Step 2: Mid-way processing
    this.simulationTimer = setTimeout(() => {
      this.simulateEvent("content:processing", {
        contentId,
        progress: 45,
        step: "Rendering high-fidelity keyframes..."
      });

      // Step 3: High progress
      this.simulationTimer = setTimeout(() => {
        this.simulateEvent("content:processing", {
          contentId,
          progress: 85,
          step: "Encoding output video container..."
        });

        // Step 4: Complete
        this.simulationTimer = setTimeout(() => {
          this.simulateEvent("content:generation_complete", {
            contentId,
            assetUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200",
            title: `Generated: ${prompt.substring(0, 30)}...`
          });

          // Step 5: Post-generation Moderation check
          this.simulationTimer = setTimeout(() => {
            this.simulateEvent("content:moderation_complete", {
              contentId,
              status: "approved",
              reason: "Content conforms to safe creator policy standards."
            });
          }, 3000);

        }, 3000);

      }, 3000);

    }, 3000);
  }

  /**
   * Simulate specific notification events for testing
   */
  public simulateNotification(type: "engagement" | "update" | "insight"): void {
    if (type === "engagement") {
      this.simulateEvent("social:engagement", {
        title: "New Interaction",
        message: "@creator_pro liked your recent gaming highlight!"
      });
    } else if (type === "update") {
      this.simulateEvent("system:update", {
        title: "v2.1 Features Live",
        message: "We've upgraded our AI temporal syncing engine for smoother clips."
      });
    } else if (type === "insight") {
      this.simulateEvent("analytics:report_ready", {
        reportId: `rep-${Date.now().toString().slice(-4)}`
      });
    }
  }

  /**
   * Register a callback for WebSocket status updates
   */
  public onStatusChange(cb: StatusCallback): () => void {
    this.statusCallbacks.add(cb);
    cb(this.status); // Immediately inform the current status
    return () => {
      this.statusCallbacks.delete(cb);
    };
  }

  /**
   * Subscribe to specific WebSocket events
   */
  public subscribe(eventName: string, cb: EventCallback): () => void {
    if (!this.eventCallbacks.has(eventName)) {
      this.eventCallbacks.set(eventName, new Set());
    }
    this.eventCallbacks.get(eventName)!.add(cb);

    return () => {
      const callbacks = this.eventCallbacks.get(eventName);
      if (callbacks) {
        callbacks.delete(cb);
        if (callbacks.size === 0) {
          this.eventCallbacks.delete(eventName);
        }
      }
    };
  }

  /**
   * Refreshes the token and reconnects native socket
   */
  public updateToken(): void {
    console.log("[SocketService] Re-attuning WebSocket credentials...");
    this.disconnect();
    this.init();
  }

  /**
   * Disconnect the socket
   */
  public disconnect(): void {
    this.cleanupNative();
    if (this.simulationTimer) {
      clearTimeout(this.simulationTimer);
      this.simulationTimer = null;
    }
    this.updateStatus("disconnected");
  }

  private cleanupNative(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private updateStatus(newStatus: SocketStatus): void {
    if (this.status === newStatus) return;
    this.status = newStatus;
    this.statusCallbacks.forEach((cb) => cb(this.status));
  }

  private triggerEventCallbacks(eventName: string, payload: any): void {
    // Notify general catch-all wildcards or target callbacks
    const callbacks = this.eventCallbacks.get(eventName);
    if (callbacks) {
      callbacks.forEach((cb) => cb(eventName, payload));
    }
  }

  public getStatus(): SocketStatus {
    return this.status;
  }
}

// Export single instances for unified connection tracking
export const socketService = new SocketService();
