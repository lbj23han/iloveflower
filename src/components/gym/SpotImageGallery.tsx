'use client';

import { useState } from 'react';

interface Props {
  coverImage: string | null;
  representativeImages: string[];
  spotName: string;
}

export default function SpotImageGallery({ coverImage, representativeImages, spotName }: Props) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  return (
    <>
      {coverImage && (
        <div
          className="overflow-hidden rounded-2xl border border-[#ffd6dc] bg-white cursor-pointer"
          onClick={() => setLightboxUrl(coverImage)}
        >
          <img
            src={coverImage}
            alt={`${spotName} 대표 이미지`}
            className="w-full max-h-72 object-contain bg-[#f9f9f9]"
          />
        </div>
      )}

      {representativeImages.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {representativeImages.map((url, i) => (
            <button
              key={url}
              onClick={() => setLightboxUrl(url)}
              className="shrink-0 focus:outline-none"
            >
              <img
                src={url}
                alt={`${spotName} 사진 ${i + 1}`}
                className="h-44 w-44 rounded-2xl object-cover shadow-sm"
              />
            </button>
          ))}
        </div>
      )}

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt="원본 이미지"
            className="max-h-full max-w-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
