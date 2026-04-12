'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { POST_CATEGORY_LABELS, PostCategory } from '@/types';

type AdminPost = {
  id: string;
  title: string;
  content: string;
  category: PostCategory;
  nickname: string;
  comment_count: number;
  created_at: string;
  moderation_status: string;
};

const ADMIN_SECRET_KEY = 'admin_secret_kkotmap';

const CATEGORY_OPTIONS: Array<{ label: string; value: string }> = [
  { label: '전체', value: 'all' },
  { label: '봄꽃', value: 'spring' },
  { label: '여름꽃', value: 'summer' },
  { label: '가을꽃', value: 'autumn' },
  { label: '겨울꽃', value: 'winter' },
  { label: '꽃놀이 팁', value: 'tips' },
  { label: '인생샷', value: 'photo' },
  { label: '인생카페', value: 'cafe' },
  { label: '자유', value: 'chat' },
];

export default function AdminPostsPage() {
  const router = useRouter();
  const [secret, setSecret] = useState('');
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(async (s: string, cat: string) => {
    setLoading(true);
    const params = new URLSearchParams({ secret: s });
    if (cat && cat !== 'all') params.set('category', cat);
    const res = await fetch(`/api/admin/posts?${params}`);
    if (res.status === 401) {
      localStorage.removeItem(ADMIN_SECRET_KEY);
      router.replace('/admin_HJ');
      return;
    }
    const json = await res.json();
    setPosts(json.posts ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const saved = localStorage.getItem(ADMIN_SECRET_KEY);
    if (!saved) { router.replace('/admin_HJ'); return; }
    setSecret(saved);
    load(saved, 'all');
  }, [load, router]);

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    load(secret, cat);
  };

  const deletePost = async (id: string) => {
    setDeleting(id);
    const res = await fetch(`/api/admin/posts/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-secret': secret },
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(json.error ?? '삭제에 실패했습니다.');
    } else {
      setPosts((prev) => prev.filter((p) => p.id !== id));
    }
    setDeleting(null);
    setConfirmDeleteId(null);
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] px-4 py-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#111827]">게시글 관리</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#9ca3af]">{posts.length}건</span>
            <Link href="/admin_HJ/reports" className="rounded-full border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs font-medium text-[#6b7280] hover:border-[#ff6b81]">
              제보 관리 →
            </Link>
            <button
              onClick={() => { localStorage.removeItem(ADMIN_SECRET_KEY); router.replace('/admin_HJ'); }}
              className="text-xs text-[#9ca3af] hover:text-red-400"
            >
              로그아웃
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleCategoryChange(opt.value)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                category === opt.value
                  ? 'bg-[#ff6b81] text-white'
                  : 'border border-[#e5e7eb] bg-white text-[#6b7280]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-[#9ca3af]">로딩 중...</div>
        ) : posts.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#9ca3af]">게시글이 없습니다.</div>
        ) : (
          <div className="space-y-3">
            {posts.map((p) => (
              <div key={p.id} className="rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2 flex-wrap">
                      <span className="inline-flex rounded-full bg-[#fff1f4] px-2 py-0.5 text-[11px] font-semibold text-[#c0394f]">
                        {POST_CATEGORY_LABELS[p.category] ?? p.category}
                      </span>
                      {p.moderation_status !== 'visible' && (
                        <span className="inline-flex rounded-full bg-[#fef3c7] px-2 py-0.5 text-[11px] font-semibold text-[#b45309]">
                          {p.moderation_status}
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-[#111827] truncate">{p.title}</div>
                    <p className="mt-1 line-clamp-2 text-sm text-[#6b7280]">{p.content}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-[#9ca3af]">
                      <span>{p.nickname}</span>
                      <span>댓글 {p.comment_count}</span>
                      <span>{new Date(p.created_at).toLocaleString('ko-KR')}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Link
                      href={`/community/${p.id}`}
                      target="_blank"
                      className="rounded-full border border-[#e5e7eb] bg-white px-3 py-1 text-xs text-[#6b7280] hover:border-[#ff6b81]"
                    >
                      보기
                    </Link>
                    {confirmDeleteId === p.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => deletePost(p.id)}
                          disabled={deleting === p.id}
                          className="rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          {deleting === p.id ? '삭제 중' : '확인'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-full border border-[#e5e7eb] bg-white px-3 py-1 text-xs text-[#9ca3af]"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(p.id)}
                        className="rounded-full border border-red-100 bg-white px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-50"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
