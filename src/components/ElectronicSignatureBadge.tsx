import React from 'react';
import { AppUser, ElectronicSignature, UserRole } from '../types';
import { getRoleDisplayTitle } from '../utils/departments';

interface RecordedSignatureProps {
  signature?: ElectronicSignature;
  legacySignature?: string;
  legacyReviewedAt?: string;
  stageTitle: string;
  accent?: 'emerald' | 'teal' | 'blue' | 'amber';
  compact?: boolean;
}

const ACCENT_STYLES: Record<NonNullable<RecordedSignatureProps['accent']>, string> = {
  emerald: 'bg-emerald-50/80 border-emerald-200 text-emerald-950',
  teal: 'bg-zinc-50 border-zinc-300 text-[#111318]',
  blue: 'bg-red-50/60 border-red-200 text-[#111318]',
  amber: 'bg-amber-50/80 border-amber-200 text-amber-950',
};

/**
 * Displays a recorded signature beneath an approval stage box using the signer's name only.
 */
export const ElectronicSignatureBadge: React.FC<RecordedSignatureProps> = ({
  signature,
  legacySignature,
  legacyReviewedAt,
  stageTitle,
  accent = 'emerald',
  compact = false,
}) => {
  const hasVerified = Boolean(signature && signature.fullName);
  const hasLegacy = Boolean(!hasVerified && legacySignature && legacyReviewedAt);

  if (!hasVerified && !hasLegacy) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white/80 px-3 py-2 text-xs text-zinc-400">
        {compact ? `${stageTitle}: بانتظار التوقيع` : 'بانتظار التوقيع'}
      </div>
    );
  }

  const signerName = signature?.fullName || legacySignature || '';

  if (compact) {
    return (
      <div className={`rounded-xl border px-3 py-2.5 text-xs ${ACCENT_STYLES[accent]}`}>
        <div className="text-[10px] opacity-75 font-semibold truncate mb-0.5">{stageTitle}</div>
        <div className="font-black text-[#111318] truncate">{signerName}</div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border px-3.5 py-2.5 text-xs ${ACCENT_STYLES[accent]}`}>
      <div className="font-black text-[#111318]">{signerName}</div>
    </div>
  );
};

interface PendingAutoSignatureProps {
  appUser: AppUser | null;
  activeRole: UserRole;
  stageLabel: string;
  compactPreview?: boolean;
}

/**
 * Read-only preview displaying only the authenticated user's name
 * that will automatically sign the form upon submission.
 */
export const PendingAutoSignatureBox: React.FC<PendingAutoSignatureProps> = ({
  appUser,
  activeRole,
  stageLabel,
}) => {
  const verifiedName = appUser?.fullName || appUser?.displayName || getRoleDisplayTitle(activeRole);

  return (
    <div className="bg-red-50/60 p-3 rounded-xl border border-red-200/80 space-y-1.5 text-xs">
      <div className="font-bold text-[#111318]">
        التوقيع ({stageLabel}):
      </div>
      <div className="bg-white px-3 py-2 rounded-lg border border-red-100">
        <div className="font-black text-[#111318]">{verifiedName}</div>
      </div>
    </div>
  );
};
