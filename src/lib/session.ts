import { v4 as uuidv4 } from 'uuid';

const SESSION_KEY = 'anon_session_id';
const NICKNAME_KEY = 'anon_nickname';

const ADJECTIVES = [
  '꽃향기나는', '봄바람같은', '화사한', '수줍은', '설레는',
  '반짝이는', '포근한', '싱그러운', '산뜻한', '은은한',
  '벚꽃같은', '햇살좋은', '달콤한', '잔잔한', '나른한',
];

const NOUNS = [
  '벚꽃', '매화', '진달래', '개나리', '튤립',
  '유채꽃', '해바라기', '장미', '나비', '봄비',
  '꽃잎', '라벤더', '들꽃', '산책길', '꽃구름',
];

function generateNickname(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 900) + 100;
  return `${adj}${noun}${num}`;
}

function sanitizeNickname(nickname: string): string {
  return nickname.replace(/\s+/g, ' ').trim().slice(0, 20);
}

export function getOrCreateSession(): { sessionId: string; nickname: string } {
  if (typeof window === 'undefined') {
    return { sessionId: '', nickname: '' };
  }

  let sessionId = localStorage.getItem(SESSION_KEY);
  let nickname = localStorage.getItem(NICKNAME_KEY);

  if (!sessionId) {
    sessionId = uuidv4();
    localStorage.setItem(SESSION_KEY, sessionId);
  }

  if (!nickname) {
    nickname = generateNickname();
    localStorage.setItem(NICKNAME_KEY, nickname);
  }

  return { sessionId, nickname };
}

export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(SESSION_KEY) || '';
}

export function getNickname(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(NICKNAME_KEY) || '';
}

export function setNickname(nickname: string): string {
  if (typeof window === 'undefined') return '';
  const nextNickname = sanitizeNickname(nickname);
  if (!nextNickname) return getNickname();
  localStorage.setItem(NICKNAME_KEY, nextNickname);
  return nextNickname;
}

export function refreshNickname(): string {
  if (typeof window === 'undefined') return '';
  const nextNickname = generateNickname();
  localStorage.setItem(NICKNAME_KEY, nextNickname);
  return nextNickname;
}

/** Fingerprint: combines several browser signals into a stable hash */
export async function getDeviceId(): Promise<string> {
  if (typeof window === 'undefined') return '';

  const cached = sessionStorage.getItem('device_id');
  if (cached) return cached;

  const raw = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
  ].join('|');

  const msgBuffer = new TextEncoder().encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const deviceId = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);

  sessionStorage.setItem('device_id', deviceId);
  return deviceId;
}
