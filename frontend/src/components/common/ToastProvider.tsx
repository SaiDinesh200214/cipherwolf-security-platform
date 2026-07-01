import {
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ToastContext, type ToastItem, type ToastType } from "./ToastContext";

let idCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback(
    (title: string, message: string, type: ToastType, action?: { label: string; onClick: () => void }): number => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, title, message, type, actionLabel: action?.label, onAction: action?.onClick }]);
      if (type !== "loading") {
        setTimeout(
          () => setToasts((prev) => prev.filter((t) => t.id !== id)),
          4500
        );
      }
      return id;
    },
    []
  );

  const updateToast = useCallback(
    (id: number, title: string, message: string, type: ToastType, action?: { label: string; onClick: () => void }) => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, title, message, type, actionLabel: action?.label, onAction: action?.onClick } : t))
      );
      if (type !== "loading") {
        setTimeout(
          () => setToasts((prev) => prev.filter((t) => t.id !== id)),
          4500
        );
      }
    },
    []
  );

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, updateToast, removeToast }}>
      {children}

      {/* Toast stack — centered and above the page without blocking clicks outside the card. */}
      <div
        className="pointer-events-none fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: 9998 }}
      >
        <div className="flex w-full max-w-sm flex-col gap-3">
          <AnimatePresence>
            {toasts.map((t) => (
              <ToastCard key={t.id} toast={t} onRemove={removeToast} />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </ToastContext.Provider>
  );
}

/* ─────────────── Card — white card style matching your site ─────────────── */

function ToastCard({
  toast,
  onRemove,
}: {
  toast: ToastItem;
  onRemove: (id: number) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.96, transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      className="pointer-events-auto relative overflow-hidden rounded-2xl shadow-2xl"
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid var(--border, #e5e7eb)",
      }}
    >
      {/* Dismiss × */}
      <button
        onClick={() => onRemove(toast.id)}
        className="absolute right-2.5 top-2.5 w-7 h-7 flex items-center justify-center rounded-lg transition shrink-0"
        style={{
          border: "1px solid var(--border, #e5e7eb)",
          color: "var(--text-secondary, #6b7280)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#ef4444";
          (e.currentTarget as HTMLButtonElement).style.color = "#fff";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "#ef4444";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "";
          (e.currentTarget as HTMLButtonElement).style.color =
            "var(--text-secondary, #6b7280)";
          (e.currentTarget as HTMLButtonElement).style.borderColor =
            "var(--border, #e5e7eb)";
        }}
        aria-label="Dismiss"
      >
        ×
      </button>

      <div className="px-6 pt-6 pb-5 text-center">
        {/* Icon circle */}
        <div
          className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
            toast.type === "success"
              ? "bg-green-100"
              : toast.type === "error"
              ? "bg-red-100"
              : ""
          }`}
          style={
            toast.type === "loading"
              ? { backgroundColor: "var(--bg-card, #f9fafb)" }
              : {}
          }
        >
          {toast.type === "loading" ? (
            <span
              className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin block"
              style={{ borderColor: "var(--text-secondary, #6b7280)", borderTopColor: "transparent" }}
            />
          ) : toast.type === "success" ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 7L9 18l-5-5"
                stroke="#16a34a"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="#dc2626"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>

        {/* Title */}
        <p
          className="font-semibold text-sm"
          style={{
            color:
              toast.type === "success"
                ? "#15803d"
                : toast.type === "error"
                ? "#dc2626"
                : "var(--text, #111827)",
          }}
        >
          {toast.title}
        </p>

        {/* Message */}
        <p
          className="mt-1 text-xs leading-relaxed"
          style={{ color: "var(--text-secondary, #6b7280)" }}
        >
          {toast.message}
        </p>
        {toast.actionLabel && toast.onAction && (
          <button
            onClick={() => {
              toast.onAction?.();
              onRemove(toast.id);
            }}
            className="mt-4 rounded-xl px-4 py-2 text-xs font-black text-white"
            style={{ backgroundColor: "var(--text, #111827)" }}
          >
            {toast.actionLabel}
          </button>
        )}
      </div>
    </motion.div>
  );
}
