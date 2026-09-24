import * as React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Building2, LayoutDashboard, ListChecks, LogOut, Menu, Settings, Sparkles, Users, X } from "lucide-react";
import { useAuth } from "./AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProfileMenu } from "@/components/ProfileMenu";
import { Avatar } from "@/components/Avatar";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/programs", label: "Programs", icon: ListChecks, end: false },
  // Tenant team management -- only the tenant's own admin (owner) can invite/manage teammates.
  { to: "/admin/users", label: "Users", icon: Users, end: false, adminOnly: true },
  { to: "/admin/settings", label: "Settings", icon: Settings, end: false },
  // Cross-tenant, read-only oversight -- only the one platform super_admin sees this.
  { to: "/admin/tenants", label: "Accounts", icon: Building2, end: false, platformOnly: true },
];

function BrandMark() {
  return (
    <div className="flex items-center gap-2 text-base font-semibold tracking-tight">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-brand text-white shadow-glow">
        <Sparkles className="h-4 w-4" />
      </span>
      <span className="gradient-text">Program Registration</span>
    </div>
  );
}

function NavList({ role, onNavigate }: { role?: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {navItems
        .filter((item) => (!item.adminOnly || role === "admin") && (!item.platformOnly || role === "super_admin"))
        .map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-gradient-brand text-white shadow-glow"
                  : "text-muted-foreground hover:bg-gradient-brand-soft hover:text-primary",
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
    </nav>
  );
}

function ProfileFooter({ onLogout }: { onLogout: () => void }) {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="mt-auto flex flex-col gap-3 border-t border-border/70 pt-4">
      <div className="flex items-center gap-2.5 px-1">
        <Avatar name={user.name} src={user.avatarUrl} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-primary">
            {user.role.replace("_", " ")}
          </p>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="justify-start text-destructive hover:bg-destructive/10" onClick={onLogout}>
        <LogOut className="h-4 w-4" />
        Log out
      </Button>
    </div>
  );
}

export function AdminLayout() {
  const { user, logout } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-transparent">
      {/* Persistent top navbar, shown on every screen size */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-border/70 bg-card/80 px-4 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            aria-label="Open navigation"
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <BrandMark />
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <ProfileMenu />
        </div>
      </header>

      {/* Desktop sidebar: always visible, permanent, no toggle */}
      <aside className="fixed inset-y-0 left-0 top-16 z-30 hidden w-64 flex-col border-r border-border/70 bg-card/90 px-4 py-5 backdrop-blur-md md:flex">
        <NavList role={user?.role} />
        <ProfileFooter onLogout={() => logout()} />
      </aside>

      {/* Mobile sidebar drawer: hidden by default, opened via the navbar hamburger.
          It renders above the navbar (higher z-index, full viewport height) with its
          own header row (logo left, close button right), per the small-screen spec. */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border/70 bg-card px-4 py-4 shadow-2xl transition-transform duration-200 md:hidden",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between pb-4">
          <BrandMark />
          <Button variant="ghost" size="icon" aria-label="Close navigation" onClick={() => setMobileSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <NavList role={user?.role} onNavigate={() => setMobileSidebarOpen(false)} />
        <ProfileFooter onLogout={() => logout()} />
      </aside>

      <main className="page-enter min-h-screen pt-16 md:pl-64">
        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
