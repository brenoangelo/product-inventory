"use client";

import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  UserPlus,
  Trash2,
  Building2,
  Copy,
  Check,
  Crown,
  Zap,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { useOrganization } from "@/hooks/use-organization";
import { usePlanLimits } from "@/hooks/use-plan-limits";
import { OrganizationsService } from "@/lib/services/organizations";
import { PLANS } from "@/lib/plans";
import type {
  OrganizationMember,
  Invitation,
  MemberRole,
  OrgPlan,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const roleLabels: Record<MemberRole, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Membro",
};

const planIcons: Record<OrgPlan, typeof Crown> = {
  free: Zap,
  standard: Sparkles,
  enterprise: Crown,
};

const planColors: Record<OrgPlan, string> = {
  free: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  standard: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  enterprise: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

function UsageBar({ current, max }: { current: number; max: number | null }) {
  if (max === null) {
    return (
      <div className="h-2 w-full rounded-full bg-muted">
        <div className="h-full rounded-full bg-emerald-500 w-[5%]" />
      </div>
    );
  }
  const pct = Math.min((current / max) * 100, 100);
  const color =
    pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="h-2 w-full rounded-full bg-muted">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function SettingsContent() {
  const { organization, membership, isLoading: orgLoading, refresh } = useOrganization();
  const planState = usePlanLimits();
  const queryClient = useQueryClient();

  const [orgName, setOrgName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("member");
  const [inviting, setInviting] = useState(false);

  const [copied, setCopied] = useState<string | null>(null);

  const isOwner = membership?.role === "owner";
  const isAdmin = membership?.role === "admin" || isOwner;

  const loadMembers = useCallback(async () => {
    if (!organization) return;
    setLoadingMembers(true);
    try {
      const [m, i] = await Promise.all([
        OrganizationsService.listMembers(organization.id),
        isAdmin
          ? OrganizationsService.listInvitations(organization.id)
          : Promise.resolve([]),
      ]);
      setMembers(m);
      setInvitations(i);
    } catch {
      toast.error("Erro ao carregar membros.");
    } finally {
      setLoadingMembers(false);
    }
  }, [organization, isAdmin]);

  useEffect(() => {
    if (organization) {
      setOrgName(organization.name);
      loadMembers();
    }
  }, [organization, loadMembers]);

  async function handleSaveName() {
    if (!organization || !orgName.trim()) return;
    setSavingName(true);
    try {
      await OrganizationsService.update(organization.id, {
        name: orgName.trim(),
      });
      toast.success("Nome da organização atualizado!");
      refresh();
    } catch {
      toast.error("Erro ao atualizar nome.");
    } finally {
      setSavingName(false);
    }
  }

  async function handleInvite() {
    if (!organization || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      await OrganizationsService.invite(
        organization.id,
        inviteEmail.trim().toLowerCase(),
        inviteRole
      );
      toast.success("Convite enviado com sucesso!");
      setInviteEmail("");
      setInviteRole("member");
      setInviteDialogOpen(false);
      loadMembers();
      queryClient.invalidateQueries({ queryKey: ["plan-usage"] });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao enviar convite."
      );
    } finally {
      setInviting(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm("Tem certeza que deseja remover este membro?")) return;
    try {
      await OrganizationsService.removeMember(memberId);
      toast.success("Membro removido.");
      loadMembers();
      queryClient.invalidateQueries({ queryKey: ["plan-usage"] });
    } catch {
      toast.error("Erro ao remover membro.");
    }
  }

  async function handleCancelInvitation(invitationId: string) {
    try {
      await OrganizationsService.cancelInvitation(invitationId);
      toast.success("Convite cancelado.");
      loadMembers();
      queryClient.invalidateQueries({ queryKey: ["plan-usage"] });
    } catch {
      toast.error("Erro ao cancelar convite.");
    }
  }

  function handleCopyInviteLink(token: string) {
    const link = `${window.location.origin}/register?invite=${token}`;
    navigator.clipboard.writeText(link);
    setCopied(token);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(null), 2000);
  }

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-[13px] text-destructive font-medium">
          Nenhuma organização encontrada.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-[13px] text-muted-foreground">
          Gerencie sua organização e membros
        </p>
      </div>

      {/* Organization Info */}
      <div className="rounded-xl border border-border/60 bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Organização</h2>
        </div>

        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="orgName" className="text-[13px]">
              Nome da Organização
            </Label>
            <Input
              id="orgName"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              disabled={!isOwner}
              className="max-w-sm"
            />
          </div>
          {isOwner && (
            <Button
              size="sm"
              onClick={handleSaveName}
              disabled={
                savingName || orgName.trim() === organization.name
              }
            >
              {savingName && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              Salvar
            </Button>
          )}
        </div>
      </div>

      {/* Plan & Usage */}
      {(() => {
        const currentPlan = organization.plan ?? "free";
        const PlanIcon = planIcons[currentPlan];
        const planInfo = PLANS[currentPlan];

        return (
          <div className="rounded-xl border border-border/60 bg-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${planColors[currentPlan]}`}>
                  <PlanIcon className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">Plano {planInfo.label}</h2>
                  <p className="text-[11px] text-muted-foreground">{planInfo.description}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs font-medium">
                {planInfo.price}
              </Badge>
            </div>

            {/* Usage bars */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">Produtos</span>
                  <span className="font-medium tabular-nums">{planState.productsLabel}</span>
                </div>
                <UsageBar current={planState.usage.products} max={planState.limits.maxProducts} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">Transações/mês</span>
                  <span className="font-medium tabular-nums">{planState.transactionsLabel}</span>
                </div>
                <UsageBar current={planState.usage.transactionsThisMonth} max={planState.limits.maxTransactionsPerMonth} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">Membros</span>
                  <span className="font-medium tabular-nums">{planState.membersLabel}</span>
                </div>
                <UsageBar current={planState.usage.members} max={planState.limits.maxMembers} />
              </div>
            </div>

            {/* Feature list */}
            <div className="flex flex-wrap gap-2">
              {planInfo.features.map((f) => (
                <Badge key={f} variant="secondary" className="text-[11px] font-normal">
                  {f}
                </Badge>
              ))}
            </div>

            {/* Plan comparison cards */}
            {currentPlan !== "enterprise" && isOwner && (
              <div>
                <p className="text-[12px] text-muted-foreground mb-3">Conheça os planos disponíveis:</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(Object.values(PLANS) as typeof PLANS[OrgPlan][]).map((p) => {
                    const Icon = planIcons[p.key];
                    const isCurrent = p.key === currentPlan;
                    return (
                      <div
                        key={p.key}
                        className={`rounded-lg border p-4 space-y-2 ${
                          isCurrent
                            ? "border-primary/40 bg-primary/5"
                            : "border-border/40"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-[13px] font-semibold">{p.label}</span>
                        </div>
                        <p className="text-lg font-bold">{p.price}</p>
                        <ul className="space-y-1">
                          {p.features.map((f) => (
                            <li key={f} className="text-[11px] text-muted-foreground flex items-start gap-1">
                              <Check className="h-3 w-3 shrink-0 text-emerald-500 mt-0.5" />
                              {f}
                            </li>
                          ))}
                        </ul>
                        {isCurrent ? (
                          <Badge variant="outline" className="text-[11px] w-full justify-center mt-1">
                            Plano atual
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant={p.key === "enterprise" ? "default" : "outline"}
                            className="w-full text-[12px] mt-1"
                            onClick={() =>
                              toast.info("Entre em contato para alterar seu plano.")
                            }
                          >
                            {p.key === "enterprise" ? "Falar com vendas" : "Fazer upgrade"}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Members */}
      <div className="rounded-xl border border-border/60 bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Membros ({planState.membersLabel})</h2>
          {isAdmin && (
            <Button
              size="sm"
              onClick={() => setInviteDialogOpen(true)}
              disabled={!planState.canInviteMember}
            >
              <UserPlus className="mr-1.5 h-4 w-4" />
              Convidar
            </Button>
          )}
        </div>

        {!planState.canInviteMember && isAdmin && (
          <div className="rounded-lg border border-amber-300/60 bg-amber-50 dark:border-amber-700/40 dark:bg-amber-950/30 p-3 text-[12px] text-amber-800 dark:text-amber-200">
            Limite de membros atingido. Faça upgrade para convidar mais membros.
          </div>
        )}

        {loadingMembers ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-lg border border-border/40 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[13px]">Usuário</TableHead>
                  <TableHead className="text-[13px]">Cargo</TableHead>
                  {isOwner && (
                    <TableHead className="text-[13px] text-right">
                      Ações
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="text-[13px]">
                      {member.user_id}
                      {member.user_id === membership?.user_id && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          (você)
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          member.role === "owner"
                            ? "default"
                            : member.role === "admin"
                              ? "secondary"
                              : "outline"
                        }
                        className="text-xs"
                      >
                        {roleLabels[member.role as MemberRole]}
                      </Badge>
                    </TableCell>
                    {isOwner && (
                      <TableCell className="text-right">
                        {member.role !== "owner" && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Pending Invitations */}
      {isAdmin && invitations.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card p-6 space-y-4">
          <h2 className="text-sm font-semibold">Convites Pendentes</h2>
          <div className="rounded-lg border border-border/40 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[13px]">Email</TableHead>
                  <TableHead className="text-[13px]">Cargo</TableHead>
                  <TableHead className="text-[13px]">Expira em</TableHead>
                  <TableHead className="text-[13px] text-right">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="text-[13px]">{inv.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {roleLabels[inv.role as MemberRole]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[13px] text-muted-foreground">
                      {new Date(inv.expires_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleCopyInviteLink(inv.token)}
                          title="Copiar link de convite"
                        >
                          {copied === inv.token ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleCancelInvitation(inv.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Convidar Membro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="inviteEmail" className="text-[13px]">
                Email
              </Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="email@exemplo.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Cargo</Label>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as MemberRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Membro</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInviteDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
              >
                {inviting && (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                )}
                Enviar Convite
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
