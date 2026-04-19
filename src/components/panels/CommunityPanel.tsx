'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Post,
  POST_CATEGORIES,
  POST_CATEGORY_LABELS,
  PostCategory,
} from '@/types';
import { getOrCreateSession, getDeviceId } from '@/lib/session';

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function CommunityPanel() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<PostCategory>('chat');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_TOSS_BUILD === 'true') {
      import('@/lib/clientApi').then(({ getPostsClient }) => getPostsClient()).then((data) => { setPosts(data as Post[]); setLoading(false); });
    } else {
      fetch('/api/posts').then((r) => r.json()).then((data) => { setPosts(data); setLoading(false); });
    }
  }, []);

  const submit = async () => {
    if (!title.trim() || !content.trim() || submitting) return;
    setSubmitting(true);
    const { sessionId, nickname } = getOrCreateSession();
    const deviceId = await getDeviceId();
    if (process.env.NEXT_PUBLIC_TOSS_BUILD === 'true') {
      const { createPostClient } = await import('@/lib/clientApi');
      const { data, error } = await createPostClient({ title: title.trim(), content: content.trim(), category, anon_session_id: sessionId, device_id: deviceId, nickname });
      if (data) { setPosts((p) => [data as Post, ...p]); setTitle(''); setContent(''); setCategory('chat'); setShowForm(false); }
      else alert(error);
    } else {
      const res = await fetch('/api/posts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), category, anon_session_id: sessionId, device_id: deviceId, nickname }),
      });
      if (res.ok) {
        const post = await res.json();
        setPosts((p) => [post, ...p]);
        setTitle(''); setContent(''); setCategory('chat'); setShowForm(false);
      } else { const { error } = await res.json(); alert(error); }
    }
    setSubmitting(false);
  };

  return (
    <>
      {/* 헤더 */}
      <div className="flex h-12 items-center justify-between border-b border-[#e5e7eb] px-4 shrink-0">
        <span className="font-bold text-[15px] text-[#111827]">커뮤니티</span>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex h-11 w-11 select-none items-center justify-center rounded-full bg-[#111827] text-lg leading-none text-white transition-transform active:scale-[0.98]"
        >
          ✏️
        </button>
      </div>

      {/* 글쓰기 폼 */}
      {showForm && (
        <div className="space-y-3 border-b border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 shrink-0">
          <div className="flex flex-wrap gap-2">
            {POST_CATEGORIES.map((item) => (
              <button
                key={item}
                onClick={() => setCategory(item)}
                className={`min-h-[40px] select-none rounded-full border px-4 py-2 text-sm font-medium ${
                  category === item
                    ? 'border-[#111827] bg-[#111827] text-white'
                    : 'border-[#d1d5db] bg-white text-[#6b7280]'
                }`}
              >
                {POST_CATEGORY_LABELS[item]}
              </button>
            ))}
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 80))}
            placeholder="제목"
            className="min-h-[48px] w-full rounded-2xl border border-[#e5e7eb] px-4 py-3 text-base focus:outline-none focus:border-[#111827]"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 500))}
            placeholder="내용 (익명)"
            rows={3}
            className="w-full resize-none rounded-2xl border border-[#e5e7eb] px-4 py-3 text-base leading-relaxed focus:outline-none focus:border-[#111827]"
          />
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#9ca3af]">{content.length}/500</span>
            <button
              onClick={submit}
              disabled={!title.trim() || !content.trim() || submitting}
              className="min-h-[52px] select-none rounded-full bg-[#111827] px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {submitting ? '등록 중...' : '등록'}
            </button>
          </div>
        </div>
      )}

      {/* 글 목록 */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#f3f4f6]">
        {loading ? (
          <div className="py-10 text-center text-sm text-[#9ca3af] animate-pulse">불러오는 중...</div>
        ) : posts.length === 0 ? (
          <div className="py-10 text-center text-sm leading-relaxed text-[#9ca3af]"><div className="mb-2 text-3xl">💬</div>아직 글이 없어요. 첫 글을 남겨보세요!</div>
        ) : (
          posts.map((post) => (
            <Link
              key={post.id}
              href={`/community/${post.id}`}
              className="flex select-none items-start justify-between gap-3 px-4 py-3 transition-transform active:scale-[0.99]"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#111827] truncate mb-0.5">{post.title}</div>
                <div className="text-sm text-[#9ca3af]">
                  {post.nickname} · 댓글 {post.comment_count ?? 0} · {timeAgo(post.created_at)}
                </div>
              </div>
              <span className="mt-0.5 shrink-0 rounded-full bg-[#f3f4f6] px-3 py-1 text-sm text-[#6b7280]">
                {POST_CATEGORY_LABELS[post.category]}
              </span>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
