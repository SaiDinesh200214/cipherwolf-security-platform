import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CONSENT_KEY = "site_consent_timestamp";
const EXPIRY_MS = 4 * 60 * 60 * 1000;

export default function CookieBanner() {
  const [visible, setVisible] = useState(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      return !stored || Date.now() - parseInt(stored, 10) > EXPIRY_MS;
    } catch {
      return true;
    }
  });

  const accept = () => {
    try {
      localStorage.setItem(CONSENT_KEY, Date.now().toString());
    } catch {
      // Storage can be blocked in private/mobile browsers. Hide the banner anyway.
    }
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed bottom-6 left-6 z-[9999] max-w-80"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-5">
            <span className="font-semibold text-(--text)">🍪 Cookie Notice</span>
            <p className="mt-3 text-sm leading-5 text-(--text-secondary)">
              This site uses essential cookies to remember your choice and keep the
              portfolio running smoothly. No GPS permission is requested.
            </p>
            <div className="flex items-center justify-between mt-4 gap-4">
              <button className="text-xs text-(--text) underline hover:text-(--text-secondary) transition">
                Manage preferences
              </button>
              <button
                onClick={accept}
                className="text-xs font-medium bg-(--primary) text-white rounded-lg px-4 py-2.5 hover:opacity-90 transition"
              >
                Accept
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
