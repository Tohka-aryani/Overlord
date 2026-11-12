import { TopNav } from "@/components/nav/TopNav";
import { SiteFooter } from "@/components/nav/SiteFooter";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--bg)] text-[var(--text)]">
      <TopNav />
      <div className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col">
        {children}
      </div>
      <SiteFooter />
    </div>
  );
}
