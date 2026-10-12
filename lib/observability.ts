// Settings shared by Sentry on the server, at the edge and in the browser.
// Without NEXT_PUBLIC_SENTRY_DSN nothing is sent anywhere.

const EMAIL = /[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+/g;

// Replace anything that looks like an email address. Error messages can
// carry what someone typed; Toran never sends personal data to Sentry.
export function scrubEmails(text: string): string {
  return text.replace(EMAIL, "[email removed]");
}

type EventLike = {
  message?: string;
  exception?: { values?: { value?: string }[] };
  request?: { query_string?: unknown; cookies?: unknown; headers?: unknown };
  user?: unknown;
};

export function scrubEvent<T extends EventLike>(event: T): T {
  if (event.message) event.message = scrubEmails(event.message);
  for (const ex of event.exception?.values ?? []) {
    if (ex.value) ex.value = scrubEmails(ex.value);
  }
  if (event.request) {
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.query_string;
  }
  delete event.user;
  return event;
}

export function sentryOptions() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  return {
    dsn: dsn || undefined,
    enabled: Boolean(dsn),
    environment:
      process.env.NEXT_PUBLIC_VERCEL_ENV ??
      process.env.VERCEL_ENV ??
      "development",
    release:
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
      process.env.VERCEL_GIT_COMMIT_SHA,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    beforeSend: scrubEvent,
  };
}
