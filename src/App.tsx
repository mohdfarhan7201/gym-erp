import { useCallback, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { AnimatePresence, MotionConfig } from "framer-motion";
import { Toaster } from "sonner";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ConfirmProvider } from "@/components/modals/ConfirmProvider";
import { ReceiptProvider } from "@/components/modals/ReceiptProvider";
import { AppLoader } from "@/components/loaders/AppLoader";
import { AppRoutes } from "@/routes/AppRoutes";

function ThemedToaster() {
  const { resolved } = useTheme();
  return (
    <Toaster
      theme={resolved}
      position="top-right"
      richColors
      closeButton
      offset={16}
      toastOptions={{ classNames: { toast: "!rounded-xl !font-sans !shadow-lift", title: "!font-semibold" } }}
    />
  );
}

export default function App() {
  const [booting, setBooting] = useState(() => {
    try {
      return !sessionStorage.getItem("gymerp:booted");
    } catch {
      return true;
    }
  });
  const done = useCallback(() => {
    try {
      sessionStorage.setItem("gymerp:booted", "1");
    } catch {
      /* ignore */
    }
    setBooting(false);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <ConfirmProvider>
              <ReceiptProvider>
                <AppRoutes />
              </ReceiptProvider>
            </ConfirmProvider>
          </AuthProvider>
        </BrowserRouter>
        <ThemedToaster />
        <AnimatePresence>{booting && <AppLoader key="loader" onDone={done} />}</AnimatePresence>
      </ThemeProvider>
    </MotionConfig>
  );
}
