'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, Calendar, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { label: 'Accueil', href: '/client/dashboard', icon: Home },
  { label: 'Documents', href: '/client/documents', icon: FileText },
  { label: 'Calendrier', href: '/client/calendar', icon: Calendar },
  { label: 'Assistant', href: '/client/assistant', icon: MessageSquare },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch h-16">
        {tabs.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors',
                isActive ? 'text-blue-800' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.8} />
              <span className={cn('text-[10px] font-medium', isActive ? 'text-blue-800' : 'text-gray-400')}>
                {label}
              </span>
              {isActive && (
                <span className="absolute top-1.5 w-1 h-1 rounded-full bg-blue-800" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
