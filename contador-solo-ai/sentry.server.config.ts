// This file configures the initialization of Sentry on the server side
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Configure error filtering for ContabilidadePRO server
  beforeSend(event, hint) {
    // Filter out development errors
    if (process.env.NODE_ENV === 'development') {
      return null;
    }

    // Filter out specific server errors that aren't actionable
    if (event.exception) {
      const error = hint.originalException;
      if (error instanceof Error) {
        // Skip Supabase connection timeouts (usually temporary)
        if (error.message.includes('timeout') && 
            error.message.includes('supabase')) {
          return null;
        }
      }
    }

    return event;
  },

  // Add server-specific tags
  initialScope: {
    tags: {
      component: "server",
      system: "contabilidadepro"
    },
  },
});
