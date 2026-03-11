import { SidebarNav } from "@/components/layout/sidebar-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { OrgGuard } from "@/components/onboarding/org-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-background grid-cols-[auto_1fr]">
      <SidebarNav />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileNav />
        <DashboardHeader />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 overflow-auto">
          <div className="mx-auto w-full max-w-6xl">
            <OrgGuard>{children}</OrgGuard>
          </div>
        </main>
      </div>
    </div>
  );
}
