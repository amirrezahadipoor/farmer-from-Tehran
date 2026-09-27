"use client";

import { useEffect } from "react";
import { reportError } from "@/game/errors";
import Recovery from "@/game/ui/Recovery";

/** خطا در خودِ layout: Next این را جای کلِ سند می‌گذارد، پس html و body لازم است (مورد ۴) */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error, "next:global-error");
  }, [error]);
  return (
    <html lang="fa" dir="rtl">
      <body>
        <Recovery error={error} onRetry={reset} />
      </body>
    </html>
  );
}
