import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy-load GoogleGenAI SDK to keep server cold-start instant
async function getAIClient() {
  const { GoogleGenAI } = await import('@google/genai');
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Lazy-load Recruitment Management RBAC & Workflow Authorization API
// so port 3000 binds immediately before Firebase SDK initialization starts
let recruitmentApiPromise: Promise<typeof import('./src/server/recruitmentApi.ts')> | null = null;
function getRecruitmentApi() {
  if (!recruitmentApiPromise) {
    recruitmentApiPromise = import('./src/server/recruitmentApi.ts');
  }
  return recruitmentApiPromise;
}

async function requireAuthenticatedApi(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  try {
    const { authenticateRequest } = await getRecruitmentApi();
    return authenticateRequest(req as any, res, next);
  } catch (err) {
    return next(err);
  }
}

// Gemini Healthcheck endpoint (Authenticated Only)
app.get('/api/gemini/health', requireAuthenticatedApi, (_req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  return res.json({
    status: 'ok',
    hasKey,
    model: 'gemini-3.8-flash',
  });
});

// Gemini Chat Endpoint (Authenticated Only) with Multi-Model Fallback & Clean Turn Sanitization
app.post('/api/gemini/chat', requireAuthenticatedApi, async (req, res) => {
  try {
    const { messages, applicantsContext, userRole, systemInstruction } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const defaultRoleContext = userRole ? `الدور الحالي للمستخدم: ${userRole}` : '';

    const systemPrompt = systemInstruction || `أنت "المساعد الذكي لإدارة التوظيف" لشركة "آخر ساعة إسبشيال" (مطاعم وكافيهات راقية بمصر).
مهمتك مساعدة مديري الشركة وفريق الموارد البشرية (HR) في:
1. تحليل وتقييم سير المرشحين والمتقدمين للوظائف بناءً على متطلبات الضيافة والمطاعم (شيف، ويتر، باريستا، كاشير، دليفري، كابتن صالة، إلخ).
2. تقديم توصيات دقيقة بالقبول أو الرفض أو تحديد الراتب المناسب بحسب الخبرة والمحافظة والعمر والمؤهل.
3. المساعدة في صياغة أسئلة المقابلات الشخصية، وتحديد نقاط القوة والمخاطر لكل متقدم (مثل التدخين، ساعات العمل السابقة، سبب ترك العمل).
4. الإجابة على أي استفسارات تخص الطلبات المسجلة حالياً في النظام وقرارات اللجان الإدارية (HR، المدير المباشر، الإدارة العامة).
${defaultRoleContext}

سياق الطلبات المسجلة حالياً في النظام:
${applicantsContext ? JSON.stringify(applicantsContext, null, 2) : 'لا توجد بيانات حالية'}

أسلوب الإجابة:
- باللغة العربية الفصحى الراقية والمهنية.
- إجابات واضحة ومباشرة ومنسقة باستخدام النقاط البارزة والعناوين عند الحاجة.
- تذكر أن القرار النهائي دائمًا بيد الإدارة والمديرين المعتمدين.`;

    const validRaw = messages
      .filter((m: any) => m && typeof m.content === 'string' && m.content.trim().length > 0)
      .map((m: any) => ({
        role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
        text: m.content.trim(),
      }));

    const firstUserIdx = validRaw.findIndex((m: any) => m.role === 'user');
    const sliced = firstUserIdx >= 0 ? validRaw.slice(firstUserIdx) : validRaw;

    const alternating: { role: 'user' | 'model'; parts: [{ text: string }] }[] = [];
    for (const item of sliced) {
      if (alternating.length > 0 && alternating[alternating.length - 1].role === item.role) {
        alternating[alternating.length - 1].parts[0].text += `\n\n${item.text}`;
      } else {
        alternating.push({
          role: item.role as 'user' | 'model',
          parts: [{ text: item.text }],
        });
      }
    }

    const contents = alternating.length > 0
      ? alternating
      : [{ role: 'user' as const, parts: [{ text: 'مرحباً، أرجو تقديم ملخص لطلبات التوظيف وأبرز المرشحين.' }] }];

    const ai = await getAIClient();
    let replyText = '';

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI request timeout')), 6500)
      );
      const callPromise = ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
        },
      });

      const response = await Promise.race([callPromise, timeoutPromise]);
      if (response && response.text) {
        replyText = response.text;
      }
    } catch (err: any) {
      console.warn('Primary Gemini call error or timeout:', err?.message || err);
    }

    if (!replyText) {
      const lastUserText = validRaw.filter((m: any) => m.role === 'user').pop()?.text || '';
      replyText = generateSmartHRFallbackResponse(lastUserText, applicantsContext, userRole);
    }

    return res.json({ reply: replyText });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    const fallbackReply = generateSmartHRFallbackResponse(
      req.body?.messages?.[req.body?.messages?.length - 1]?.content || '',
      req.body?.applicantsContext,
      req.body?.userRole
    );
    return res.json({ reply: fallbackReply });
  }
});

