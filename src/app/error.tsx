"use client";

import { useEffect } from "react";
import { reportError } from "@/game/errors";
import Recovery from "@/game/ui/Recovery";

/** مرزِ خطای مسیرِ Next (لایه‌ی دوم پشتِ ErrorBoundaryِ بازی، مورد ۴) */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error, "next:error");
  }, [error]);
  return <Recovery error={error} onRetry={reset} />;
}
