import React, { useState, useEffect } from 'react';
import { User, ZoomIn } from 'lucide-react';
import { JobApplication } from '../types';
import { formatGoogleDriveImageUrl } from '../utils/csvHandler';

/**
 * Extracts and formats the applicant's photo URL from any stored photo property.
 * Properly converts Google Drive links, Firebase Storage links, or direct image URLs.
 */
export function getApplicantPhoto(applicant: Partial<JobApplication>): string | undefined {
  if (!applicant) return undefined;
  const raw =
    applicant.personalPhotoUrl ||
    (applicant as any).photoUrl ||
    (applicant as any).photo ||
    (applicant as any).imageUrl ||
    (applicant as any).profileImageUrl ||
    (applicant as any).image;

  if (!raw || typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (
    !trimmed ||
    trimmed === '—' ||
    trimmed === '-' ||
    trimmed.toLowerCase() === 'undefined' ||
    trimmed.toLowerCase() === 'null'
  ) {
    return undefined;
  }
  return formatGoogleDriveImageUrl(trimmed);
}

interface ApplicantAvatarProps {
  applicant: JobApplication;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onPreview?: (applicant: JobApplication, photoUrl: string) => void;
  className?: string;
  showZoomBadge?: boolean;
}

export const ApplicantAvatar: React.FC<ApplicantAvatarProps> = ({
  applicant,
  size = 'md',
  onPreview,
  className = '',
  showZoomBadge = true,
}) => {
  const [imgError, setImgError] = useState(false);
  const photoUrl = getApplicantPhoto(applicant);

  // Reset error if applicant or photoUrl changes
  useEffect(() => {
    setImgError(false);
  }, [photoUrl, applicant?.id]);

  const sizeClasses = {
    sm: 'w-9 h-9 rounded-xl text-xs',
    md: 'w-11 h-11 sm:w-12 sm:h-12 rounded-2xl text-sm',
    lg: 'w-14 h-14 rounded-2xl text-base',
    xl: 'w-20 h-20 rounded-3xl text-xl',
  }[size];

  const initialChar = (applicant?.fullName || '').trim().charAt(0) || 'م';
  const hasPhoto = Boolean(photoUrl && !imgError);

  const handleClick = (e: React.MouseEvent) => {
    if (hasPhoto && onPreview && photoUrl) {
      e.stopPropagation();
      e.preventDefault();
      onPreview(applicant, photoUrl);
    }
  };

  if (hasPhoto && photoUrl) {
    return (
      <div
        onClick={handleClick}
        title={onPreview ? 'اضغط لتكبير ومعاينة صورة المتقدم' : applicant.fullName}
        className={`relative group shrink-0 overflow-hidden select-none ${sizeClasses} ${
          onPreview ? 'cursor-pointer' : ''
        } ${className}`}
      >
        <img
          src={photoUrl}
          alt={`صورة ${applicant.fullName}`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover object-center rounded-[inherit] border border-zinc-200 group-hover:border-[#DC2626] group-hover:scale-105 transition-all duration-200 bg-zinc-100 shadow-2xs"
        />

        {/* Hover zoom indicator overlay */}
        {onPreview && showZoomBadge && (
          <div className="absolute inset-0 bg-zinc-950/55 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-[inherit]">
            <ZoomIn className="w-3.5 h-3.5 text-white drop-shadow-md" />
          </div>
        )}
      </div>
    );
  }

  // Professional Default Avatar (Charcoal -> Crimson Red Monogram)
  return (
    <div
      title={`صورة افتراضية للمتقدم: ${applicant.fullName}`}
      className={`shrink-0 flex items-center justify-center font-black select-none bg-gradient-to-br from-[#111318] via-zinc-900 to-[#DC2626] text-white border border-zinc-200 shadow-xs ${sizeClasses} ${className}`}
    >
      <span className="leading-none">{initialChar}</span>
    </div>
  );
};
