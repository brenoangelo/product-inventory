"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, Package, AlertTriangle, Users, ArrowLeftRight, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/hooks/use-organization";
import { usePlanLimits } from "@/hooks/use-plan-limits";
import { useQuery } from "@tanstack/react-query";

interface Notification {
  id: string;
  type: "low_stock" | "product_limit" | "transaction_limit" | "member_limit";
  title: string;
  description: string;
  href?: string;
  icon: React.ElementType;
  iconClass: string;
}

function useUserDisplay() {
  const [display, setDisplay] = useState<{ name: string; initials: string }>({
    name: "",
    initials: "",
  });

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (!user) return;
        const fullName =
          (user.user_metadata?.full_name as string) ||
          (user.user_metadata?.name as string) ||
          "";
        const email = user.email ?? "";

        if (fullName) {
          const parts = fullName.trim().split(" ");
          const initials = parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : parts[0].slice(0, 2).toUpperCase();
          setDisplay({ name: fullName, initials });
        } else {
          const local = email.split("@")[0];
          setDisplay({
            name: local,
            initials: local.slice(0, 2).toUpperCase(),
          });
        }
      });
  }, []);

  return display;
}

function useLowStockProducts() {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ["low-stock-products", organization?.id],
    queryFn: async () => {
      if (!organization) return [];
      const client = createClient();
      const { data } = await client
        .from("products")
        .select("id, name, stock_quantity")
        .eq("organization_id", organization.id)
        .lte("stock_quantity", 5)
        .order("stock_quantity", { ascending: true })
        .limit(10);
      return data ?? [];
    },
    enabled: !!organization,
    staleTime: 60_000,
  });
}

export function DashboardHeader() {
  const user = useUserDisplay();
  const {
    limits,
    usage,
    canCreateProduct,
    canCreateTransaction,
    canInviteMember,
    planLabel,
  } = usePlanLimits();
  const { data: lowStockProducts } = useLowStockProducts();

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Build notifications
  const notifications: Notification[] = [];

  if (lowStockProducts && lowStockProducts.length > 0) {
    notifications.push({
      id: "low-stock",
      type: "low_stock",
      title: `${lowStockProducts.length} produto${lowStockProducts.length > 1 ? "s" : ""} com estoque baixo`,
      description: lowStockProducts
        .slice(0, 3)
        .map((p) => `${p.name} (${p.stock_quantity})`)
        .join(", ") + (lowStockProducts.length > 3 ? "..." : ""),
      href: "/dashboard/produtos",
      icon: AlertTriangle,
      iconClass: "text-amber-500 bg-amber-500/10",
    });
  }

  if (!canCreateProduct) {
    notifications.push({
      id: "product-limit",
      type: "product_limit",
      title: "Limite de produtos atingido",
      description: `${usage.products}/${limits.maxProducts} produtos. Faça upgrade do plano ${planLabel}.`,
      href: "/dashboard/configuracoes",
      icon: Package,
      iconClass: "text-red-500 bg-red-500/10",
    });
  }

  if (!canCreateTransaction) {
    notifications.push({
      id: "transaction-limit",
      type: "transaction_limit",
      title: "Limite de transações do mês atingido",
      description: `${usage.transactionsThisMonth}/${limits.maxTransactionsPerMonth} transações. Faça upgrade do plano ${planLabel}.`,
      href: "/dashboard/configuracoes",
      icon: ArrowLeftRight,
      iconClass: "text-red-500 bg-red-500/10",
    });
  }

  if (!canInviteMember) {
    notifications.push({
      id: "member-limit",
      type: "member_limit",
      title: "Limite de membros atingido",
      description: `${usage.members}/${limits.maxMembers} membros. Faça upgrade do plano ${planLabel}.`,
      href: "/dashboard/configuracoes",
      icon: Users,
      iconClass: "text-red-500 bg-red-500/10",
    });
  }

  const count = notifications.length;

  return (
    <header className="hidden md:flex h-14 sticky top-0 bg-background items-center justify-end gap-3 border-b border-border/60 px-6">
      {/* Notification bell */}
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
        >
          <Bell className="h-[18px] w-[18px]" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {count}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-border/60 bg-popover shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
              <span className="text-[13px] font-semibold">Notificações</span>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-[13px] text-muted-foreground">
                  Nenhuma notificação
                </p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((n) => {
                  const content = (
                    <div
                      key={n.id}
                      className="flex gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${n.iconClass}`}
                      >
                        <n.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium leading-tight">
                          {n.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                          {n.description}
                        </p>
                      </div>
                    </div>
                  );

                  if (n.href) {
                    return (
                      <Link
                        key={n.id}
                        href={n.href}
                        onClick={() => setOpen(false)}
                      >
                        {content}
                      </Link>
                    );
                  }
                  return content;
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* User avatar */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-[12px] font-semibold">
          {user.initials}
        </div>
        <span className="text-[13px] font-medium text-foreground max-w-[140px] truncate">
          {user.name}
        </span>
      </div>
    </header>
  );
}
