import Game from "@/game/Game";
import ErrorBoundary from "@/game/ui/ErrorBoundary";

export default function Page() {
  return (
    <ErrorBoundary>
      <Game />
    </ErrorBoundary>
  );
}
