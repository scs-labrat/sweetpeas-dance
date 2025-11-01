import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import { Home, Settings, Calendar, DollarSign, FileText, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function Layout({ children, currentPageName }) {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false,
  });

  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Static Header */}
      <header className="bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Brand */}
            <Link to={createPageUrl("Home")} className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-2xl">🌸</span>
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight">Sweetpeas</h1>
                <p className="text-xs text-rose-100">Dance Studio</p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-1">
              <Link
                to={createPageUrl("Home")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  currentPageName === "Home"
                    ? "bg-white/20 text-white"
                    : "text-rose-100 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Home className="w-4 h-4" />
                <span className="hidden md:inline">Home</span>
              </Link>

              {isAdmin && (
                <Link
                  to={createPageUrl("Admin")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    currentPageName === "Admin"
                      ? "bg-white/20 text-white"
                      : "text-rose-100 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden md:inline">Admin</span>
                </Link>
              )}

              {user && (
                <button
                  onClick={() => base44.auth.logout()}
                  className="ml-2 px-4 py-2 rounded-lg bg-white/10 text-rose-100 hover:bg-white/20 hover:text-white transition-colors"
                >
                  Logout
                </button>
              )}

              {!user && (
                <button
                  onClick={() => base44.auth.redirectToLogin()}
                  className="ml-2 px-4 py-2 rounded-lg bg-white/10 text-rose-100 hover:bg-white/20 hover:text-white transition-colors"
                >
                  Login
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main>{children}</main>
    </div>
  );
}