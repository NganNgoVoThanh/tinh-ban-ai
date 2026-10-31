"use client";

import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void; "error-callback": () => void; theme: "auto"; language: string }) => string;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading: Promise<TurnstileApi> | undefined;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise((resolve, reject) => {
    const script = Object.assign(document.createElement("script"), { src: SRC, async: true });
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile")));
    script.onerror = () => {
      loading = undefined;
      reject(new Error("turnstile"));
    };
    document.head.append(script);
  });
  return loading;
}

/**
 * Ô kiểm tra chống bot Cloudflare Turnstile (Technical Plan mục 10, 15). Chỉ tải script khi server
 * yêu cầu, nên phần lớn người dùng không bao giờ gọi tới Cloudflare.
 */
export function Turnstile({ siteKey, onToken }: { siteKey: string; onToken: (token: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const callback = useRef(onToken);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    callback.current = onToken;
  });
  useEffect(() => {
    let id: string | undefined;
    let api: TurnstileApi | undefined;
    let cancelled = false;
    loadTurnstile().then(
      (t) => {
        if (cancelled || !box.current) return;
        api = t;
        id = t.render(box.current, { sitekey: siteKey, callback: (token) => callback.current(token), "error-callback": () => setFailed(true), theme: "auto", language: "vi" });
      },
      () => setFailed(true),
    );
    return () => {
      cancelled = true;
      if (api && id) api.remove(id);
    };
  }, [siteKey]);
  return (
    <div className="flex flex-col gap-1">
      <div ref={box} />
      {failed && <p className="text-sm text-xung">Không tải được bước kiểm tra. Kiểm tra mạng rồi thử lại.</p>}
    </div>
  );
}
