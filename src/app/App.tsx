import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "@/app/router";
import { ToastProvider } from "@/lib/toast";

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </BrowserRouter>
  );
}
