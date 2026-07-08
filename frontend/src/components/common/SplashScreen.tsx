import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { buildVisitorPayload, trackVisitorEvent, type VisitorLocation } from "../../services/visitorTracking";

interface SplashScreenProps {
  onComplete: () => void;
}

function saveVisitorData(location: VisitorLocation | null, locationError?: string) {
  const payload = buildVisitorPayload("continue_click", {}, location, locationError);

  try {
    const existing = JSON.parse(localStorage.getItem("visitor_data_logs") || "[]");
    const logs = Array.isArray(existing) ? existing : [];
    logs.unshift(payload);
    localStorage.setItem("visitor_data_latest", JSON.stringify(payload));
    localStorage.setItem("visitor_data_logs", JSON.stringify(logs.slice(0, 25)));
  } catch {
    // Storage may be blocked; the portfolio should still open.
  }

  trackVisitorEvent("continue_click", {}, location, locationError);
}

function saveConsentTimestamp() {
  try {
    localStorage.setItem("site_consent_timestamp", Date.now().toString());
  } catch {
    // Storage can be unavailable; still allow the visitor to enter.
  }
}

function requestExactLocation(): Promise<VisitorLocation | null> {
  if (!("geolocation" in navigator)) {
    saveVisitorData(null, "Geolocation is not supported by this browser.");
    return Promise.resolve(null);
  }

  if (!window.isSecureContext) {
    saveVisitorData(
      null,
      "Precise location requires HTTPS or localhost in modern browsers."
    );
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { coords } = position;
        const location = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          altitude: coords.altitude,
          altitudeAccuracy: coords.altitudeAccuracy,
          heading: coords.heading,
          speed: coords.speed,
        };
        saveVisitorData(location);
        resolve(location);
      },
      (error) => {
        saveVisitorData(null, error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );
  });
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<"intro" | "ready" | "exiting">("intro");
  const [isCollecting, setIsCollecting] = useState(false);
  const reduceMotion = useReducedMotion();

  // Lock scroll while splash is showing
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Keep the onboarding screen visible until the visitor chooses to continue.
  useEffect(() => {
    const t = setTimeout(() => {
      setPhase("ready");
    }, reduceMotion ? 450 : 1200);
    return () => clearTimeout(t);
  }, [reduceMotion]);

  const enterPortfolio = () => {
    setPhase("exiting");
    window.setTimeout(onComplete, reduceMotion ? 120 : 620);
  };

  const handleContinue = async (sharePreciseLocation = false) => {
    if (isCollecting || phase !== "ready") return;
    setIsCollecting(true);

    saveConsentTimestamp();

    if (sharePreciseLocation) {
      await requestExactLocation();
    } else {
      saveVisitorData(null, "Precise location not requested.");
    }

    enterPortfolio();
  };

  return (
    <AnimatePresence>
      {phase !== ("done" as string) && (
        <motion.div
          /* ── WHITE background matching your light theme ── */
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden px-4"
          style={{ backgroundColor: "var(--bg-primary, #ffffff)" }}
          initial={{ opacity: 1 }}
          animate={{ opacity: phase === "exiting" ? 0 : 1 }}
          transition={{ duration: reduceMotion ? 0.08 : 0.45, ease: "easeOut" }}
        >
          {/* Subtle radial glow — uses --primary color */}
          <div
            className="pointer-events-none absolute"
            style={{
              width: "600px",
              height: "600px",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)",
              filter: "blur(60px)",
            }}
          />

          {/* ── Main content ── */}
          <div className="relative z-10 flex flex-col items-center gap-2 select-none text-center px-6">
            {/* Tagline */}
            <motion.p
              style={{ color: "var(--primary, #6366f1)" }}
              className="text-[0.65rem] sm:text-xs font-medium tracking-[0.28em] sm:tracking-[0.4em] uppercase mb-5 sm:mb-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              ✦ &nbsp; Cybersecurity · Networking · Security &nbsp; ✦
            </motion.p>

            {/* WELCOME */}
            <div className="overflow-hidden">
              <motion.h1
                style={{ color: "var(--text, #111827)" }}
                className="text-[clamp(2.8rem,11vw,8rem)] font-black leading-none tracking-tight"
                initial={{ y: "100%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 0.9, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                WELCOME
              </motion.h1>
            </div>

            {/* Name */}
            <div className="overflow-hidden">
              <motion.h2
                style={{ color: "var(--primary, #6366f1)" }}
                className="text-[clamp(1.4rem,5vw,3.5rem)] font-bold leading-tight tracking-tight"
                initial={{ y: "100%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 0.9, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
              >
                Sai Dinesh Andekar
              </motion.h2>
            </div>

            {/* Portfolio subtitle */}
            <div className="overflow-hidden mt-1">
              <motion.p
                style={{ color: "var(--text-secondary, #6b7280)" }}
                className="text-[clamp(0.9rem,2.5vw,1.4rem)] font-light tracking-widest"
                initial={{ y: "100%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 0.9, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
              >
                Portfolio
              </motion.p>
            </div>

            {/* Animated divider */}
            <motion.div
              className="mt-8 h-px"
              style={{ backgroundColor: "var(--border, #e5e7eb)" }}
              initial={{ width: 0 }}
              animate={{ width: "min(380px, 75vw)" }}
              transition={{ duration: 1.1, delay: 1.0, ease: [0.16, 1, 0.3, 1] }}
            />

            <AnimatePresence>
              {phase === "ready" && (
                <motion.div
                  className="mt-8 flex flex-col items-center gap-3"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                >
                  <button
                    onClick={() => void handleContinue(false)}
                    disabled={isCollecting}
                    className="eleken-cta min-w-40 px-8 py-3 text-sm sm:text-base shadow-xl"
                  >
                    {isCollecting ? "Entering..." : "Continue"}
                  </button>
                  <button
                    onClick={() => void handleContinue(true)}
                    disabled={isCollecting}
                    className="text-xs font-semibold text-(--text-secondary) underline-offset-4 transition hover:text-(--primary) hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Share precise location
                  </button>
                  <p
                    className="max-w-xs text-[0.68rem] sm:text-xs leading-5"
                    style={{ color: "var(--text-secondary, #6b7280)" }}
                  >
                    Continue opens the portfolio without a location prompt. Precise location is optional.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
