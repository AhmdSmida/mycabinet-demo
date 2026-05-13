import { CabinetSidebar } from '@/components/cabinet/CabinetSidebar';
import { CabinetHeader } from '@/components/cabinet/CabinetHeader';

export default function CabinetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <CabinetSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <CabinetHeader />
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