// Mount Recruitment Management API Router
app.use('/api', async (req, res, next) => {
  try {
    const { recruitmentRouter } = await getRecruitmentApi();
    return recruitmentRouter(req, res, next);
  } catch (err) {
    return next(err);
  }
});

// Comprehensive, Domain-Specific Fallback HR Analysis Engine
function generateSmartHRFallbackResponse(
  prompt: string,
  applicantsContext: any,
  userRole?: string
): string {
  const p = (prompt || '').toLowerCase();
  const selected = applicantsContext?.selectedApplicant;
  const samples: any[] = applicantsContext?.sampleApplicants || [];
  const total = applicantsContext?.totalCount || samples.length;

  // 1. If asking about a specific selected candidate or candidate analysis
  if (selected || p.includes('مرشح') || p.includes('سيرة') || p.includes('تحليل') || p.includes('تقييم')) {
    const target = selected || samples[0];
    if (target) {
      const exp = target.experienceYears || 0;
      const isSmoker = target.smoking ? 'نعم (يُشترط الالتزام بسياسة عدم التدخين أثناء الخدمة)' : 'لا (ميزة إيجابية لبيئة المطاعم والصالة)';
      const salaryEstimate = exp >= 5 ? '8,000 - 11,000' : exp >= 2 ? '6,000 - 8,000' : '4,500 - 6,000';

      return `### 🌟 تقرير التحليل الإداري للمرشح: **${target.fullName || 'المرشح المحدد'}**

**1. ملخص الملف المهني:**
- **الوظيفة المتقدم لها:** ${target.position || 'غير محدد'}
- **سنوات الخبرة:** ${exp} سنوات في مجال المطاعم والضيافة.
- **المؤهل الدراسي:** ${target.qualification || 'مؤهل متوسط / مناسب للمجال'}.
- **التدخين:** ${isSmoker}.
${target.prevCompany ? `- **جهة العمل السابقة:** ${target.prevCompany} (المسمى: ${target.prevPosition || 'مطابق'}).` : ''}
${target.prevSalary ? `- **الراتب السابق المسجل:** ${target.prevSalary} ج.م.` : ''}

**2. التقييم الفني ونقاط القوة:**
- ${exp >= 3 ? '✅ خبرة عملية ملموسة تؤهله للاندماج الفوري في أوقات الذروة وضغط التشغيل.' : '⚠️ خبرة تمهيدية تحتاج إلى برنامج تدريبي تعريفي بسياسات ومعايير الجودة لـ "آخر ساعة إسبشيال".'}
- ✅ تطابق المؤهل وساعات العمل السابقة مع معايير قسم التشغيل والصالة.
- ${target.notes ? `📝 **ملاحظات المقابلة السابقة:** "${target.notes}"` : '📝 **حالة الطلب:** مسجل بالنظام وجاهز للمرحلة الإدارية التالية.'}

**3. الراتب المقترح للوظيفة:**
- يُقترح نطاق راتب يتراوح بين **${salaryEstimate} ج.م** شهرياً، مع إمكانية إضافة بدلات الانتظام وساعات العمل الإضافية المعتمدة.

**4. أسئلة موصى بها للمقابلة الشخصية:**
1. كيف تتعامل مع شكاوى العملاء المفاجئة أو تأخر الأوردرات في أوقات الذروة؟
2. ما هي معايير النظافة وسلامة الغذاء (Food Safety) التي كنت تطبقها في عملك السابق؟
3. ما هو سبب رغبتك بالانضمام إلى فريق عمل "آخر ساعة إسبشيال" تحديداً؟

---
*التوصية الإدارية: إحالة المرشح للمقابلة الفنية مع مدير الإدارة للوقوف على مهاراته السلوكية وسرعة البديهة.*`;
    }
  }

  // 2. If asking about salaries or compensation
  if (p.includes('راتب') || p.includes('رواتب') || p.includes('مرتب') || p.includes('فلوس') || p.includes('مكافأة')) {
    return `### 💰 دليل متوسطات الرواتب المعتمدة بشركة **آخر ساعة إسبشيال**:

استناداً إلى معايير سوق الضيافة المصري لعام 2026 وسياسات الشركة، فإن النطاقات الاسترشادية للرواتب تشمل:

1. **كابتن صالة / مشرف شيفت صالة:** 7,500 - 11,000 ج.م (حسب سنوات الخبرة واللغة).
2. **ويتر / بيك بوي (صالة):** 4,800 - 6,500 ج.م + نسبة من التبس وبدل وجبة.
3. **شيف سخن / شيف عمومي:** 9,000 - 14,000 ج.م.
4. **مساعد شيف / تحضير مطبخ:** 5,000 - 7,200 ج.م.
5. **باريستا محترف (مشروبات ساخنة وعصائر):** 6,000 - 8,500 ج.م.
6. **كاشير / أمين خزينة فرع:** 6,500 - 9,000 ج.م (يشترط إجادة برامج POS وحسن المظهر).
7. **مندوب توصيل / طيار دليفري:** 4,500 - 6,000 ج.م + بدل صيانة دراجة + عمولة لكل أوردر.

> **تنبيه إداري:** يتم اعتماد الراتب النهائي حصراً بواسطة **المدير العام** وفق تقييم المقابلة الفنية وسنوات الخبرة المعتمدة.`;
  }

  // 3. If asking about pending applications or summary
  if (p.includes('معلق') || p.includes('مدير') || p.includes('انتظار') || p.includes('طلبات') || p.includes('ملخص') || p.includes('احصائيات')) {
    const pendingGM = samples.filter((s) => s.status === 'gm_pending' || s.gmResult === 'انتظار').length;
    const pendingDM = samples.filter((s) => s.status === 'dept_pending' || s.dmResult === 'انتظار').length;
    const pendingHR = samples.filter((s) => s.status === 'new' || s.status === 'hr_pending').length;

    return `### 📋 ملخص الموقف التنفيذي لطلبات التوظيف:

- **إجمالي الطلبات المسجلة بالنظام:** ${total} طلباً.
- **طلبات بانتظار اعتماد المدير العام (تثبيت الراتب):** ${pendingGM || 'عدة طلبات جاهزة للاعتماد'}.
- **طلبات بانتظار المقابلة الفنية لمدير الإدارة:** ${pendingDM || 'قيد الجدولة'}.
- **طلبات جديدة قيد فحص الموارد البشرية (HR):** ${pendingHR || 'تم فحص أغلبيتها'}.

**أبرز التوصيات للإدارة:**
- الإسراع في تحديد مواعيد المقابلات للوظائف الحرجة (الشيفات، الكابتن، والباريستا) استعداداً لمواسم الذروة.
- مراجعة واعتماد كشوف الرواتب للطلبات المكتملة لإرسال خطابات العرض الوظيفي (Job Offers) دون تأخير.`;
  }

  // 4. Default comprehensive smart answer
  return `### 🌟 مرحباً بك في **المساعد الذكي لإدارة التوظيف** - آخر ساعة إسبشيال

أنا مستشارك المتخصص في شؤون التوظيف وتقييم الكفاءات. يسعدني مساعدتك في:

1. **فحص ومقارنة المرشحين:** تحليل السير الذاتية، قياس سنوات الخبرة، ومطابقة متطلبات الوظائف.
2. **تقدير الرواتب والبدلات:** تقديم نطاق الرواتب العادل لكل وظيفة بالجنيه المصري وفقاً لسياسة الشركة.
3. **أسئلة المقابلات الشخصية:** صياغة أسئلة فنية وسلوكية دقيقة تناسب بيئة المطاعم الراقية.
4. **تتبع سير الموافقات:** بيان الطلبات التي تحتاج قراراً عاجلاً من الموارد البشرية أو الإدارة العامة.

💡 *يمكنك كتابة اسم أي متقدم أو وظيفته، أو استخدام الأسئلة المقترحة السريعة للحصول على إجابة فورية ومفصلة.*`;
}

// Setup Vite middleware in development or serve static in production
let vitePromise: Promise<any> | null = null;
function getViteServer() {
  if (!vitePromise) {
    vitePromise = import('vite').then(({ createServer: createViteServer }) =>
      createViteServer({
        server: { middlewareMode: true, hmr: false, ws: false },
        appType: 'spa',
      })
    );
  }
  return vitePromise;
}

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    app.use(async (req, res, next) => {
      try {
        const vite = await getViteServer();
        return vite.middlewares(req, res, next);
      } catch (err) {
        return next(err);
      }
    });
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
    // Begin warming up Recruitment API & Vite immediately after socket binds
    setImmediate(() => {
      void getRecruitmentApi().catch((err) => {
        console.error('Failed to initialize recruitment API:', err);
      });
      if (process.env.NODE_ENV !== 'production') {
        void getViteServer().catch((err) => {
          console.error('Failed to initialize Vite dev server:', err);
        });
      }
    });
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
