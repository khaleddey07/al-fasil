/**
 * التغذية الراجعة اللمسية والصوتية (متطلب الوثيقة التقنية: Haptics & Audio)
 * اهتزاز خفيف عبر navigator.vibrate عند الضغط على زر التسجيل الضخم
 * حتى يشعر التاجر أن التطبيق يستمع إليه فورًا، مع نغمة تأكيد قصيرة
 * عبر Web Audio API دون تحميل أي ملفات صوتية.
 */

/** اهتزاز قصير مريح — 50ms عند بدء التسجيل كما في الوثيقة */
export function haptic(pattern: number | number[] = 50): void {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // الجهاز أو المتصفح لا يدعم الاهتزاز — تجاهل بصمت
  }
}

let audioCtx: AudioContext | null = null;

/**
 * نغمة قصيرة خافتة تؤكد بدء/إيقاف التسجيل (مؤشر صوتي)
 * تُولَّد لحظيًا عبر مذبذب Web Audio — بلا ملفات ولا طلبات شبكة
 */
export function playBlip(
  frequency = 880,
  durationMs = 90,
  gainValue = 0.045
): void {
  try {
    if (typeof window === "undefined") return;
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;

    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === "suspended") void audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;

    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(gainValue, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + durationMs / 1000);
  } catch {
    // الصوت غير متاح — تجاهل بصمت
  }
}
