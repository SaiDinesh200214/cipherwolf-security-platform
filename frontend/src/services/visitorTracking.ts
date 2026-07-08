import { getApiUrl } from "./api";

const VISITOR_ID_KEY = "cipherwolf_visitor_id";
const SESSION_ID_KEY = "cipherwolf_session_id";
const SESSION_STARTED_KEY = "cipherwolf_session_started_at";
const ANALYTICS_OPT_OUT_KEY = "cipherwolf_analytics_opt_out";

export interface VisitorLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
}

let currentLocation: VisitorLocation | null = null;
let currentLocationError: string | undefined;
let locationRequested = false;

function createId(prefix: string) {
  if ("crypto" in window && typeof window.crypto.randomUUID === "function") {
    return `${prefix}_${window.crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function getVisitorId() {
  let visitorId = localStorage.getItem(VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = createId("visitor");
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }
  return visitorId;
}

export function getSessionId() {
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = createId("session");
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    sessionStorage.setItem(SESSION_STARTED_KEY, new Date().toISOString());
  }
  return sessionId;
}

function detectBrowser(userAgent: string) {
  if (/Edg\//.test(userAgent)) return "Microsoft Edge";
  if (/Chrome\//.test(userAgent) && !/Chromium/.test(userAgent)) return "Chrome";
  if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent)) return "Safari";
  if (/Firefox\//.test(userAgent)) return "Firefox";
  return "Unknown Browser";
}

function detectOS(userAgent: string) {
  if (/Windows NT/.test(userAgent)) return "Windows";
  if (/Mac OS X/.test(userAgent)) return "macOS";
  if (/Android/.test(userAgent)) return "Android";
  if (/iPhone|iPad|iPod/.test(userAgent)) return "iOS";
  if (/Linux/.test(userAgent)) return "Linux";
  return "Unknown OS";
}

function detectDevice(userAgent: string) {
  if (/iPad|Tablet/.test(userAgent)) return "Tablet";
  if (/Mobi|Android|iPhone|iPod/.test(userAgent)) return "Mobile";
  return "Desktop";
}

export function buildVisitorPayload(type: string, extra: Record<string, unknown> = {}, location: VisitorLocation | null = null, locationError?: string) {
  const userAgent = navigator.userAgent;
  const sessionStartedAt = sessionStorage.getItem(SESSION_STARTED_KEY) || new Date().toISOString();
  const now = Date.now();
  const started = Date.parse(sessionStartedAt);

  return {
    type,
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
    collectedAt: new Date().toISOString(),
    clientTimestamp: Date.now(),
    sessionStartedAt,
    visitDurationMs: Number.isFinite(started) ? Math.max(0, now - started) : 0,
    location: location || currentLocation,
    locationError: locationError || currentLocationError,
    page: window.location.href,
    path: window.location.pathname,
    referrer: document.referrer || null,
    userAgent,
    browser: detectBrowser(userAgent),
    os: detectOS(userAgent),
    device: detectDevice(userAgent),
    language: navigator.language,
    languages: navigator.languages,
    platform: navigator.platform,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      colorDepth: window.screen.colorDepth,
      pixelRatio: window.devicePixelRatio,
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    ...extra,
  };
}

export function trackVisitorEvent(type: string, extra: Record<string, unknown> = {}, location: VisitorLocation | null = null, locationError?: string) {
  try {
    if (localStorage.getItem(ANALYTICS_OPT_OUT_KEY) === "true") return;
    const payload = buildVisitorPayload(type, extra, location, locationError);
    const body = JSON.stringify(payload);
    const blob = new Blob([body], { type: "application/json" });
    const visitorLogUrl = getApiUrl("/visitor-log");

    if (!navigator.sendBeacon?.(visitorLogUrl, blob)) {
      void fetch(visitorLogUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => undefined);
    }
  } catch {
    // Analytics must never break the portfolio experience.
  }
}

export function requestVisitorLocation() {
  if (locationRequested || !("geolocation" in navigator)) return;
  locationRequested = true;
  navigator.geolocation.getCurrentPosition(
    (position) => {
      currentLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        altitudeAccuracy: position.coords.altitudeAccuracy,
        heading: position.coords.heading,
        speed: position.coords.speed,
      };
      currentLocationError = undefined;
      trackVisitorEvent("location_granted", { permission: "granted" }, currentLocation);
    },
    (error) => {
      currentLocationError = error.message || "Location permission unavailable";
      trackVisitorEvent("location_unavailable", { permission: "denied_or_unavailable", code: error.code }, null, currentLocationError);
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 5 * 60 * 1000 }
  );
}
