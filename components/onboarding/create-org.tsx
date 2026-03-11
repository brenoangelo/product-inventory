"use client";

import { useState } from "react";
import { Building2, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/use-organization";
import { OrganizationsService } from "@/lib/services/organizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateOrg() {
  const { refresh } = useOrganization();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Digite o nome da organização.");
      return;
    }
    setLoading(true);
    try {
      await OrganizationsService.create(name.trim());
      toast.success("Organização criada com sucesso!");
      await refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao criar organização."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            Crie sua organização
          </h1>
          <p className="text-[13px] text-muted-foreground max-w-xs mx-auto">
            Para começar a usar o StockFlow, dê um nome à sua organização.
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="org-name" className="text-[13px]">
              Nome da Organização
            </Label>
            <Input
              id="org-name"
              placeholder="Ex: Minha Loja"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
          </div>
          <Button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="w-full"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="mr-2 h-4 w-4" />
            )}
            Criar e começar
          </Button>
        </div>
      </div>
    </div>
  );
}
