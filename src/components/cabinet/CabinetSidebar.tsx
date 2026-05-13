'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  Calendar,
  Settings,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Tableau de bord', href: '/cabinet/dashboard', icon: LayoutDashboard },
  { label: 'Clients', href: '/cabinet/clients', icon: Users },
  { label: 'Documents', href: '/cabinet/documents', icon: FileText },
  { label: 'Calendrier', href: '/cabinet/calendar', icon: Calendar },
  { label: 'Paramètres', href: '/cabinet/settings', icon: Settings },
];

export function CabinetSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 min-h-screen bg-white border-r border-gray-200 flex flex-col shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-gray-200">
        <div className="w-8 h-8 rounded-lg bg-blue-800 flex items-center justify-center">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <span className="text-base font-bold text-slate-900 tracking-tight">
          MyCabinet
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-800 text-white'
                  : 'text-gray-600 hover:bg-blue-50 hover:text-blue-800'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={isActive ? 2.5 : 1.8} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-200">
        <p className="text-[10px] text-gray-400 text-center">MyCabinet v1.0</p>
      </div>
    </aside>
  );
}
