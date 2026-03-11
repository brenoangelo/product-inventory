"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Package,
  BarChart3,
  Users,
  ShieldCheck,
  ArrowRight,
  Check,
  Menu,
  X,
  Zap,
  Sparkles,
  Crown,
  TrendingUp,
  Box,
  ArrowLeftRight,
} from "lucide-react";
import { PLANS } from "@/lib/plans";
import type { OrgPlan } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const planIcons: Record<OrgPlan, typeof Crown> = {
  free: Zap,
  standard: Sparkles,
  enterprise: Crown,
};

const planBorders: Record<OrgPlan, string> = {
  free: "border-border/60",
  standard: "border-blue-500/50 ring-1 ring-blue-500/20",
  enterprise: "border-amber-500/50",
};

const features = [
  {
    icon: Box,
    title: "Gestão de Produtos",
    description:
      "Cadastre, edite e controle todo seu catálogo de produtos com preços de custo, venda e validade.",
  },
  {
    icon: ArrowLeftRight,
    title: "Controle de Transações",
    description:
      "Registre vendas, reposições e custos extras. O estoque é atualizado automaticamente.",
  },
  {
    icon: BarChart3,
    title: "Dashboard Financeiro",
    description:
      "Visualize vendas, custos e lucro líquido em tempo real com gráficos e cards resumidos.",
  },
  {
    icon: Users,
    title: "Multi-Usuário",
    description:
      "Convide membros para sua organização com diferentes permissões: proprietário, admin ou membro.",
  },
  {
    icon: TrendingUp,
    title: "Margem & Lucro",
    description:
      "Acompanhe a margem de cada produto e o lucro líquido do negócio de forma clara.",
  },
  {
    icon: ShieldCheck,
    title: "Dados Isolados",
    description:
      "Cada organização tem seus dados completamente separados. Segurança e privacidade garantidas.",
  },
];

const steps = [
  {
    number: "01",
    title: "Crie sua conta",
    description: "Cadastre-se gratuitamente em segundos e dê um nome à sua organização.",
  },
  {
    number: "02",
    title: "Cadastre seus produtos",
    description: "Adicione seu catálogo com preços de custo, venda e estoque inicial.",
  },
  {
    number: "03",
    title: "Registre transações",
    description: "Vendas, reposições e custos extras — tudo refletido automaticamente no estoque.",
  },
  {
    number: "04",
    title: "Acompanhe os resultados",
    description: "Veja o panorama financeiro no dashboard e tome decisões informadas.",
  },
];

