'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const ADMIN_SECRET_KEY = 'admin_secret_kkotmap';

export default function AdminLoginPage() {
  const [secret, setSecret] = useState('');
  const [error, setError] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem(ADMIN_SECRET_KEY);
    if (saved) router.replace('/admin_HJ/reports');
  }, [router]);

  const handleLogin = async () => {
    const res = await fetch(`/api/admin/reports?status=pending&secret=${secret}`);
    if (res.status === 401) {
      setError(true);
      return;
    }
    localStorage.setItem(ADMIN_SECRET_KEY, secret);
    router.replace('/admin_HJ/reports');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f9fafb]">
      <div className="w-full max-w-sm rounded-2xl border border-[#e5e7eb] bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-lg font-bold text-[#111827]">관리자</h1>
        <input
          type="password"
          autoComplete="current-password"
          value={secret}
          onChange={(e) => { setSecret(e.target.value); setError(false); }}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          placeholder="비밀번호"
          className={`mb-3 w-full rounded-xl border px-4 py-3 text-sm focus:outline-none ${
            error ? 'border-red-400 focus:border-red-400' : 'border-[#e5e7eb] focus:border-[#ff6b81]'
          }`}
        />
        {error && <p className="mb-3 text-xs text-red-500">비밀번호가 틀렸습니다.</p>}
        <button
          onClick={handleLogin}
          className="w-full rounded-xl bg-[#111827] py-3 text-sm font-semibold text-white"
        >
          입장
        </button>
      </div>
    </div>
  );
}
