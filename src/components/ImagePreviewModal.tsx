import React, { useEffect, useState } from 'react';
import { X, ExternalLink, User, Briefcase, Building2, Calendar, ImageOff } from 'lucide-react';
import { JobApplication } from '../types';

interface ImagePreviewModalProps {
  isOpen: boolean;
  applicant: JobApplication | null;
  photoUrl: string | null;
  onClose: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  applicant,
  photoUrl,
  onClose,
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [photoUrl, applicant?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !applicant || !photoUrl) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-5 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-soft-lg border-t sm:border border-zinc-800/30 overflow-hidden w-full max-w-lg sm:max-w-xl max-h-[94dvh] sm:max-h-[92vh] flex flex-col text-right animate-slide-up-mobile sm:animate-modal-enter pb-safe sm:pb-0"
      >
        {/* Mobile Pull Handle */}
        <div className="pt-2 pb-1 flex justify-center sm:hidden bg-[#111318]">
          <div className="w-12 h-1.5 rounded-full bg-white/30" />
        </div>

        {/* Header Strip */}
        <div className="bg-[#111318] text-white p-4 sm:p-5 flex items-center justify-between border-b-2 border-[#DC2626] shrink-0 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#DC2626] flex items-center justify-center text-white font-bold shrink-0 shadow-sm shadow-red-600/25">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-sm sm:text-base text-white truncate">{applicant.fullName}</h3>
                <span className="text-[11px] font-mono font-bold bg-white/10 border border-white/20 px-2 py-0.5 rounded text-white shrink-0">
                  {applicant.recordNumber}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-zinc-300 mt-0.5 flex-wrap">
                <span className="flex items-center gap-1 font-semibold text-red-300 truncate">
                  <Briefcase className="w-3 h-3 shrink-0" />
                  <span className="truncate">{applicant.positionApplied}</span>
                </span>
                {applicant.assignedDepartment && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-zinc-300 shrink-0">
                      <Building2 className="w-3 h-3 shrink-0" />
                      <span>إدارة {applicant.assignedDepartment}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors cursor-pointer shrink-0"
            title="إغلاق المعاينة"
            aria-label="إغلاق المعاينة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Preview Body */}
        <div className="p-4 sm:p-6 bg-zinc-950 flex items-center justify-center overflow-hidden flex-1 min-h-[260px] max-h-[65dvh] sm:max-h-[68vh]">
          {!imgError ? (
            <img
              src={photoUrl}
              alt={applicant.fullName}
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="max-h-[58dvh] sm:max-h-[62vh] max-w-full w-auto object-contain rounded-2xl shadow-xl border border-zinc-800 transition-transform duration-200"
            />
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center space-y-3 max-w-xs w-full">
              <div className="w-14 h-14 rounded-2xl bg-zinc-800 text-zinc-300 flex items-center justify-center mx-auto">
                <ImageOff className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-white">تعذر تحميل معاينة الصورة مباشرة</p>
                <p className="text-[11px] text-zinc-400">يمكنك فتح الرابط الأصلي في نافذة جديدة للعرض.</p>
              </div>
              <a
                href={photoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>فتح الرابط الأصلي</span>
              </a>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-3.5 sm:p-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between gap-2 shrink-0 flex-wrap">
          <div className="text-[11px] text-zinc-500 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <span>تاريخ التسجيل: {applicant.timestamp}</span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={photoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 min-h-[40px] rounded-xl bg-zinc-200 hover:bg-zinc-300 text-zinc-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="فتح الرابط الأصلي للصورة في نافذة جديدة"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>فتح الرابط الأصلي</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 min-h-[40px] rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
