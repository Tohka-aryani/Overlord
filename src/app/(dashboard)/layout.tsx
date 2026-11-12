import { OpsRail } from "@/components/nav/OpsRail";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 bg-[var(--bg)] text-[var(--text)]">
      <OpsRail />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
