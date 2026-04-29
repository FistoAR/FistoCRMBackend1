import React, { createContext, useContext, useState, useCallback } from "react";
import ConfirmationModal from "./ConfirmationModal";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    onConfirm: null,
    onCancel: null,
  });

  const confirm = useCallback(
    ({ type = "info", title, message, confirmText = "Confirm", cancelText = "Cancel" }) =>
      new Promise((resolve) => {
        setConfirmState({
          isOpen: true,
          type,
          title,
          message,
          confirmText,
          cancelText,
          onConfirm: () => {
            setConfirmState((s) => ({ ...s, isOpen: false }));
            resolve(true);
          },
          onCancel: () => {
            setConfirmState((s) => ({ ...s, isOpen: false }));
            resolve(false);
          },
        });
      }),
    []
  );

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmationModal {...confirmState} />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}
