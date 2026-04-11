'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Post, POST_CATEGORY_LABELS, PostCategory } from '@/types';
import FloatingTabBar from '@/components/ui/FloatingTabBar';
import BrandLockup from '@/components/ui/BrandLockup';
import {
  getOrCreateSession,
  getDeviceId,
  refreshNickname,
  setNickname,
} from '@/lib/session';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

type CommunityTab =
  | 'all'
  | 'cherry'
  | 'plum'
  | 'azalea'
  | 'rape'
  | 'cosmos'
  | 'tips'
  | 'free';

const COMMUNITY_TABS: Array<{ value: CommunityTab; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'cherry', label: '벚꽃' },
  { value: 'plum', label: '매화·봄꽃' },
  { value: 'azalea', label: '진달래·철쭉' },
  { value: 'rape', label: '유채꽃' },
  { value: 'cosmos', label: '코스모스' },
  { value: 'tips', label: '꽃놀이 팁' },
  { value: 'free', label: '자유' },
];

const GROUP_TO_POST_CATEGORY: Record<Exclude<CommunityTab, 'all'>, PostCategory> = {
  cherry: 'cherry',
  plum: 'plum',
  azalea: 'azalea',
  rape: 'rape',
  cosmos: 'cosmos',
  tips: 'tips',
  free: 'chat',
};

function isCommunityTab(value: string | null): value is CommunityTab {
  return !!value && COMMUNITY_TABS.some((tab) => tab.value === value);
}


function CommunityPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [nickname, setNicknameState] = useState('');
  const [postPassword, setPostPassword] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [postCategory, setPostCategory] = useState<PostCategory>('chat');
  const [submitting, setSubmitting] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const selectedCategory: CommunityTab = isCommunityTab(searchParams.get('category'))
    ? (searchParams.get('category') as CommunityTab)
    : 'all';

  const isHotdeals = false;

  useEffect(() => {
    const session = getOrCreateSession();
    setNicknameState(session.nickname);
  }, []);

  useEffect(() => {
    if (selectedCategory !== 'all' && selectedCategory !== 'free') {
      setPostCategory(GROUP_TO_POST_CATEGORY[selectedCategory]);
    }
  }, [selectedCategory]);

  useEffect(() => {
    let active = true;

    const fetchContent = async () => {
      setLoading(true);
      const query =
        selectedCategory === 'all'
          ? ''
          : `?category=${encodeURIComponent(GROUP_TO_POST_CATEGORY[selectedCategory as Exclude<CommunityTab, 'all'>] ?? selectedCategory)}`;
      const res = await fetch(`/api/posts${query}`);
      if (!active) return;
      if (res.ok) setPosts(await res.json());
      setLoading(false);
    };

    fetchContent();
    return () => { active = false; };
  }, [selectedCategory, isHotdeals]);

  const handleTabChange = (category: CommunityTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (category === 'all') {
      params.delete('category');
    } else {
      params.set('category', category);
    }
    router.replace(
      params.toString() ? `/community?${params.toString()}` : '/community',
      { scroll: false }
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || imageUrls.length >= 4) return;
    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const { url } = await res.json();
        setImageUrls((prev) => [...prev, url]);
      } else {
        const { error } = await res.json();
        alert(error || '업로드 실패');
      }
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const submit = async () => {
    if (!title.trim() || !content.trim() || !nickname.trim() || !postPassword.trim() || submitting) return;

    setSubmitting(true);
    const { sessionId } = getOrCreateSession();
    const savedNickname = setNickname(nickname);
    const deviceId = await getDeviceId();

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          category: postCategory,
          password: postPassword.trim(),
          anon_session_id: sessionId,
          device_id: deviceId,
          nickname: savedNickname,
          image_urls: imageUrls,
        }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        alert(error || '제출에 실패했습니다.');
        return;
      }

      const post: Post = await res.json();
      if (selectedCategory === 'all' || POST_CATEGORY_LABELS[post.category] === POST_CATEGORY_LABELS[postCategory]) {
        setPosts((prev) => [post, ...prev]);
      }
      setTitle('');
      setContent('');
      setPostPassword('');
      setImageUrls([]);
      setShowForm(false);
      setPostCategory(selectedCategory === 'all' || selectedCategory === 'free' ? 'chat' : GROUP_TO_POST_CATEGORY[selectedCategory]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ffe4e6_0%,#fff1f4_38%,#f8fafc_100%)] pb-28">
      <header className="sticky top-0 z-10 px-3 pt-3 md:px-4 md:pt-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between rounded-[28px] border border-[#ffd6dc]/55 bg-[#fffafb]/82 px-4 py-3 shadow-[0_16px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <BrandLockup
            title="커뮤니티"
            subtitle="꽃놀이 이야기와 명소 팁을 나눠보세요"
            iconSize={56}
            iconWidth={40}
            iconHeight={56}
            titleClassName="font-bold text-[#111827]"
            subtitleClassName="text-xs text-[#6b7280]"
          />
          {!isHotdeals && (
            <button
              onClick={() => setShowForm((prev) => !prev)}
              className="rounded-full bg-[#111827] px-4 py-2 text-xs font-semibold text-white shadow-sm"
            >
              {showForm ? '취소' : '글쓰기'}
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl space-y-3 px-4 py-4">
        <div className="scrollbar-hide -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
          {COMMUNITY_TABS.map((tab) => {
            const active = selectedCategory === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => handleTabChange(tab.value)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                  active
                    ? 'border-[#111827] bg-[#111827] text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]'
                    : tab.value === 'free'
                      ? 'border-[#f59e0b]/40 bg-[#fffbeb] text-[#b45309] hover:border-[#f59e0b]'
                      : 'border-[#ffd6dc]/55 bg-[#fffafb]/76 text-[#4b5563] hover:border-[#ffd6dc]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {!isHotdeals && showForm && (
          <div className="space-y-3 rounded-[28px] border border-[#ffd6dc]/55 bg-[#fffafb]/84 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.10)] backdrop-blur-xl">
            <div className="rounded-[24px] border border-[#dbe8f2] bg-[#eff5fb] p-4">
              <div className="text-2xl font-extrabold tracking-tight text-[#111827]">새 글 쓰기</div>
              <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_56px]">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNicknameState(e.target.value.slice(0, 20))}
                  placeholder="닉네임"
                  className="w-full rounded-[18px] border border-[#dbe4df] bg-white px-4 py-3 text-sm font-semibold text-[#111827] focus:border-[#ff6b81] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setNicknameState(refreshNickname())}
                  className="rounded-[18px] border border-[#dbe4df] bg-white text-xl text-[#4b5563]"
                  aria-label="닉네임 다시 생성"
                >
                  ⟳
                </button>
              </div>
              <div className="mt-3">
                <input
                  type="password"
                  value={postPassword}
                  onChange={(e) => setPostPassword(e.target.value.slice(0, 20))}
                  placeholder="글 비밀번호 (수정/삭제 시 필요)"
                  className="w-full rounded-[18px] border border-[#dbe4df] bg-white px-4 py-3 text-sm font-medium text-[#111827] focus:border-[#ff6b81] focus:outline-none"
                />
                <div className="mt-1 text-[11px] text-[#7b8aa0]">
                  비밀번호는 4자 이상 20자 이하로 입력해주세요.
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#4b5563]">카테고리</div>
              <div className="scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {COMMUNITY_TABS.filter((tab) => tab.value !== 'all' && tab.value !== 'free').map((tab) => {
                  const rawCategory = GROUP_TO_POST_CATEGORY[tab.value as Exclude<CommunityTab, 'all' | 'free'>];
                  const active = postCategory === rawCategory;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setPostCategory(rawCategory)}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                        active
                          ? 'border-[#ff6b81] bg-[#ff6b81] text-white'
                          : 'border-[#dbe4df] bg-[#fffafb]/84 text-[#4b5563]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 80))}
              placeholder="제목을 입력해주세요"
              className="w-full rounded-[18px] border border-[#dbe4df] bg-white px-4 py-3 text-sm font-semibold text-[#111827] focus:border-[#ff6b81] focus:outline-none"
            />

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 500))}
              placeholder="내용을 입력해주세요"
              rows={6}
              className="w-full resize-none rounded-[22px] border border-[#dbe4df] bg-white px-4 py-3 text-sm text-[#374151] focus:border-[#ff6b81] focus:outline-none"
            />

            {/* 이미지 업로드 */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-[#4b5563]">사진 ({imageUrls.length}/4)</span>
                {imageUrls.length < 4 && (
                  <label className={`cursor-pointer rounded-full border border-[#ffd6dc] bg-white px-3 py-1.5 text-xs font-semibold text-[#c0394f] ${uploadingImage ? 'opacity-50' : ''}`}>
                    {uploadingImage ? '업로드 중...' : '+ 사진 추가'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                  </label>
                )}
              </div>
              {imageUrls.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {imageUrls.map((url, i) => (
                    <div key={url} className="relative shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-20 w-20 rounded-[14px] object-cover" />
                      <button
                        type="button"
                        onClick={() => setImageUrls((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#111827] text-[10px] text-white"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={submit}
              disabled={!title.trim() || !content.trim() || !nickname.trim() || !postPassword.trim() || submitting}
              className="w-full rounded-[20px] bg-[#1f2a3d] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {submitting ? '등록 중...' : '글 등록'}
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-10 text-center text-sm text-[#9ca3af]">불러오는 중...</div>
        ) : posts.length === 0 ? (
          <div className="rounded-[28px] border border-[#ffd6dc]/55 bg-[#fffafb]/84 px-6 py-10 text-center text-sm text-[#9ca3af] shadow-[0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            아직 글이 없어요. 첫 글을 남겨보세요!
          </div>
        ) : (
          posts.map((post) => (
            <Link
              key={post.id}
              href={`/community/${post.id}`}
              className="block rounded-[28px] border border-[#ffd6dc]/55 bg-[#fffafb]/84 p-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-[#ffd6dc]"
            >
              <div className="mb-2">
                <span className="inline-flex rounded-full bg-[#fff1f4] px-2.5 py-1 text-[11px] font-semibold text-[#c0394f]">
                  {POST_CATEGORY_LABELS[post.category]}
                </span>
              </div>
              <h2 className="mb-1.5 line-clamp-2 text-sm font-medium leading-snug text-[#111827]">
                {post.title}
              </h2>
              {post.image_urls?.length > 0 ? (
                <div className="mb-2 flex gap-1.5 overflow-hidden">
                  {post.image_urls.slice(0, 3).map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={url} src={url} alt="" className="h-16 w-16 shrink-0 rounded-[10px] object-cover" />
                  ))}
                  {post.image_urls.length > 3 && (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[10px] bg-[#f3f4f6] text-xs font-semibold text-[#6b7280]">
                      +{post.image_urls.length - 3}
                    </div>
                  )}
                </div>
              ) : (
                <p className="mb-3 line-clamp-2 text-xs text-[#6b7280]">{post.content}</p>
              )}
              <div className="flex items-center gap-2 text-xs text-[#9ca3af]">
                <span>{post.nickname}</span>
                <span>·</span>
                <span>{timeAgo(post.created_at)}</span>
                {(post.comment_count ?? 0) > 0 && (
                  <>
                    <span>·</span>
                    <span>댓글 {post.comment_count}</span>
                  </>
                )}
              </div>
            </Link>
          ))
        )}
      </div>

      <FloatingTabBar />
    </div>
  );
}

export default function CommunityPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ffe4e6_0%,#fff1f4_38%,#f8fafc_100%)]">
          <div className="flex min-h-screen items-center justify-center text-sm text-[#9ca3af]">
            불러오는 중...
          </div>
        </div>
      }
    >
      <CommunityPageContent />
    </Suspense>
  );
}
