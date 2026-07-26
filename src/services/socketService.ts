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

class SocketService {
  private socket: Socket | null = null;
  private status: SocketStatus = "disconnected";
  private statusCallbacks: Set<StatusCallback> = new Set();
  private eventCallbacks: Map<string, Set<EventCallback>> = new Map();
  private simulationTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Auto-init on construct if token is present
    if (typeof window !== "undefined") {
      this.init();
    }
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
      console.log("[SocketService] No token found. Delaying connection...");
      this.updateStatus("disconnected");
      return;
    }

    try {
      this.updateStatus("connecting");
      
      // Determine the notifications-service WebSocket base URL
      // Local is http://localhost:5006/events. In production or custom gateway environments, we adapt
      const gatewayUrl = resolveBaseGatewayUrl();
      const wsUrl = gatewayUrl.includes("localhost") 
        ? "http://localhost:5006/events" 
        : `${gatewayUrl}/events`;

      console.log(`[SocketService] Initiating handshake with Live Notifications Service: ${wsUrl}`);

      this.socket = io(wsUrl, {
        auth: { token },
        extraHeaders: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true,
        transports: ["websocket", "polling"],
        autoConnect: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 2000,
        timeout: 5000,
      });

      this.setupListeners();
    } catch (err) {
      console.warn("[SocketService] Failed to establish native socket. Engaging simulated fallback...", err);
      this.engageSimulationFallback();
    }
  }

  /**
   * Sets up native Socket.IO listeners
   */
  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("[SocketService] Connected to Notification Service WebSocket chamber.");
      this.updateStatus("connected");
    });

    this.socket.on("connect_error", (error) => {
      console.warn("[SocketService] Handshake connection error:", error.message);
      // Fallback gracefully to simulated socket to keep development playground live and reactive
      if (this.status !== "simulated") {
        this.engageSimulationFallback();
      }
    });

    this.socket.on("disconnect", (reason) => {
      console.log("[SocketService] Disconnected:", reason);
      if (reason === "io server disconnect") {
        // Server kicked client, try reconnecting manually
        this.socket?.connect();
      } else if (reason === "transport close") {
        this.engageSimulationFallback();
      } else {
        this.updateStatus("disconnected");
      }
    });

    // Register wild-card/bulk listeners for mandated events
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
      "content:transcribing",
      "content:transcription_complete",
      "content:captions_ready",
      "content:polish_complete"
    ];

    mandatedEvents.forEach((eventName) => {
      this.socket?.on(eventName, (data) => {
        console.log(`[SocketService] Received live event [${eventName}]:`, data);
        this.triggerEventCallbacks(eventName, data);
      });
    });
  }

  /**
   * Fallback to a highly realistic simulation loop in local sandbox
   */
  private engageSimulationFallback(): void {
    this.cleanupNative();
    console.log("[SocketService] WebSocket is operating in simulated mode. Developer Suite stream active.");
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
