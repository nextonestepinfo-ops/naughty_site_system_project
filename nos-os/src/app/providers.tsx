"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { RegisterServiceWorker } from "@/lib/pwa/register-service-worker";
import { NotificationMonitor } from "@/lib/pwa/notification-monitor";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 20_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={queryClient}>
        {children}
        <RegisterServiceWorker />
        <NotificationMonitor />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
