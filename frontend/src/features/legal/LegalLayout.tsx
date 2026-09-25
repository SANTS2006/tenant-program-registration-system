import * as React from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard } from "lucide-react";
import { useAuth } from "@/app/AuthContext";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LinkButton } from "@/components/ui/link-button";
import { cn } from "@/lib/utils";
import { SiteFooter } from "./SiteFooter";

const SITE_NAV = [
  { to: "/", label: "Home" },
  { to: "/#features", label: "Features" },
  { to: "/#designs", label: "Designs" },
  { to: "/#faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
];

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
        <div className="site-container flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <BrandLogo className="h-9" />
            <span className="gradient-text hidden whitespace-nowrap text-lg sm:inline">Program Registration</span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {SITE_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={({ isActive }) =>
                  cn(
                    "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors hover:bg-gradient-brand-soft hover:text-primary",
                    isActive ? "bg-gradient-brand-soft text-primary" : "text-muted-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
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
