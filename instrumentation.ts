import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/observability";

export function register() {
  const options = sentryOptions();
  if (options.enabled) Sentry.init(options);
}

// Reports errors thrown while rendering pages and running route handlers.
export const onRequestError = Sentry.captureRequestError;
