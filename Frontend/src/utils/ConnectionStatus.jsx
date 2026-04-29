import { useEffect, useState, useRef } from "react";
import { socketManager } from "./SocketManager";
import { RefreshCw, WifiOff, CheckCircle } from "lucide-react";

export default function ConnectionStatus() {
  const [connectionStatus, setConnectionStatus] = useState("checking");
  const [statusMessage, setStatusMessage] = useState("Checking connection...");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFirstConnection, setIsFirstConnection] = useState(true);
  const hideTimeoutRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    if (
      (connectionStatus === "connected" ||
        connectionStatus === "reconnected") &&
      !isFirstConnection
    ) {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }

      hideTimeoutRef.current = setTimeout(() => {
        setConnectionStatus("hidden");
      }, 3000);
    }

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [connectionStatus, isFirstConnection]);

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const startPolling = () => {
    stopPolling();
    pollingIntervalRef.current = setInterval(() => {
      const isConnected = socketManager.isConnected();

      if (isConnected) {
        setIsFirstConnection(false);
        setConnectionStatus("connected");
        setStatusMessage("Connected to employees");
        setIsRefreshing(false);
        stopPolling();
      }
    }, 500);
  };

  useEffect(() => {
    const unsubscribe = socketManager.onConnectionChange((status, reason) => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }

      setIsRefreshing(false);

      switch (status) {
        case "connecting":
          setConnectionStatus("connecting");
          setStatusMessage("Connecting to employees...");
          startPolling();
          break;

        case "connected":
          stopPolling();
          setIsFirstConnection(false);
          setConnectionStatus("connected");
          setStatusMessage("Connected to employees");
          break;

        case "disconnected":
          stopPolling();
          setConnectionStatus("disconnected");
          if (reason === "ping timeout") {
            setStatusMessage("Connection lost - timeout");
          } else if (reason === "transport close") {
            setStatusMessage("Connection interrupted");
          } else if (reason === "io server disconnect") {
            setStatusMessage("Connection disconnected");
          } else {
            setStatusMessage("Connection lost");
          }
          break;

        case "reconnecting":
          setConnectionStatus("reconnecting");
          setStatusMessage(`Reconnecting... ${reason || ""}`);
          startPolling();
          break;

        case "timeout":
          stopPolling();
          setConnectionStatus("disconnected");
          setStatusMessage("Connection timeout");
          break;

        case "error":
          setConnectionStatus("connecting");
          setStatusMessage("Connecting to employees...");
          break;

        case "failed":
          stopPolling();
          setConnectionStatus("disconnected");
          setStatusMessage("Connection failed");
          break;

        case "reconnected":
          stopPolling();
          setIsFirstConnection(false);
          setConnectionStatus("reconnected");
          setStatusMessage("Reconnected successfully!");
          break;

        default:
          break;
      }
    });

    const checkInitialConnection = () => {
      const isConnected = socketManager.isConnected();

      if (isConnected) {
        setIsFirstConnection(false);
        setConnectionStatus("connected");
        setStatusMessage("Connected to employees");
      } else {
        setConnectionStatus("connecting");
        setStatusMessage("Connecting to employees...");
        socketManager.connect();

        startPolling();
      }
    };

    checkInitialConnection();

    return () => {
      unsubscribe();
      stopPolling();
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setConnectionStatus("reconnecting");
    setStatusMessage("Reconnecting...");
    socketManager.forceReconnect();
    startPolling();
    window.dispatchEvent(new Event("RefreshLoad"));
    window.dispatchEvent(new Event("ReloadCountAdmin"));
    window.dispatchEvent(new Event("ReloadCountEmployee"));
  };

  if (connectionStatus === "hidden") return null;

  if (connectionStatus === "connected" || connectionStatus === "reconnected") {
    return (
      <div className="fixed bottom-[1vw] left-[1vw] z-[100]">
        <div className="flex items-center gap-[0.7vw] px-[0.9vw] py-[0.5vw] rounded-lg shadow-lg bg-green-50 border-2 border-green-500 animate-fadeIn">
          <CheckCircle className="w-[1vw] h-[1vw] text-green-600" />
          <p className="text-[0.74vw] font-medium text-green-900">
            {statusMessage}
          </p>
        </div>
      </div>
    );
  }

  if (
    connectionStatus === "connecting" ||
    connectionStatus === "checking" ||
    connectionStatus === "reconnecting"
  ) {
    const isReconnecting = connectionStatus === "reconnecting";

    return (
      <div className="fixed bottom-[1vw] left-[1vw] z-[100]">
        <div
          className={`flex items-center gap-[1vw] px-[1.3vw] py-[0.5vw] rounded-lg shadow-lg ${
            isReconnecting
              ? "bg-yellow-50 border-2 border-yellow-500"
              : "bg-blue-50 border-2 border-blue-500"
          }`}
        >
          <RefreshCw
            className={`w-[1.2vw] h-[1.2vw] animate-spin ${
              isReconnecting ? "text-yellow-600" : "text-blue-600"
            }`}
          />
          <div className="flex-1">
            <p
              className={`text-[0.74vw] font-medium ${
                isReconnecting ? "text-yellow-900" : "text-blue-900"
              }`}
            >
              {statusMessage}
            </p>
            {!isReconnecting && (
              <p className="text-[0.65vw] text-blue-700 ">Please wait...</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-[1vw] left-[1vw] z-[100]">
      <div className="flex items-center gap-[1vw] px-[1.3vw] py-[0.6vw] rounded-lg shadow-lg bg-red-50 border-2 border-red-500">
        <WifiOff className="w-[1.2vw] h-[1.2vw] text-red-600" />

        <div className="flex-1">
          <p className="text-[0.74vw] font-medium text-red-900">
            {statusMessage}
          </p>
          <p className="text-[0.68vw] text-red-700 mt-[0.1vw]">
            {isFirstConnection
              ? "Unable to connect"
              : "Connection lost"}
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={`flex items-center gap-[0.5vw] px-[0.7vw] py-[0.3vw] rounded-md text-[0.72vw] font-medium transition-all ${
            isRefreshing
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "bg-red-600 text-white hover:bg-red-700 active:scale-95 cursor-pointer"
          }`}
        >
          <RefreshCw
            className={`w-[0.8vw] h-[0.8vw] ${
              isRefreshing ? "animate-spin" : ""
            }`}
          />
          {isRefreshing ? "Retrying..." : "Refresh"}
        </button>
      </div>
    </div>
  );
}
