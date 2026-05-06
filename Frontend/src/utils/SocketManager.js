import io from "socket.io-client";

const API_URL = import.meta.env.VITE_API_BASE_URL || "";
const SOCKET_URL = API_URL.includes("/api")
  ? API_URL.split("/api")[0]
  : API_URL;

class SocketManager {
  constructor() {
    this.socket = null;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = Infinity; 
    this.roomsToRejoin = new Set();
    this.heartbeatInterval = null;
    this.connectionListeners = new Set();
    this.intentionalDisconnect = false;
    this.isPageUnloading = false;
    this.connectionTimeout = null;
    this.isInCalendarRoom = false;
    this.reconnectTimer = null;
    this.isInitialized = false;
    this.pendingRooms = new Set();
    this.worker = null;
    this.lastHeartbeatResponse = Date.now();
    this.heartbeatTimeout = 45000; // 45 seconds timeout for heartbeat response
  }

  onConnectionChange(callback) {
    this.connectionListeners.add(callback);
    if (this.socket?.connected) {
      callback("connected");
    }
    return () => this.connectionListeners.delete(callback);
  }

  notifyListeners(status, reason = null) {
    if (this.isPageUnloading) return;

    this.connectionListeners.forEach((callback) => {
      try {
        callback(status, reason);
      } catch (error) {
        console.error("Error in connection listener:", error);
      }
    });
  }

  clearConnectionTimeout() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  connect() {
    if (this.socket?.connected) {
      this.notifyListeners("connected");
      return this.socket;
    }

    if (this.isConnecting) {
      return this.socket;
    }

    this.isConnecting = true;
    this.intentionalDisconnect = false;
    this.clearConnectionTimeout();
    this.clearReconnectTimer();

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.close();
      this.socket = null;
    }