export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 10);
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ─── Header ─── */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-200 ${
          scrolled
            ? "bg-background/80 backdrop-blur-lg border-b border-border/40 shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Package className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-bold tracking-tight">StockFlow</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-[13px]">
            <a href="#funcionalidades" className="text-muted-foreground hover:text-foreground transition-colors">
              Funcionalidades
            </a>
            <a href="#como-funciona" className="text-muted-foreground hover:text-foreground transition-colors">
              Como funciona
            </a>
            <a href="#planos" className="text-muted-foreground hover:text-foreground transition-colors">
              Planos
            </a>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="text-[13px]">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild size="sm" className="text-[13px]">
              <Link href="/register">
                Criar conta grátis
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-1.5"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-lg px-4 pb-4 pt-2 space-y-3">
            <a
              href="#funcionalidades"
              className="block text-[13px] text-muted-foreground py-1.5"
              onClick={() => setMobileMenuOpen(false)}
            >
              Funcionalidades
            </a>
            <a
              href="#como-funciona"
              className="block text-[13px] text-muted-foreground py-1.5"
              onClick={() => setMobileMenuOpen(false)}
            >
              Como funciona
            </a>
            <a
              href="#planos"
              className="block text-[13px] text-muted-foreground py-1.5"
              onClick={() => setMobileMenuOpen(false)}
            >
              Planos
            </a>
            <div className="flex gap-2 pt-2">
              <Button asChild variant="outline" size="sm" className="flex-1 text-[13px]">
                <Link href="/login">Entrar</Link>
              </Button>
              <Button asChild size="sm" className="flex-1 text-[13px]">
                <Link href="/register">Criar conta</Link>
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* ─── Hero ─── */}
      <section className="relative pt-28 pb-20 sm:pt-36 sm:pb-28 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center">
          <Badge variant="secondary" className="mb-4 text-[11px] font-medium px-3 py-1">
            Novo: Planos multi-usuário disponíveis
          </Badge>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] max-w-3xl mx-auto">
            Gestão de estoque e{" "}
            <span className="text-primary">fluxo de caixa</span>{" "}
            simplificada
          </h1>

          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Controle produtos, vendas, custos e lucro em um só lugar.
            Para pequenos negócios que querem crescer com organização.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="text-sm px-6 w-full sm:w-auto">
              <Link href="/register">
                Começar gratuitamente
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-sm px-6 w-full sm:w-auto">
              <a href="#funcionalidades">Ver funcionalidades</a>
            </Button>
          </div>

          <p className="mt-4 text-[12px] text-muted-foreground">
            Sem cartão de crédito. Plano gratuito para sempre.
          </p>
        </div>

        {/* Mock dashboard preview */}
        <div className="mx-auto mt-14 max-w-4xl px-4 sm:px-6">
          <div className="rounded-xl border border-border/60 bg-card shadow-2xl shadow-black/5 overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border/40 bg-muted/30">
              <div className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
              <span className="ml-2 text-[11px] text-muted-foreground">StockFlow — Dashboard</span>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              {/* Mock summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Vendas", value: "R$ 24.500", color: "text-emerald-600" },
                  { label: "Custos", value: "R$ 12.300", color: "text-amber-600" },
                  { label: "Lucro", value: "R$ 8.200", color: "text-blue-600" },
                  { label: "Produtos", value: "48", color: "text-violet-600" },
                ].map((card) => (
                  <div key={card.label} className="rounded-lg border border-border/40 bg-background p-3">
                    <p className="text-[11px] text-muted-foreground">{card.label}</p>
                    <p className={`text-lg font-bold tabular-nums ${card.color}`}>{card.value}</p>
                  </div>
                ))}
              </div>
              {/* Mock chart bars */}
              <div className="rounded-lg border border-border/40 bg-background p-4">
                <div className="flex items-end justify-between gap-1 h-24">
                  {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t bg-primary/20"
                      style={{ height: `${h}%` }}
                    >
                      <div
                        className="w-full rounded-t bg-primary/60"
                        style={{ height: `${Math.max(30, h - 20)}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="funcionalidades" className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-14">
            <Badge variant="secondary" className="mb-3 text-[11px] font-medium px-3 py-1">
              Funcionalidades
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Tudo que você precisa para gerenciar seu negócio
            </h2>
            <p className="mt-3 text-muted-foreground text-sm max-w-lg mx-auto">
              Do cadastro de produtos ao acompanhamento financeiro, tudo integrado em uma plataforma simples e poderosa.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group rounded-xl border border-border/60 bg-card p-5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all duration-200"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-3 group-hover:bg-primary/15 transition-colors">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold mb-1">{feature.title}</h3>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section id="como-funciona" className="py-20 sm:py-28 bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-14">
            <Badge variant="secondary" className="mb-3 text-[11px] font-medium px-3 py-1">
              Como funciona
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Comece em minutos
            </h2>
            <p className="mt-3 text-muted-foreground text-sm max-w-lg mx-auto">
              Não precisa de instalação. Crie sua conta e comece a usar agora mesmo.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div key={step.number} className="relative">
                <div className="text-4xl font-black text-primary/10 mb-2">
                  {step.number}
                </div>
                <h3 className="text-sm font-semibold mb-1">{step.title}</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="planos" className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-14">
            <Badge variant="secondary" className="mb-3 text-[11px] font-medium px-3 py-1">
              Planos
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Escolha o plano ideal para o seu negócio
            </h2>
            <p className="mt-3 text-muted-foreground text-sm max-w-lg mx-auto">
              Comece grátis e escale conforme sua necessidade. Sem surpresas.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-3 max-w-4xl mx-auto">
            {(Object.values(PLANS)).map((plan) => {
              const Icon = planIcons[plan.key];
              const isPopular = plan.key === "standard";
              return (
                <div
                  key={plan.key}
                  className={`relative rounded-xl border bg-card p-6 flex flex-col ${planBorders[plan.key]} ${
                    isPopular ? "shadow-lg shadow-blue-500/10" : ""
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-blue-600 hover:bg-blue-600 text-white text-[10px] px-2.5 py-0.5">
                        Mais popular
                      </Badge>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{plan.label}</h3>
                      <p className="text-[11px] text-muted-foreground">{plan.description}</p>
                    </div>
                  </div>

                  <div className="mb-5">
                    <span className="text-3xl font-bold tracking-tight">
                      {plan.price.split("/")[0]}
                    </span>
                    {plan.price.includes("/") && (
                      <span className="text-sm text-muted-foreground">
                        /{plan.price.split("/")[1]}
                      </span>
                    )}
                  </div>

                  <ul className="space-y-2.5 mb-6 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-[13px]">
                        <Check className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild
                    variant={isPopular ? "default" : "outline"}
                    className="w-full text-[13px]"
                  >
                    <Link href="/register">
                      {plan.key === "free"
                        ? "Começar grátis"
                        : plan.key === "enterprise"
                          ? "Falar com vendas"
                          : "Assinar agora"}
                      <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 sm:py-28 bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-8 sm:p-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Pronto para organizar seu negócio?
            </h2>
            <p className="mt-3 text-muted-foreground text-sm max-w-md mx-auto">
              Junte-se a centenas de empresas que já usam o StockFlow para
              controlar estoque e finanças.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" className="text-sm px-6 w-full sm:w-auto">
                <Link href="/register">
                  Criar conta gratuitamente
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="text-sm px-6 w-full sm:w-auto">
                <Link href="/login">Já tenho uma conta</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/40 py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
                <Package className="h-3 w-3 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold">StockFlow</span>
            </div>
            <div className="flex items-center gap-6 text-[12px] text-muted-foreground">
              <a href="#funcionalidades" className="hover:text-foreground transition-colors">
                Funcionalidades
              </a>
              <a href="#planos" className="hover:text-foreground transition-colors">
                Planos
              </a>
              <Link href="/login" className="hover:text-foreground transition-colors">
                Login
              </Link>
            </div>
            <p className="text-[11px] text-muted-foreground">
              &copy; {new Date().getFullYear()} StockFlow. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
