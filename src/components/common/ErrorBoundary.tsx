import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Keeps a crash in one page from blanking the whole app. */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidUpdate(prev: { resetKey?: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  componentDidCatch(error: Error) {
    console.error("Page crashed:", error);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div data-error-boundary className="grid min-h-[50vh] place-items-center text-center">
        <div className="max-w-md">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-danger/10 text-danger"><AlertTriangle className="h-6 w-6" /></div>
          <h2 className="font-display text-2xl font-bold uppercase">Something went wrong</h2>
          <p className="mt-1 text-sm text-muted-foreground">{this.state.error.message}</p>
          <Button className="mt-4" variant="outline" onClick={() => this.setState({ error: null })}>Try again</Button>
        </div>
      </div>
    );
  }
}
