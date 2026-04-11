import Link from 'next/link';

const LAST_UPDATED = '2026년 4월 9일';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ffe4e6_0%,#fff1f4_38%,#ffffff_100%)]">
      <div className="mx-auto max-w-3xl px-4 py-6 pb-20">
        <div className="rounded-[30px] border border-white/60 bg-white/84 p-5 shadow-[0_18px_44px_rgba(15,23,42,0.10)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-[#111827]">개인정보처리방침</h1>
              <p className="mt-2 text-sm leading-6 text-[#4b5563]">
                꽃놀이맵은 지도 탐색, 후기 작성, 커뮤니티 글쓰기, 시설 제보 기능을 제공하는 과정에서
                필요한 최소한의 정보만 처리하려고 노력합니다.
              </p>
              <p className="mt-2 text-xs text-[#9ca3af]">최종 업데이트: {LAST_UPDATED}</p>
            </div>
            <Link
              href="/"
              className="shrink-0 rounded-full border border-[#dbe4df] bg-white/90 px-4 py-2 text-sm font-medium text-[#374151]"
            >
              지도로 돌아가기
            </Link>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <section className="rounded-[28px] border border-white/60 bg-white/84 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <h2 className="text-base font-semibold text-[#111827]">1. 수집하는 정보</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#4b5563]">
              <li>익명 세션 식별자(`anon_session_id`)</li>
              <li>자동 생성 닉네임</li>
              <li>브라우저 정보 기반 기기 식별 해시(`device_hash`)</li>
              <li>중복 제출 및 오남용 방지를 위한 IP 기반 해시(`ip_hash`)</li>
              <li>이용자가 직접 작성한 글, 댓글, 후기, 제보 내용</li>
            </ul>
          </section>

          <section className="rounded-[28px] border border-white/60 bg-white/84 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <h2 className="text-base font-semibold text-[#111827]">2. 처리 목적</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#4b5563]">
              <li>시설 정보, 후기, 커뮤니티 글, 댓글, 제보 기능 제공</li>
              <li>중복 제출 방지와 악성 이용 대응</li>
              <li>서비스 품질 개선과 운영 통계 확인</li>
            </ul>
          </section>

          <section className="rounded-[28px] border border-white/60 bg-white/84 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <h2 className="text-base font-semibold text-[#111827]">3. 보관 방식과 기간</h2>
            <div className="mt-3 space-y-3 text-sm leading-6 text-[#4b5563]">
              <p>
                익명 세션 식별자와 자동 생성 닉네임은 이용자 브라우저의 로컬 저장소에 보관되며,
                이용자가 직접 브라우저 데이터를 삭제할 때까지 남을 수 있습니다.
              </p>
              <p>
                작성된 글, 댓글, 후기, 제보와 중복 방지용 해시 정보는 서비스 운영과 오남용 대응에
                필요한 범위에서 보관될 수 있으며, 관련 법령상 보관 의무가 없고 운영상 더 이상
                필요하지 않게 되면 정리 또는 삭제될 수 있습니다.
              </p>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/60 bg-white/84 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <h2 className="text-base font-semibold text-[#111827]">4. 제3자 제공 및 외부 서비스</h2>
            <div className="mt-3 space-y-3 text-sm leading-6 text-[#4b5563]">
              <p>
                꽃놀이맵은 이용자가 작성한 내용을 정기적으로 외부에 판매하거나 제공하지 않습니다.
                다만 서비스 운영을 위해 클라우드 데이터베이스와 지도 SDK 등 외부 인프라를 사용할 수 있습니다.
              </p>
              <p>현재 주요 운영 인프라는 Supabase와 Kakao Maps SDK입니다.</p>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/60 bg-white/84 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <h2 className="text-base font-semibold text-[#111827]">5. 이용자 안내</h2>
            <div className="mt-3 space-y-3 text-sm leading-6 text-[#4b5563]">
              <p>
                본 서비스는 회원가입 없이 익명 참여를 지원하지만, 동일 기기나 동일 네트워크에서의
                반복 제출을 줄이기 위해 최소한의 식별 정보를 사용합니다.
              </p>
              <p>
                브라우저 저장소를 지우면 익명 닉네임과 세션 식별자는 초기화될 수 있습니다. 베타 운영 중인
                문서이므로 수집 항목이나 운영 방식이 바뀌면 이 페이지도 함께 업데이트됩니다.
              </p>
            </div>
          </section>

          <section className="rounded-[28px] border border-[#d8ebe1] bg-[#f5fbf7] p-5 text-sm leading-6 text-[#4b5563] shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
            <p>
              이 페이지는 현재 서비스 코드 기준으로 정리한 기본 안내입니다. 실제 운영 환경에서는
              개인정보 처리 흐름, 로그 보관 정책, 문의 채널, 수탁사 현황을 한 번 더 점검해 정식 문서로
              보완하는 것을 권장합니다.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
