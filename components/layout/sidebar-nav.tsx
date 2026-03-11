"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  LogOut,
  Settings,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/hooks/use-organization";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/produtos", label: "Produtos", icon: Package },
  { href: "/dashboard/transacoes", label: "Transações", icon: ArrowLeftRight },
  { href: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { organization } = useOrganization();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Logout realizado.");
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col border-r border-border/60 bg-sidebar">
      <div className="flex h-14 items-center px-5">
        <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Package className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <span className="block text-base font-semibold tracking-tight truncate">
              StockFlow
            </span>
            {organization && (
              <span className="block text-[11px] text-muted-foreground truncate -mt-0.5">
                {organization.name}
              </span>
            )}
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/60 p-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground text-[13px] px-3"
          onClick={handleLogout}
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair
        </Button>
        <ThemeToggle />
      </div>
    </aside>
  );
}
