"use client";

import jsQR from "jsqr";
import { useEffect, useRef, useState } from "react";

interface Detector {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => Detector;
  }
}

/** Quét QR bằng camera sau: BarcodeDetector nếu trình duyệt có, nếu không thì jsQR (Safari). */
export function QrScanner({ onResult }: { onResult: (text: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const detector = window.BarcodeDetector ? new window.BarcodeDetector({ formats: ["qr_code"] }) : null;

    const scan = async () => {
      const v = video.current;
      if (stopped || !v || v.readyState < 2) {
        frame = requestAnimationFrame(scan);
        return;
      }
      let text: string | undefined;
      if (detector) {
        text = (await detector.detect(v).catch(() => []))[0]?.rawValue;
      } else if (ctx) {
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
        ctx.drawImage(v, 0, 0);
        text = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)?.data;
      }
      if (text) onResult(text);
      else if (!stopped) frame = requestAnimationFrame(scan);
    };

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((s) => {
        stream = s;
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play();
        }
        frame = requestAnimationFrame(scan);
      })
      .catch(() => setError("Không mở được camera. Hãy cho phép dùng camera, hoặc gõ mã."));

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onResult]);

  return (
    <div className="flex flex-col gap-2">
      <video ref={video} playsInline muted className="aspect-square w-full rounded-xl bg-black object-cover" aria-label="Khung camera quét mã QR" />
      {error && (
        <p role="alert" className="text-sm text-xung">
          {error}
        </p>
      )}
    </div>
  );
}
