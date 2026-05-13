'use client';

import { useState } from 'react';
import { Building2, LogOut, User } from 'lucide-react';
import { NotificationBell } from '@/components/client/NotificationBell';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function ClientHeader() {
  const { profile, signOut } = useAuth();
  // Placeholder unread count — will be wired to real data in a later phase
  const [unreadCount] = useState(0);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-sm"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center justify-between h-14 px-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-800 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold text-slate-900 tracking-tight">
            MyCabinet
          </span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          {/* Notification bell */}
          <NotificationBell />

          {/* Avatar dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center hover:bg-blue-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-800 focus:ring-offset-1">
                {getInitials(profile?.full_name)}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {profile?.full_name ?? 'Mon compte'}
                </p>
                <p className="text-xs text-slate-500 truncate">{profile?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/client/profile" className="flex items-center gap-2 cursor-pointer">
                  <User className="w-4 h-4" />
                  Mon profil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={signOut}
                className="flex items-center gap-2 text-red-600 focus:text-red-600 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
