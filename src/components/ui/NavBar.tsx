'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: '지도', icon: '🗺️' },
  { href: '/community', label: '커뮤니티', icon: '💬' },
  { href: '/report', label: '제보', icon: '✏️' },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/55 bg-white/78 backdrop-blur-xl shadow-[0_-8px_24px_rgba(15,23,42,0.08)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex px-2 py-2">
        {LINKS.map((link) => {
          const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`
                flex min-h-[48px] flex-1 select-none flex-col items-center justify-center gap-0.5 rounded-full py-2.5 text-sm font-medium transition-transform active:scale-[0.98]
                ${active ? 'bg-[#111827] text-white shadow-[0_8px_20px_rgba(17,24,39,0.18)]' : 'text-[#6b7280]'}
              `}
            >
              <span className="text-lg leading-none">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
