import React, { createContext, useContext, useState, useCallback } from "react";
import Notification from "./ToastProp";

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifProps, setNotifProps] = useState(null);

  const notify = useCallback(({ title, message, actionButton, duration }) => {
    setNotifProps({
      title,
      message,
      actionButton,
      duration,
      onClose: () => setNotifProps(null),
    });
  }, []);

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      {notifProps && <Notification {...notifProps} />}
    </NotificationContext.Provider>
  );
};
