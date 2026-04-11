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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#e5e7eb] pb-safe">
      <div className="flex">
        {LINKS.map((link) => {
          const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`
                flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs transition-colors
                ${active ? 'text-[#00C471] font-semibold' : 'text-[#9ca3af]'}
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
