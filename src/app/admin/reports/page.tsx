'use client';

import { useEffect, useState, useCallback } from 'react';
import { BLOOM_STATUS_LABELS } from '@/types';

type Report = {
  id: string;
  spot_id: string | null;
  spot_name: string;
  flower_type: string | null;
  bloom_status: string | null;
  entry_fee: number | null;
  has_night_light: boolean | null;
  has_parking: boolean | null;
  pet_friendly: boolean | null;
  comment: string | null;
  nickname: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  flower_spots: { name: string; address: string | null } | null;
};

export default function AdminReportsPage() {
  const [secret, setSecret] = useState('');
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);

  const load = useCallback(async (s: string, status: string) => {
    setLoading(true);
    const res = await fetch(`/api/admin/reports?status=${status}&secret=${s}`);
    if (res.status === 401) { setAuthed(false); setLoading(false); return; }
    const json = await res.json();
    setReports(json.reports ?? []);
    setLoading(false);
  }, []);

  const handleLogin = () => { setAuthed(true); load(secret, tab); };

  useEffect(() => { if (authed) load(secret, tab); }, [tab, authed, secret, load]);

  const act = async (id: string, action: 'approve' | 'reject') => {
    setActioning(id);
    await fetch(`/api/admin/reports/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
      body: JSON.stringify({ action }),
    });
    setReports((prev) => prev.filter((r) => r.id !== id));
    setActioning(null);
  };

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9fafb]">
        <div className="w-full max-w-sm rounded-2xl border border-[#e5e7eb] bg-white p-8 shadow-sm">
          <h1 className="mb-6 text-lg font-bold text-[#111827]">관리자 로그인</h1>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="관리자 비밀번호"
            className="mb-4 w-full rounded-xl border border-[#e5e7eb] px-4 py-3 text-sm focus:border-[#ff6b81] focus:outline-none"
          />
          <button onClick={handleLogin} className="w-full rounded-xl bg-[#ff6b81] py-3 text-sm font-semibold text-white">
            입장
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] px-4 py-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#111827]">제보 관리</h1>
          <span className="text-xs text-[#9ca3af]">{reports.length}건</span>
        </div>

        <div className="mb-4 flex gap-2">
          {(['pending', 'approved', 'rejected'] as const).map((s) => (
            <button key={s} onClick={() => setTab(s)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${tab === s ? 'bg-[#ff6b81] text-white' : 'bg-white text-[#6b7280] border border-[#e5e7eb]'}`}>
              {s === 'pending' ? '대기중' : s === 'approved' ? '승인됨' : '반려됨'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-[#9ca3af]">로딩 중...</div>
        ) : reports.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#9ca3af]">해당 항목이 없습니다.</div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[#111827]">{r.spot_name}</div>
                    {r.flower_spots && (
                      <div className="text-xs text-[#6b7280]">DB 매칭: {r.flower_spots.name} — {r.flower_spots.address}</div>
                    )}
                    {!r.spot_id && <div className="mt-0.5 text-xs text-[#f59e0b]">⚠ spot_id 없음 (신규 장소 제보)</div>}
                  </div>
                  {r.flower_type && (
                    <span className="shrink-0 rounded-full bg-[#fff1f4] px-2 py-0.5 text-xs text-[#ff4d6d]">{r.flower_type}</span>
                  )}
                </div>

                {r.bloom_status && (
                  <div className="mb-3">
                    <span className="rounded-full bg-[#ecfbf3] px-2.5 py-1 text-xs font-medium text-[#00935d]">
                      개화: {BLOOM_STATUS_LABELS[r.bloom_status as keyof typeof BLOOM_STATUS_LABELS] ?? r.bloom_status}
                    </span>
                  </div>
                )}

                <div className="mb-3 flex flex-wrap gap-2 text-xs text-[#6b7280]">
                  {r.entry_fee != null && <span>입장료: {r.entry_fee === 0 ? '무료' : `${r.entry_fee.toLocaleString()}원`}</span>}
                  {r.has_night_light && <span>야간조명 있음</span>}
                  {r.has_parking && <span>주차 가능</span>}
                  {r.pet_friendly && <span>반려동물 동반 가능</span>}
                </div>

                {r.comment && (
                  <div className="mb-3 rounded-xl bg-[#f9fafb] px-3 py-2.5 text-sm text-[#374151]">
                    &ldquo;{r.comment}&rdquo;
                  </div>
                )}

                <div className="mb-4 flex items-center gap-3 text-xs text-[#9ca3af]">
                  <span>{r.nickname}</span>
                  <span>{new Date(r.created_at).toLocaleString('ko-KR')}</span>
                </div>

                {tab === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => act(r.id, 'approve')} disabled={actioning === r.id}
                      className="flex-1 rounded-xl bg-[#ff6b81] py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                      {actioning === r.id ? '처리 중...' : '✓ 승인'}
                    </button>
                    <button onClick={() => act(r.id, 'reject')} disabled={actioning === r.id}
                      className="flex-1 rounded-xl border border-[#e5e7eb] bg-white py-2.5 text-sm font-medium text-[#6b7280] disabled:opacity-50">
                      ✕ 반려
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
