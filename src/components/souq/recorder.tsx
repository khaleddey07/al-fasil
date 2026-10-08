"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, AlertCircle } from "lucide-react";
import { haptic, playBlip } from "@/lib/haptics";

interface ParsedProductResult {
  name: string;
  description: string;
  price: number | null;
  options: { name: string; choices: string[] }[];
}

interface RecorderProps {
  onResult: (transcript: string, parsed?: ParsedProductResult) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

interface RecordingState {
  idle: "idle";
  recording: "recording";
  processing: "processing";
  error: "error";
}

const MAX_DURATION_MS = 2 * 60 * 1000; // حد أقصى دقيقتان

/**
 * مكوّن تسجيل صوتي: يسجل صوت التاجر ويرسله للخادم
 * ليُحوَّل إلى نص ثم تُستخرج بيانات المنتج بالذكاء الاصطناعي
 */
export function Recorder({ onResult, onError, disabled }: RecorderProps) {
  const [status, setStatus] = useState<keyof RecordingState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timerRef.current = null;
    timeoutRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  function pickMimeType(): string {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ];
    for (const type of candidates) {
      if (
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported(type)
      ) {
        return type;
      }
    }
    return "";
  }

  async function startRecording() {
    setErrorMessage("");
    setStatus("recording");
    setElapsed(0);
    cancelledRef.current = false;

    // استجابة لمسية وصوتية فورية: التاجر يشعر أن التطبيق يستمع إليه
    haptic([50]);
    playBlip(880, 90);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        void handleRecordingComplete();
      };

      recorder.start(250);

      // مؤقت العرض
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 500);

      // حد أقصى للتسجيل
      timeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, MAX_DURATION_MS);
    } catch {
      cleanup();
      setStatus("error");
      haptic([50, 50, 50]); // نمط اهتزاز تحذيري عند فشل الميكروفون
      setErrorMessage("تعذر الوصول إلى الميكروفون، تأكد من منح الإذن للمتصفح");
      onError?.("تعذر الوصول إلى الميكروفون");
    }
  }

  function stopRecording() {
    haptic(30);
    playBlip(620, 80);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    } else {
      cleanup();
      setStatus("idle");
    }
  }

  async function handleRecordingComplete() {
    cleanup();
    if (cancelledRef.current) {
      setStatus("idle");
      return;
    }

    const blob = new Blob(chunksRef.current, { type: mediaRecorderRef.current?.mimeType || "audio/webm" });
    chunksRef.current = [];

    if (blob.size < 1000) {
      setStatus("error");
      setErrorMessage("التسجيل فارغ أو قصير جدًا، حاول مرة أخرى");
      return;
    }

    setStatus("processing");

    try {
      const base64 = await blobToBase64(blob);
      const res = await fetch("/api/parse-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio: base64.split(",")[1],
          mimeType: blob.type || "audio/webm",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error || "تعذر تحليل التسجيل");
        onError?.(data.error || "تعذر تحليل التسجيل");
        return;
      }

      setStatus("idle");
      onResult(data.transcript || "", data.parsed);
    } catch {
      setStatus("error");
      setErrorMessage("تعذر إرسال التسجيل، تحقق من اتصالك بالإنترنت");
      onError?.("تعذر إرسال التسجيل");
    }
  }

  function cancel() {
    cancelledRef.current = true;
    haptic(20);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    cleanup();
    setStatus("idle");
  }

  // دعم onResult مع نتيجتين (نص + بيانات محللة)
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {status === "idle" && (
          <Button
            type="button"
            variant="outline"
            onClick={startRecording}
            disabled={disabled}
            className="gap-2 rounded-full"
          >
            <Mic className="w-4 h-4 text-primary" />
            إضافة بالصوت
          </Button>
        )}

        {status === "recording" && (
          <>
            <Button
              type="button"
              variant="destructive"
              onClick={stopRecording}
              className="gap-2"
            >
              <span className="relative flex w-3 h-3">
                <span className="recording-pulse absolute inline-flex h-full w-full rounded-full bg-white/80" />
                <Square className="relative inline-flex w-3 h-3 fill-current" />
              </span>
              إيقاف وإرسال
            </Button>
            <span className="text-sm font-mono text-muted-foreground" dir="ltr">
              {formatTime(elapsed)} / 02:00
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={cancel}
              className="text-muted-foreground"
            >
              إلغاء
            </Button>
          </>
        )}

        {status === "processing" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/70 border border-border/60 rounded-full px-4 py-2.5 animate-fade-in">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            جارٍ تحليل التسجيل بالذكاء الاصطناعي...
          </div>
        )}
      </div>

      {status === "error" && (
        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3.5 py-2.5 animate-fade-in">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1">
            {errorMessage}
            <button
              type="button"
              onClick={() => setStatus("idle")}
              className="block text-xs underline mt-1"
            >
              حاول مجددًا
            </button>
          </div>
        </div>
      )}

      {status === "recording" && (
        <p className="text-xs text-muted-foreground">
          تحدّث بوضوح واذكر: اسم المنتج، سعره، وصفه، والألوان أو المقاسات المتوفرة
        </p>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
