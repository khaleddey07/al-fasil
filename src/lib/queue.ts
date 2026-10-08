/**
 * طابور معالجة بالذاكرة (متطلب الوثيقة التقنية: Resilient System
 * Architecture — أنظمة الطوابق لمعالجة الملفات الصوتية والصور
 * لمنع اختناق السيرفر عند ضغط الاستخدام).
 *
 * يعمل كمنظِّم توازية (Concurrency Limiter): المهام الثقيلة مثل
 * تحليل الصوت عبر ASR واستدعاءات الذكاء الاصطناعي تُنفَّذ منها
 * على الأكثر مهمتان في اللحظة الواحدة، والباقي ينتظر دوره.
 * في النشر الموزّع يُستبدل هذا بـ Redis/BullMQ دون تغيير الواجهة.
 */

const MAX_CONCURRENCY = 2;

let active = 0;
const waiting: (() => void)[] = [];

function acquire(): Promise<void> {
  if (active < MAX_CONCURRENCY) {
    active++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    waiting.push(() => {
      active++;
      resolve();
    });
  });
}

function release(): void {
  active--;
  const next = waiting.shift();
  if (next) next();
}

/** يمرّر المهمة عبر الطابور: تنتظر إن بلغت التوازية الحد الأقصى */
export async function withQueue<T>(task: () => Promise<T>): Promise<T> {
  await acquire();
  try {
    return await task();
  } finally {
    release();
  }
}

/** عدد المهام قيد التنفيذ حاليًا (للمراقبة والتشخيص) */
export function queueStats(): { active: number; waiting: number } {
  return { active, waiting: waiting.length };
}
