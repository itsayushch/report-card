"use client";

import { useEffect } from "react";

// Registers the service worker so Chrome can package the PWA as a modern WebAPK
export default function ServiceWorkerProvider() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    let timeoutId: number | undefined;
    let idleId: number | undefined;
    let cancelled = false;

    const register = async () => {
      if (cancelled) return;
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        registration.onupdatefound = () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              registration.waiting?.postMessage({ type: "SKIP_WAITING" });
            }
          });
        };
      } catch (error) {
        console.error("Service worker registration failed", error);
      }
    };

    const scheduleRegister = () => {
      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(() => {
          void register();
        }, { timeout: 4000 });
        return;
      }

      timeoutId = window.setTimeout(() => {
        void register();
      }, 1500);
    };

    if (document.readyState === "complete") {
      scheduleRegister();
    } else {
      window.addEventListener("load", scheduleRegister, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", scheduleRegister);
      if (typeof idleId === "number" && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (typeof timeoutId === "number") {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  return null;
}
