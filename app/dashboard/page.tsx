import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-[13px] text-muted-foreground">
          Visão geral do seu estoque e fluxo de caixa
        </p>
      </div>
      <DashboardContent />
    </div>
  );
}
