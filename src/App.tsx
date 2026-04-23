import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Chats from "./pages/Chats.tsx";
import Chat from "./pages/Chat.tsx";
import Contacts from "./pages/Contacts.tsx";
import Settings from "./pages/Settings.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/chats"
              element={
                <RequireAuth>
                  <AppShell><Chats /></AppShell>
                </RequireAuth>
              }
            />
            <Route
              path="/contacts"
              element={
                <RequireAuth>
                  <AppShell><Contacts /></AppShell>
                </RequireAuth>
              }
            />
            <Route
              path="/settings"
              element={
                <RequireAuth>
                  <AppShell><Settings /></AppShell>
                </RequireAuth>
              }
            />
            <Route
              path="/chat/:id"
              element={
                <RequireAuth>
                  <Chat />
                </RequireAuth>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
