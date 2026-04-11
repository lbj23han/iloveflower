'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Comment, Post, POST_CATEGORY_LABELS, PostCategory } from '@/types';
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

const EDIT_GROUPS: Array<{ label: string; value: PostCategory }> = [
  { label: '벚꽃', value: 'cherry' },
  { label: '매화·봄꽃', value: 'plum' },
  { label: '진달래·철쭉', value: 'azalea' },
  { label: '유채꽃', value: 'rape' },
  { label: '코스모스', value: 'cosmos' },
  { label: '꽃놀이 팁', value: 'tips' },
  { label: '자유', value: 'chat' },
];

function normalizePostCategoryForEdit(category: PostCategory): PostCategory {
  return category;
}

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [nickname, setNicknameState] = useState('');
  const [postPassword, setPostPassword] = useState('');
  const [text, setText] = useState('');
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editing, setEditing] = useState(false);
  const [savingPost, setSavingPost] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<PostCategory>('chat');

  useEffect(() => {
    const session = getOrCreateSession();
    setNicknameState(session.nickname);
  }, []);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetch(`/api/posts/${id}`).then((r) => r.json()),
      fetch(`/api/comments?post_id=${id}`).then((r) => r.json()),
    ]).then(([p, c]) => {
      if (!active) return;
      setPost(p);
      setComments(c);
    });

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!post) return;
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditCategory(normalizePostCategoryForEdit(post.category));
  }, [post]);

  const submitComment = async () => {
    if (!text.trim() || !nickname.trim() || submittingComment) return;

    setSubmittingComment(true);
    const { sessionId } = getOrCreateSession();
    const savedNickname = setNickname(nickname);
    const deviceId = await getDeviceId();

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: id,
          parent_id: replyTarget?.id ?? null,
          content: text.trim(),
          anon_session_id: sessionId,
          device_id: deviceId,
          nickname: savedNickname,
        }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        alert(error || '댓글 등록 실패');
        return;
      }

      const comment = await res.json();
      setComments((prev) => [...prev, comment]);
      setText('');
      setReplyTarget(null);
    } finally {
      setSubmittingComment(false);
    }
  };

  const submitPostEdit = async () => {
    if (!post || !editTitle.trim() || !editContent.trim() || !nickname.trim() || !postPassword.trim() || savingPost) {
      return;
    }

    setSavingPost(true);
    const savedNickname = setNickname(nickname);

    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          content: editContent.trim(),
          category: editCategory,
          nickname: savedNickname,
          password: postPassword.trim(),
        }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        alert(error || '글 수정에 실패했습니다.');
        return;
      }

      const updated = await res.json();
      setPost(updated);
      setEditing(false);
    } finally {
      setSavingPost(false);
    }
  };

  const deletePost = async () => {
    if (!post || !postPassword.trim() || deletingPost) return;
    if (!window.confirm('정말 이 글을 삭제할까요? 댓글도 함께 삭제됩니다.')) return;

    setDeletingPost(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: postPassword.trim(),
        }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        alert(error || '글 삭제에 실패했습니다.');
        return;
      }

      window.location.href = '/community';
    } finally {
      setDeletingPost(false);
    }
  };

  if (!post) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[#9ca3af]">
        불러오는 중...
      </div>
    );
  }

  const topLevelComments = comments.filter((comment) => !comment.parent_id);
  const repliesByParent = comments.reduce<Record<string, Comment[]>>((acc, comment) => {
    if (!comment.parent_id) return acc;
    if (!acc[comment.parent_id]) acc[comment.parent_id] = [];
    acc[comment.parent_id].push(comment);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#edf3ff_0%,#f7fbff_34%,#ffffff_100%)] pb-8">
      <header className="sticky top-0 z-10 border-b border-[#e5e7eb] bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Link href="/community" className="text-[#6b7280]">← 커뮤니티</Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 pt-5">
        <main className="space-y-4">
          <div className="rounded-[28px] border border-[#ffd6dc]/60 bg-[#fffafb]/86 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="mb-3">
              <span className="inline-flex rounded-full bg-[#fff1f4] px-2.5 py-1 text-[11px] font-semibold text-[#c0394f]">
                {POST_CATEGORY_LABELS[post.category]}
              </span>
            </div>
            <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_120px]">
              <input
                type="password"
                value={postPassword}
                onChange={(e) => setPostPassword(e.target.value.slice(0, 20))}
                placeholder="글 비밀번호"
                className="w-full rounded-[18px] border border-[#ffd6dc] bg-white px-4 py-3 text-sm font-medium text-[#111827] focus:border-[#ff6b81] focus:outline-none"
              />
              <button
                onClick={() => setEditing((prev) => !prev)}
                className="rounded-[18px] border border-[#ffd6dc] bg-white px-4 py-3 text-sm font-semibold text-[#4b5563]"
              >
                {editing ? '수정 취소' : '글 수정'}
              </button>
              <button
                onClick={deletePost}
                disabled={!postPassword.trim() || deletingPost}
                className="rounded-[18px] bg-[#111827] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {deletingPost ? '삭제 중...' : '글 삭제'}
              </button>
            </div>
            <div className="mb-4 text-[11px] text-[#7b8aa0]">
              작성할 때 설정한 비밀번호로 글 수정과 삭제를 할 수 있어요.
            </div>

            {editing ? (
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_56px]">
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNicknameState(e.target.value.slice(0, 20))}
                    placeholder="닉네임"
                    className="w-full rounded-[18px] border border-[#ffd6dc] bg-white px-4 py-3 text-sm font-semibold text-[#111827] focus:border-[#ff6b81] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setNicknameState(refreshNickname())}
                    className="rounded-[18px] border border-[#ffd6dc] bg-white text-xl text-[#4b5563]"
                    aria-label="닉네임 다시 생성"
                  >
                    ⟳
                  </button>
                </div>

                <div className="scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  {EDIT_GROUPS.map((category) => (
                    <button
                      key={category.label}
                      onClick={() => setEditCategory(category.value)}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                        editCategory === category.value
                          ? 'border-[#111827] bg-[#111827] text-white'
                          : 'border-[#ffd6dc] bg-[#fffafb]/84 text-[#4b5563]'
                      }`}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value.slice(0, 80))}
                  className="w-full rounded-[18px] border border-[#ffd6dc] bg-white px-4 py-3 text-sm font-semibold text-[#111827] focus:border-[#ff6b81] focus:outline-none"
                />

                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value.slice(0, 500))}
                  rows={8}
                  className="w-full rounded-[22px] border border-[#ffd6dc] bg-white px-4 py-3 text-sm text-[#374151] focus:border-[#ff6b81] focus:outline-none"
                />

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setEditing(false)}
                    className="rounded-full border border-[#ffd6dc] bg-white px-4 py-2 text-sm font-medium text-[#4b5563]"
                  >
                    취소
                  </button>
                  <button
                    onClick={submitPostEdit}
                    disabled={savingPost || !editTitle.trim() || !editContent.trim() || !nickname.trim()}
                    className="rounded-full bg-[#111827] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {savingPost ? '저장 중...' : '수정 저장'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-base font-bold text-[#111827]">{post.title}</h1>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#374151]">{post.content}</p>
                {post.image_urls && post.image_urls.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {post.image_urls.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={url}
                          alt=""
                          className="aspect-square w-full rounded-[16px] object-cover shadow-sm"
                        />
                      </a>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex items-center gap-2 text-xs text-[#9ca3af]">
                  <span>{post.nickname}</span>
                  <span>·</span>
                  <span>{timeAgo(post.created_at)}</span>
                </div>
              </>
            )}
          </div>

          <div className="rounded-[28px] border border-[#ffd6dc]/60 bg-[#fffafb]/86 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="text-lg font-bold text-[#111827]">댓글 쓰기</div>
            <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_120px]">
              <div className="grid gap-3">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_56px]">
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNicknameState(e.target.value.slice(0, 20))}
                    placeholder="닉네임"
                    className="w-full rounded-[18px] border border-[#ffd6dc] bg-white px-4 py-3 text-sm font-semibold text-[#111827] focus:border-[#ff6b81] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setNicknameState(refreshNickname())}
                    className="rounded-[18px] border border-[#ffd6dc] bg-white text-xl text-[#4b5563]"
                    aria-label="닉네임 다시 생성"
                  >
                    ⟳
                  </button>
                </div>

                {replyTarget && (
                  <div className="rounded-[16px] bg-[#eff6ff] px-4 py-2 text-xs text-[#52607a]">
                    {replyTarget.nickname}님에게 답글 작성 중
                    <button
                      onClick={() => setReplyTarget(null)}
                      className="ml-2 font-semibold text-[#111827]"
                    >
                      취소
                    </button>
                  </div>
                )}

                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, 200))}
                  placeholder="댓글을 입력해 주세요."
                  rows={3}
                  className="w-full rounded-[22px] border border-[#ffd6dc] bg-white px-4 py-3 text-sm text-[#374151] focus:border-[#ff6b81] focus:outline-none"
                />
              </div>

              <button
                onClick={submitComment}
                disabled={!text.trim() || !nickname.trim() || submittingComment}
                className="min-h-[84px] rounded-[28px] bg-[#1f2a3d] px-6 py-4 text-lg font-bold text-white disabled:opacity-50"
              >
                {submittingComment ? '등록 중' : '등록'}
              </button>
            </div>
          </div>

          <div className="rounded-[28px] border border-[#ffd6dc]/60 bg-[#fffafb]/86 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="border-b border-[#f3f4f6] px-5 py-4">
              <span className="text-sm font-semibold text-[#374151]">댓글 {comments.length}</span>
            </div>

            <div className="space-y-4 px-4 py-4">
              {topLevelComments.length === 0 ? (
                <div className="px-5 py-6 text-center text-sm text-[#9ca3af]">첫 댓글을 남겨보세요!</div>
              ) : (
                topLevelComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-[24px] border border-[#dde5ee] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eff6ff] text-sm font-bold text-[#1f2a3d]">
                          {comment.nickname.slice(0, 1)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-[#111827]">{comment.nickname}</div>
                          <div className="text-xs text-[#94a3b8]">{timeAgo(comment.created_at)}</div>
                        </div>
                      </div>
                      <button className="rounded-full bg-[#eef2f7] px-3 py-1 text-xs font-medium text-[#52607a]">
                        ...
                      </button>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#374151]">{comment.content}</p>

                    <div className="mt-3">
                      <button
                        onClick={() => setReplyTarget(comment)}
                        className="rounded-full border border-[#ffd6dc] bg-white px-3 py-1.5 text-xs font-semibold text-[#52607a]"
                      >
                        답글 달기
                      </button>
                    </div>

                    {repliesByParent[comment.id]?.length ? (
                      <div className="mt-4 space-y-3 border-l border-[#ffd6dc] pl-4">
                        {repliesByParent[comment.id].map((reply) => (
                          <div
                            key={reply.id}
                            className="rounded-[20px] border border-[#e7edf4] bg-[#f8fbff] p-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff5e8] text-xs font-bold text-[#9a5b16]">
                                  {reply.nickname.slice(0, 1)}
                                </div>
                                <span className="text-sm font-semibold text-[#111827]">{reply.nickname}</span>
                              </div>
                              <span className="text-xs text-[#94a3b8]">{timeAgo(reply.created_at)}</span>
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#374151]">{reply.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
