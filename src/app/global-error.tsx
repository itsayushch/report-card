"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
          <h1 className="mb-4 text-4xl font-bold">Something went wrong</h1>
          <p className="mb-8 text-lg text-gray-600">
            A critical error occurred. We've been notified and are working on it.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded bg-primary px-6 py-2 font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
