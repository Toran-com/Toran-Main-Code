import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/observability";

const options = sentryOptions();
if (options.enabled) Sentry.init(options);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
