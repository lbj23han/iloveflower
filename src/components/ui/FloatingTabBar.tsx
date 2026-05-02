'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TAB_LINKS = [
  { href: '/', label: '맵' },
  { href: '/community', label: '커뮤니티' },
];

interface Props {
  className?: string;
}

export default function FloatingTabBar({ className = '' }: Props) {
  const pathname = usePathname();

  return (
    <nav
      className={`fixed left-1/2 z-50 -translate-x-1/2 ${className}`}
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
    >
      <div className="flex items-center gap-1 rounded-full border border-white/55 bg-white/78 p-1.5 shadow-[0_14px_36px_rgba(15,23,42,0.16)] backdrop-blur-xl">
        {TAB_LINKS.map((tab) => {
          const active = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href));

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-h-[48px] min-w-[112px] select-none items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-transform active:scale-[0.98] ${
                active
                  ? 'bg-[#111827] text-white shadow-[0_8px_20px_rgba(17,24,39,0.22)]'
                  : 'text-[#4b5563]'
              }`}
            >
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
