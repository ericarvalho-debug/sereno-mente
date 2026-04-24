import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import TherapistList from "./pages/TherapistList";
import PatientDashboard from "./pages/PatientDashboard";
import TherapistDashboard from "./pages/TherapistDashboard";
import Messages from "./pages/Messages";
import ImageGen from "./pages/ImageGen";
import Schedule from "./pages/Schedule";
import NotFound from "./pages/NotFound";
import { DebugErrorThrower } from "@/components/debug/DebugErrorThrower";
import { ErrorDebugPopup } from "@/components/debug/ErrorDebugPopup";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      {/* DebugErrorThrower deve ficar FORA de qualquer ErrorBoundary/Suspense
          para que o erro intencional escape ao overlay global da Lovable. */}
      <DebugErrorThrower />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ErrorDebugPopup />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/therapists" element={<TherapistList />} />
            <Route path="/dashboard/patient" element={<PatientDashboard />} />
            <Route path="/dashboard/therapist" element={<TherapistDashboard />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/image-gen" element={<ImageGen />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
