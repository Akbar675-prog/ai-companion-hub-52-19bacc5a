import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Info, X } from "lucide-react";

const DISMISS_KEY = "galileo:download-link-notice:2026-11-01";

export function DownloadLinkNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(DISMISS_KEY) !== "dismissed");
    } catch {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, "dismissed");
    } catch {
      // Keep the notice dismissible when browser storage is unavailable.
    }
  }

  if (!visible) return null;

  return (
    <aside
      aria-labelledby="download-link-notice-title"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5"
    >
      <div className="m3-shadow-2 mx-auto flex max-w-3xl items-start gap-3 rounded-3xl border border-border/80 bg-card/95 p-4 backdrop-blur-xl sm:items-center sm:gap-4 sm:px-5">
        <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container sm:mt-0">
          <Info aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="download-link-notice-title" className="font-semibold leading-tight">
            Info perubahan tautan unduhan
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Mulai 1 November 2026, tautan unduhan akan menggunakan halaman iklan. Pendapatan membantu biaya operasional server dan mendukung modder.
          </p>
          <Link
            to="/about-1-november-later"
            className="mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-full text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Lihat penjelasan lengkap
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Tutup pengumuman"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-variant hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>
    </aside>
  );
}