    this.socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      forceNew: false, 
      pingTimeout: 60000,
      pingInterval: 25000,
      upgradeTimeout: 30000,
      path: "/socket.io/", 
    });

    this.setupSocketListeners();
    this.isInitialized = true;

    return this.socket;
  }

  setupSocketListeners() {
    if (!this.socket) return;

    this.socket.removeAllListeners();

    this.socket.on("connect", () => {
      this.clearConnectionTimeout();
      this.clearReconnectTimer();
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.intentionalDisconnect = false;

      this.notifyListeners("connected");
      this.sendSocketStatusToWorker();
      this.startHeartbeat();

      setTimeout(() => {
        this.rejoinRooms();
        if (this.isInCalendarRoom) {
          this.joinCalendarRoom();
        }
        this.joinPendingRooms();
        
        // Register user for task notifications
        console.log("🔍 Attempting to register user for notifications...");
        const userData = sessionStorage.getItem("user") || localStorage.getItem("user");
        console.log("📦 User data from storage:", userData ? "Found" : "Not found");
        const userObj = userData ? JSON.parse(userData) : null;
        const employeeId = userObj?.userName;
        console.log("👤 Employee ID extracted:", employeeId);
        if (employeeId) {
          console.log("✅ Calling registerUser with:", employeeId);
          this.registerUser(employeeId);
        } else {
          console.warn("❌ No employee ID found in sessionStorage/localStorage");
        }
      }, 500);
    });

    this.socket.on("disconnect", (reason) => {
      this.clearConnectionTimeout();
      this.isConnecting = false;
      this.stopHeartbeat();

      const isIntentional =
        reason === "io client disconnect" ||
        reason === "client namespace disconnect" ||
        this.intentionalDisconnect ||
        this.isPageUnloading;

      if (!isIntentional) {
        this.notifyListeners("disconnected", reason);
        this.sendSocketStatusToWorker();
        
        if (reason === "io server disconnect" || reason === "transport close") {
          this.scheduleReconnect(1000);
        }
      }
    });

    this.socket.on("connect_error", (error) => {
      this.clearConnectionTimeout();
      this.isConnecting = false;
      this.reconnectAttempts++;

      this.notifyListeners("error", error.message);

      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      this.scheduleReconnect(delay);
    });

    this.socket.on("reconnect", (attemptNumber) => {
      this.clearConnectionTimeout();
      this.clearReconnectTimer();
      this.reconnectAttempts = 0;
      this.notifyListeners("reconnected");
    });

    this.socket.on("reconnect_attempt", (attemptNumber) => {
      this.notifyListeners("reconnecting", `Attempt ${attemptNumber}`);
    });

    this.socket.on("reconnect_error", (error) => {
    });

    this.socket.on("reconnect_failed", () => {
      this.scheduleReconnect(5000);
    });

  }

  scheduleReconnect(delay) {
    if (this.isPageUnloading || this.intentionalDisconnect) return;

    this.clearReconnectTimer();
    
    this.reconnectTimer = setTimeout(() => {
      if (!this.socket?.connected && !this.isPageUnloading) {
        this.forceReconnect();
      }
    }, delay);
  }

  startHeartbeat() {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit("ping");
      } else {
        this.stopHeartbeat();
        if (!this.isPageUnloading && !this.intentionalDisconnect) {
          this.scheduleReconnect(1000);
        }
      }
    }, 20000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  getSocket() {
    if (!this.socket || !this.socket.connected) {
      if (!this.isInitialized) {
        return this.connect();
      } else if (!this.isConnecting && !this.intentionalDisconnect) {
        this.forceReconnect();
      }
    }
    return this.socket;
  }

  joinCalendarRoom() {
    if (this.socket?.connected) {
      this.socket.emit("join_calendar_room");
      this.isInCalendarRoom = true;
    } else {
      this.isInCalendarRoom = true; 
      if (!this.isConnecting) {
        this.connect();
      }
    }
  }

  leaveCalendarRoom() {
    if (this.socket?.connected) {
      this.socket.emit("leave_calendar_room");
    }
    this.isInCalendarRoom = false;
  }

  registerUser(employeeId) {
    console.log("🔔 registerUser called with:", employeeId);
    console.log("🔌 Socket connected status:", this.socket?.connected);
    
    if (!employeeId) {
      console.warn("⚠️ Employee ID is required to register");
      return;
    }

    if (this.socket?.connected) {
      console.log(`🔔 Registering user ${employeeId} for notifications`);
      console.log(`📤 Emitting register event with employeeId: ${employeeId}`);
      this.socket.emit("register", employeeId);
      console.log(`✅ Register event emitted successfully`);
    } else {
      console.warn(`⚠️ Socket not connected, will register ${employeeId} when connected`);
      if (!this.isConnecting) {
        this.connect();
      }
    }
  }

  onCalendarEvent(eventName, callback) {
    if (this.socket) {
      this.socket.on(eventName, callback);
    }
  }

  offCalendarEvent(eventName, callback) {
    if (this.socket) {
      this.socket.off(eventName, callback);
    }
  }

  joinRoom(roomData) {
    const roomDataStr = JSON.stringify(roomData);
    this.roomsToRejoin.add(roomDataStr);

    if (this.socket?.connected) {
      this.socket.emit("join_task_room", roomData);
    } else {
      this.pendingRooms.add(roomDataStr);
      if (!this.isConnecting) {
        this.connect();
      }
    }
  }

  joinPendingRooms() {
    if (this.pendingRooms.size === 0) return;

    this.pendingRooms.forEach((roomDataStr) => {
      try {
        const roomData = JSON.parse(roomDataStr);
        if (this.socket?.connected) {
          this.socket.emit("join_task_room", roomData);
        }
      } catch (error) {
        console.error("Error joining pending room:", error);
      }
    });
    this.pendingRooms.clear();
  }

  leaveRoom(roomData) {
    const roomDataStr = JSON.stringify(roomData);
    this.roomsToRejoin.delete(roomDataStr);
    this.pendingRooms.delete(roomDataStr);

    if (this.socket?.connected) {
      this.socket.emit("leave_task_room", roomData);
    }
  }

  rejoinRooms() {
    if (this.roomsToRejoin.size === 0) {
      return;
    }

    this.roomsToRejoin.forEach((roomDataStr) => {
      try {
        const roomData = JSON.parse(roomDataStr);
        if (this.socket?.connected) {
          this.socket.emit("join_task_room", roomData);
        }
      } catch (error) {
        console.error("Error rejoining room:", error);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.intentionalDisconnect = true;
      this.clearConnectionTimeout();
      this.clearReconnectTimer();
      this.stopHeartbeat();
      this.roomsToRejoin.clear();
      this.pendingRooms.clear();
      this.isInCalendarRoom = false;
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.isInitialized = false;
    }
  }

  initializeWorkerCommunication(worker) {
    if (!worker) return;
    
    this.worker = worker;
    
    // Listen to worker messages for socket health monitoring
    this.worker.onmessage = (e) => {
      const { type, message } = e.data;
      
      if (type === "SOCKET_HEALTH_CHECK") {
        console.log("💓 Worker: Socket health check");
      } else if (type === "SOCKET_HEARTBEAT") {
        console.log("💓 Worker: Sending heartbeat ping");
        if (this.socket?.connected) {
          this.socket.emit("ping");
          this.lastHeartbeatResponse = Date.now();
        }
      } else if (type === "SOCKET_RECONNECT_TRIGGER") {
        console.log("🔄 Worker: Triggering socket reconnection");
        if (!this.socket?.connected) {
          this.forceReconnect();
        }
      }
    };
  }

  sendSocketStatusToWorker() {
    if (!this.worker) return;
    
    this.worker.postMessage({
      action: "updateSocketStatus",
      connected: this.socket?.connected || false,
      reason: this.socket?.disconnected ? "Socket disconnected" : null
    });
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  forceReconnect() {
    this.intentionalDisconnect = false;
    this.isPageUnloading = false;

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.close();
      this.socket = null;
    }

    this.clearConnectionTimeout();
    this.clearReconnectTimer();
    this.stopHeartbeat();
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.isInitialized = false;

    return this.connect();
  }
}

if (typeof window !== "undefined") {
  const handleBeforeUnload = () => {
    if (socketManager.socket) {
      socketManager.isPageUnloading = true;
      socketManager.intentionalDisconnect = true;
      socketManager.clearConnectionTimeout();
      socketManager.clearReconnectTimer();
      socketManager.stopHeartbeat();
    }
  };

  window.addEventListener("beforeunload", handleBeforeUnload);
  
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && socketManager.isInitialized) {
      if (!socketManager.socket?.connected && !socketManager.isConnecting) {
        socketManager.forceReconnect();
      }
    }
  });
  
  window.addEventListener("online", () => {
    if (!socketManager.socket?.connected) {
      socketManager.forceReconnect();
    }
  });
  
  window.addEventListener("offline", () => {
    socketManager.notifyListeners("disconnected", "network offline");
  });
}

export const socketManager = new SocketManager();
export const getSocket = () => socketManager.getSocket();
export default socketManager;