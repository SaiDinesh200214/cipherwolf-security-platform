import { createContext, useContext } from "react";

export type ToastType = "success" | "error" | "loading";

export interface ToastItem {
  id: number;
  title: string;
  message: string;
  type: ToastType;
  actionLabel?: string;
  onAction?: () => void;
}

export interface ToastContextValue {
  showToast: (title: string, message: string, type: ToastType, action?: { label: string; onClick: () => void }) => number;
  updateToast: (id: number, title: string, message: string, type: ToastType, action?: { label: string; onClick: () => void }) => void;
  removeToast: (id: number) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
