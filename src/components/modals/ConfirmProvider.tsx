import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/overlays";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}
type ConfirmFn = (o: ConfirmOptions) => Promise<boolean>;
const Ctx = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [open, setOpen] = useState(false);
  const resolver = useRef<(v: boolean) => void>();
  const confirm = useCallback<ConfirmFn>((o) => {
    setOpts(o);
    setOpen(true);
    return new Promise<boolean>((res) => (resolver.current = res));
  }, []);
  const close = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = undefined;
    setOpen(false);
  };
  return (
    <Ctx.Provider value={confirm}>
      {children}
      <Dialog open={open} onOpenChange={(o) => !o && close(false)}>
        <DialogContent size="sm">
          <DialogHeader className="flex flex-row items-start gap-3 space-y-0">
            <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", opts?.destructive ? "bg-danger/10 text-danger" : "bg-lime/25 text-lime-ink")}>
              {opts?.destructive ? <AlertTriangle className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
            </span>
            <div className="space-y-1">
              <DialogTitle className="text-lg">{opts?.title}</DialogTitle>
              {opts?.description && <DialogDescription>{opts.description}</DialogDescription>}
            </div>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => close(false)}>{opts?.cancelText ?? "Cancel"}</Button>
            <Button variant={opts?.destructive ? "destructive" : "default"} onClick={() => close(true)} autoFocus>
              {opts?.confirmText ?? "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
}

export function useConfirm() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useConfirm outside ConfirmProvider");
  return c;
}
