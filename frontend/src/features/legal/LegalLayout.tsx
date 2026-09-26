import * as React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard } from "lucide-react";
import { useAuth } from "@/app/AuthContext";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LinkButton } from "@/components/ui/link-button";
import { SiteFooter } from "./SiteFooter";

/** Header and footer for the website's legal and support pages. */
export function LegalLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  React.useEffect(() => {
    window.scrollTo({ top: 0 });
    document.getElementById("robots-meta")?.setAttribute("content", "index, follow");
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-transparent">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <BrandLogo className="h-9" />
            <span className="gradient-text hidden whitespace-nowrap text-lg sm:inline">Program Registration</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <LinkButton to="/admin" variant="default" size="sm" className="rounded-full">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </LinkButton>
            ) : (
              <>
                <LinkButton to="/login" variant="outline" size="sm" className="rounded-full">
                  Sign in
                </LinkButton>
                <LinkButton to="/register" variant="default" size="sm" className="hidden rounded-full sm:inline-flex">
                  Get started
                </LinkButton>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="page-enter flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
