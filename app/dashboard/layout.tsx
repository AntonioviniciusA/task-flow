import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardNav } from "@/components/dashboard-nav";
import { Toaster } from "@/components/ui/sonner";
import { OfflineIndicator } from "@/components/offline-indicator";
import { WorkerTrigger } from "@/components/worker-trigger";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav user={session.user} />
      <main className="container mx-auto px-4 py-6 max-w-4xl">{children}</main>
      <Toaster position="top-center" richColors />
      <OfflineIndicator />
      <WorkerTrigger />
    </div>
  );
}
