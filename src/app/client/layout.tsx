import { BottomNav } from '@/components/client/BottomNav';
import { ClientHeader } from '@/components/client/ClientHeader';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ClientHeader />
      {/* pt-14 accounts for the fixed 56px header */}
      <main className="flex-1 pt-14 pb-20 overflow-y-auto">
        {children}
      </main>
      <BottomNav />
      <PWAInstallPrompt />
    </div>
  );
}
