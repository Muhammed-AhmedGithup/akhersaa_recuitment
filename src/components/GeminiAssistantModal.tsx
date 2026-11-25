import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  X,
  Sparkles,
  Maximize2,
  Minimize2,
  Trash2,
  RefreshCw,
  Lightbulb,
  User,
  AlertCircle,
} from 'lucide-react';
import { JobApplication, UserRole } from '../types';
import { getAuthHeaders } from '../services/apiService';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface GeminiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicants: JobApplication[];
  userRole: UserRole;
  selectedApplicant?: JobApplication | null;
}

const GLOBAL_SUGGESTED_QUESTIONS = [
  'من هم المرشحون الأكثر خبرة في وظيفة الشيف والكابتن صالة؟',
  'ما هو متوسط الرواتب المقترحة للوظائف الشاغرة الحالية؟',
  'لخّص لي الطلبات التي ما زالت بانتظار قرار المدير العام.',
  'اقترح معايير قبول واختبار كابتن صالة أو ويتر.',
  'ما هي أبرز نقاط المخاطر الواجب الحذر منها في المقابلات؟'
];

export const GeminiAssistantModal: React.FC<GeminiAssistantModalProps> = ({
  isOpen,
  onClose,
  applicants,
  userRole,
  selectedApplicant
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `أهلاً بك يا فندم! أنا **المساعد الذكي لإدارة التوظيف** بشركة **آخر ساعة إسبشيال** 🌟\n\nأنا مدعوم بنموذج **Gemini** ومطلع على كافة بيانات المتقدمين المسجلة في النظام وقرارات اللجان الإدارية.\n\nكيف يمكنني مساعدتك اليوم؟ يمكنك اختيار أحد المقترحات السريعة أو كتابة استفسارك مباشرة.`,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  // When a candidate is selected, add contextual greeting if not already present
  useEffect(() => {
    if (isOpen && selectedApplicant) {
      const candidateTag = `candidate-${selectedApplicant.id}`;
      setMessages((prev) => {
        if (prev.some((m) => m.id === candidateTag)) return prev;
        return [
          ...prev,
          {
            id: candidateTag,
            role: 'assistant',
            content: `لقد حددت ملف المرشح **${selectedApplicant.fullName}** (${selectedApplicant.positionApplied} - خبرة ${selectedApplicant.experienceYears} سنوات).\n\nيمكنك الآن الضغط على زر **"⚡ تحليل شامل للمرشح"** أدناه أو الاستفسار عن راتبه المقترح ونقاط قوته.`,
            timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
          }
        ];
      });
    }
  }, [isOpen, selectedApplicant]);

  if (!isOpen) return null;

  const candidateQuestions = selectedApplicant
    ? [
        `⚡ تحليل شامل للمرشح (${selectedApplicant.fullName})`,
        `💰 الراتب المقترح لوظيفة (${selectedApplicant.positionApplied})`,
        `❓ أسئلة المقابلة الشخصية المقترحة`,
        `⚖️ نقاط القوة والمخاطر للمرشح`
      ]
    : GLOBAL_SUGGESTED_QUESTIONS;

  const handleSend = async (customText?: string) => {
    const textToSend = (customText || input).trim();
    if (!textToSend || isLoading) return;

    setErrorMsg(null);
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Create concise context about relevant applicants
      const applicantsContext = applicants.slice(0, 30).map((a) => ({
        fullName: a.fullName,
        position: a.positionApplied,
        experienceYears: a.experienceYears,
        qualification: a.qualification,
        smoking: a.smoking,
        prevCompany: a.prevCompany,
        prevPosition: a.prevPosition,
        prevSalary: a.prevSalary,
        status: a.status,
        hrResult: a.hrReview?.result,
        dmResult: a.directManagerReview?.result,
        gmResult: a.generalManagerReview?.result,
        finalSalary: a.generalManagerReview?.finalApprovedSalary,
        hrNotes: a.hrReview?.notice,
        gmNotes: a.generalManagerReview?.notice,
      }));

      const activeApplicantContext = selectedApplicant
        ? {
            fullName: selectedApplicant.fullName,
            position: selectedApplicant.positionApplied,
            experienceYears: selectedApplicant.experienceYears,
            qualification: selectedApplicant.qualification,
            smoking: selectedApplicant.smoking,
            prevCompany: selectedApplicant.prevCompany,
            prevPosition: selectedApplicant.prevPosition,
            prevSalary: selectedApplicant.prevSalary,
            notes: selectedApplicant.hrReview?.notice || selectedApplicant.generalManagerReview?.notice,
          }
        : null;

      const authHeaders = await getAuthHeaders(userRole || 'admin');

      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          userRole,
          applicantsContext: {
            totalCount: applicants.length,
            selectedApplicant: activeApplicantContext,
            sampleApplicants: applicantsContext
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `خطأ في الاتصال بالسيرفر (${response.status})`);
      }

      const data = await response.json();
      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'تم استلام الاستفسار بنجاح.',
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setErrorMsg(err?.message || 'تعذر التواصل مع المساعد الذكي. اضغط إعادة المحاولة أدناه.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const [confirmClear, setConfirmClear] = useState(false);

  const handleClearHistory = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    setConfirmClear(false);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: 'تم تجديد جلسة الحوار بنجاح. كيف أستطيع خدمتك الآن؟',
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Simple Markdown Styler for Arabic responses
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed font-sans">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('### ')) {
            return (
              <h4 key={idx} className="font-black text-[#111318] text-sm sm:text-base mt-2.5 mb-1 pb-1 border-b border-zinc-200 flex items-center gap-1.5">
                <span>{trimmed.replace('### ', '')}</span>
              </h4>
            );
          }
          if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
            return (
              <p key={idx} className="font-black text-[#111318] mt-2">
                {trimmed.replace(/\*\*/g, '')}
              </p>
            );
          }
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            return (
              <div key={idx} className="flex items-start gap-1.5 mr-2">
                <span className="text-[#DC2626] font-bold">•</span>
                <span className="flex-1">{trimmed.replace(/^[-*]\s+/, '')}</span>
              </div>
            );
          }
          if (trimmed.startsWith('1. ') || trimmed.startsWith('2. ') || trimmed.startsWith('3. ') || trimmed.startsWith('4. ')) {
            const num = trimmed.slice(0, 3);
            const text = trimmed.slice(3);
            return (
              <div key={idx} className="flex items-start gap-1.5 mr-2 font-medium">
                <span className="font-mono font-bold text-[#DC2626]">{num}</span>
                <span className="flex-1">{text}</span>
              </div>
            );
          }
          if (trimmed === '---') {
            return <hr key={idx} className="my-2 border-zinc-200" />;
          }
          if (!trimmed) {
            return <div key={idx} className="h-1" />;
          }
          return <p key={idx}>{trimmed}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 bg-zinc-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`bg-white md:rounded-3xl shadow-2xl flex flex-col border border-zinc-200 overflow-hidden transition-all duration-300 w-full h-full md:h-[84vh] ${
          isExpanded ? 'md:max-w-5xl md:h-[92vh]' : 'md:max-w-2xl'
        }`}
      >
        {/* Header */}
        <div className="bg-[#111318] text-white p-3.5 sm:px-6 sm:py-4 flex items-center justify-between border-b-2 border-[#DC2626] shadow-sm pt-safe">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#DC2626] flex items-center justify-center shadow-sm shadow-red-600/25 shrink-0">
              <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h3 className="font-black text-sm sm:text-base tracking-tight">
                  المساعد الذكي لإدارة التوظيف
                </h3>
                <span className="px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-mono bg-white/10 text-red-300 border border-white/15 font-black">
                  AI Ready
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-300 flex items-center gap-1 mt-0.5">
                <Sparkles className="w-3 h-3 text-red-400 shrink-0" />
                <span className="truncate">تحليل السير، استشارات الرواتب، وتوصيات اللجان</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-zinc-300">
            <button
              type="button"
              onClick={handleClearHistory}
              title={confirmClear ? 'اضغط للتأكيد ومسح المحادثة' : 'مسح المحادثة والبدء من جديد'}
              className={`px-2 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold ${
                confirmClear
                  ? 'bg-[#DC2626] text-white'
                  : 'hover:text-white hover:bg-white/15'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              {confirmClear && <span>تأكيد المسح</span>}
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'تصغير' : 'تكبير'}
              className="p-2 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer hidden sm:block"
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              title="إغلاق"
              className="p-2 text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Selected Candidate Bar if active */}
        {selectedApplicant && (
          <div className="bg-zinc-100 border-b border-zinc-200 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#111318]">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#DC2626] shrink-0" />
              <span className="font-bold text-zinc-600">المرشح المحدد:</span>
              <span className="font-black text-[#111318] truncate">{selectedApplicant.fullName}</span>
              <span className="text-zinc-600 font-medium">({selectedApplicant.positionApplied})</span>
            </div>
            <button
              type="button"
              onClick={() => handleSend(`⚡ تحليل شامل ومفصل لملف المرشح (${selectedApplicant.fullName}) واقتراح الراتب المناسب`)}
              disabled={isLoading}
              className="px-2.5 py-1 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-xs active:scale-95 transition-transform cursor-pointer whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3 h-3 text-white" />
              <span>تحليل فوري الآن</span>
            </button>
          </div>
        )}

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3.5 bg-[#F7F8FA] momentum-scroll">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 sm:gap-3 max-w-[92%] sm:max-w-[85%] ${
                  isUser ? 'mr-auto flex-row-reverse' : 'ml-auto'
                }`}
              >
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-xs ${
                    isUser
                      ? 'bg-[#DC2626] shadow-xs'
                      : 'bg-[#111318] border border-zinc-700 shadow-xs'
                  }`}
                >
                  {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-4 h-4 text-red-400" />}
                </div>

                <div
                  className={`p-3 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                    isUser
                      ? 'bg-[#DC2626] text-white rounded-tr-none'
                      : 'bg-white text-zinc-800 rounded-tl-none border border-zinc-200'
                  }`}
                >
                  {renderFormattedContent(msg.content)}
                  <div
                    className={`text-[9px] sm:text-[10px] mt-2 font-mono ${
                      isUser ? 'text-red-100 text-left' : 'text-zinc-400 text-right'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-2.5 sm:gap-3 max-w-[90%] ml-auto">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#111318] border border-zinc-700 flex items-center justify-center text-red-400 shrink-0">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-400" />
              </div>
              <div className="p-3.5 rounded-2xl bg-white border border-zinc-200 shadow-xs text-zinc-600 text-xs sm:text-sm flex items-center gap-2.5">
                <span className="font-bold text-zinc-700 text-xs">
                  جاري تحليل البيانات وإعداد التقرير الإداري...
                </span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
                <span>{errorMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => handleSend()}
                className="px-2.5 py-1 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-lg font-bold text-[11px] shrink-0"
              >
                إعادة المحاولة
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Prompts */}
        <div className="p-2 sm:px-4 bg-zinc-100 border-t border-zinc-200 overflow-x-auto flex items-center gap-2 no-scrollbar">
          <div className="flex items-center gap-1 text-[11px] text-zinc-600 font-black shrink-0 ml-1">
            <Lightbulb className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
            <span className="hidden sm:inline">مقترحات:</span>
          </div>
          {candidateQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              disabled={isLoading}
              className="text-[11px] bg-white border border-zinc-200 hover:border-[#DC2626] hover:text-[#DC2626] text-zinc-700 px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors shadow-2xs font-bold cursor-pointer shrink-0 disabled:opacity-50 active:scale-95"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-white border-t border-zinc-200 pb-safe">
          <div className="flex items-end gap-2 bg-zinc-50 border border-zinc-300 rounded-2xl p-1.5 focus-within:bg-white focus-within:border-[#DC2626] focus-within:ring-2 focus-within:ring-red-600/20 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب استفسارك هنا للمساعد الذكي... (مثال: ما هو الراتب المناسب لكابتن الصالة؟)"
              rows={1}
              className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-[#111318] placeholder-zinc-400 focus:outline-none resize-none max-h-24 overflow-y-auto"
            />

            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="p-2.5 bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-zinc-300 text-white rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0 shadow-xs active:scale-95"
              title="إرسال"
            >
              <Send className="w-4 h-4 rotate-180" />
            </button>
          </div>
          <p className="text-[10px] text-zinc-400 text-center mt-1.5">
            المساعد الذكي يربط قرارات اللجان بمتطلبات العمل في شركة آخر ساعة إسبشيال.
          </p>
        </div>
      </div>
    </div>
  );
};
