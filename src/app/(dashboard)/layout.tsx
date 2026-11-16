import { TopNav } from "@/components/nav/TopNav";
import { SiteFooter } from "@/components/nav/SiteFooter";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <TopNav />
      {/* Full-bleed scroll host — scrollbar rides the viewport edge, not an inset column */}
      <div className="ol-scroll-host flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        {children}
      </div>
      <SiteFooter />
    </div>
  );
}
