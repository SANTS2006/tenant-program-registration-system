import { Link, Outlet } from "react-router-dom";
import { BrandLogo } from "@/components/BrandLogo";
import { LinkButton } from "@/components/ui/link-button";
import { ThemeToggle } from "@/components/ThemeToggle";

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-transparent">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-card/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:py-4">
          <Link to="/programs" className="flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg">
            <BrandLogo className="h-9" />
            <span className="gradient-text hidden sm:inline">Program Registration</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LinkButton to="/login" variant="default" size="sm">
              Login
            </LinkButton>
          </div>
        </div>
      </header>
      <main className="page-enter mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-8">
        <Outlet />
      </main>
      <footer className="border-t border-border/70 py-6 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Program Registration Platform
      </footer>
    </div>
  );
}
