"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ReactNode, useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useUser } from "@clerk/nextjs";
import * as Sentry from "@sentry/nextjs";
import { Toaster } from "@/components/ui/sonner";
import { env } from "@/lib/env";

if (typeof window !== "undefined" && env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: env.NEXT_PUBLIC_POSTHOG_HOST,
    capture_pageview: "history_change",
    capture_pageleave: true,
    persistence: "localStorage+cookie",
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "[data-sensitive]",
    },
  });
}

function ClerkIdentity() {
  const { user } = useUser();
  useEffect(() => {
    if (user) {
      posthog.identify(user.id, {
        email: user.emailAddresses[0]?.emailAddress,
        name: user.firstName,
      });
      Sentry.setUser({ id: user.id, email: user.emailAddresses[0]?.emailAddress });
    } else {
      posthog.reset();
      Sentry.setUser(null);
    }
  }, [user]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const content = (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ClerkIdentity />
      {children}
      <Toaster richColors position="top-right" />
    </NextThemesProvider>
  );

  if (env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <PHProvider client={posthog}>{content}</PHProvider>;
  }
  return content;
}
