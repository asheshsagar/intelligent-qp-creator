import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ExamTypeSelection from "./pages/ExamTypeSelection";
import CieExamSetup from "./pages/CieExamSetup";
import SemesterExamSetup from "./pages/SemesterExamSetup";
import GenerateQuestions from "./pages/GenerateQuestions";
import DocumentUpload from "./pages/DocumentUpload";
import WelcomeSplash from "./pages/WelcomeSplash";
import { AuthProvider } from "./contexts/AuthContext";
import SecureRoute from "./components/SecureRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Welcome splash screen as root route */}
            <Route path="/" element={<WelcomeSplash />} />

            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes */}
            <Route element={<SecureRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/document-upload" element={<DocumentUpload />} />
              <Route path="/upload-documents" element={<DocumentUpload />} /> {/* ✅ Alias route */}
              <Route path="/exam-type-selection" element={<ExamTypeSelection />} />
              <Route path="/cie-exam-setup" element={<CieExamSetup />} />
              <Route path="/semester-exam-setup" element={<SemesterExamSetup />} />
              <Route path="/generate-questions" element={<GenerateQuestions />} />
            </Route>

            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
