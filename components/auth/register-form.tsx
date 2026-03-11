"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { registerSchema, type RegisterFormData } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(data: RegisterFormData) {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            organization_name: data.organizationName,
          },
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (authData.session) {
        // Auto-confirmed → create org via SECURITY DEFINER function (bypasses RLS)
        const orgName = data.organizationName || data.email.split("@")[0] || "Minha Organização";
        const { error: rpcErr } = await supabase.rpc("create_org_for_user", {
          org_name: orgName,
        });

        if (rpcErr) {
          console.error("create_org_for_user failed", rpcErr);
        }

        toast.success("Conta criada com sucesso!");
        router.push("/dashboard");
      } else {
        // Email confirmation required → callback will handle org creation
        toast.success("Conta criada! Verifique seu email para confirmar.");
        router.push("/login");
      }
    } catch {
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="organizationName" className="text-[13px]">Nome da Organização</Label>
          <Input
            id="organizationName"
            placeholder="Ex: Minha Loja"
            {...register("organizationName")}
          />
          {errors.organizationName && (
            <p className="text-xs text-destructive">{errors.organizationName.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-[13px]">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-[13px]">Senha</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-[13px]">Confirmar Senha</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Criar Conta
        </Button>
        <p className="text-center text-[13px] text-muted-foreground">
          Já tem conta?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Fazer login
          </Link>
        </p>
      </form>
    </div>
  );
}
