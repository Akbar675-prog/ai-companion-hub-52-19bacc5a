import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";

/** Official verified badge (inline SVG, no network request). */
export function VerifiedBadge({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      role="img"
      aria-label="Terverifikasi"
      className={`inline-block shrink-0 ${className}`}
    >
      <title>Terverifikasi</title>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill="#0085F4"
        d="M19.9139 9.88763L21.3235 11.3162L21.3139 11.3066C21.6954 11.6882 21.6954 12.3045 21.3137 12.6861L19.9041 14.1146L20.4131 16.0618C20.5404 16.5804 20.237 17.1185 19.7182 17.2555L17.7801 17.7839L17.2515 19.7212C17.1047 20.2398 16.5761 20.5529 16.0573 20.416L14.1094 19.9072L12.6803 21.3161C12.4943 21.5021 12.2398 21.5999 11.9951 21.5999C11.7504 21.5999 11.4959 21.5021 11.3099 21.3161L9.8808 19.9072L7.9329 20.416C7.41412 20.5529 6.87575 20.2398 6.73871 19.7212L6.21014 17.7839L4.27203 17.2555C3.76303 17.1087 3.4498 16.5804 3.58684 16.0618L4.09584 14.1146L2.68631 12.6861C2.30456 12.3045 2.30456 11.688 2.68631 11.3064L4.09584 9.87785L3.58684 7.9307C3.4498 7.41211 3.75324 6.87395 4.27203 6.73696L6.21014 6.20859L6.73871 4.27122C6.88554 3.76242 7.41412 3.44931 7.9329 3.5863L9.8808 4.0951L11.3099 2.6861C11.6917 2.3045 12.3083 2.3045 12.6901 2.6861L14.1192 4.0951L16.0671 3.5863C16.5859 3.45909 17.1242 3.76242 17.2613 4.28101L17.7899 6.21838L19.728 6.74675C20.2467 6.89352 20.56 7.42189 20.4229 7.94048L19.9139 9.88763ZM11.2501 15.3212C11.0578 15.5134 10.8174 15.5999 10.5674 15.5999C10.3175 15.5999 10.0771 15.5038 9.88482 15.3212L7.48122 12.9188C7.10625 12.544 7.10625 11.9386 7.48122 11.5639C7.85618 11.1891 8.46189 11.1891 8.83685 11.5639L10.5578 13.284L15.1631 8.68098C15.5381 8.30621 16.1438 8.30621 16.5188 8.68098C16.8937 9.05576 16.8937 9.66116 16.5188 10.0359L13.894 12.6786L11.2501 15.3212Z"
      />
    </svg>
  );
}

/** Badge that opens an explainer sheet when tapped. */
export function VerifiedBadgeButton({ className = "size-5" }: { className?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={t("Terverifikasi")}
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 rounded-full transition active:scale-90"
      >
        <VerifiedBadge className={className} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-3xl text-center">
          <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-surface-variant">
            <VerifiedBadge className="size-12" />
          </div>
          <h2 className="mt-4 font-display text-2xl">{t("Terverifikasi")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t(
              "Galileo, perusahaan induk GMA, telah memverifikasi akun ini berdasarkan aktivitasnya di seluruh produk kami serta informasi atau dokumen yang mereka sediakan.",
            )}
          </p>
          <Link
            to="/verified"
            onClick={() => setOpen(false)}
            className="mt-4 text-sm font-semibold text-primary"
          >
            {t("Pelajari selengkapnya tentang akun terverifikasi")}
          </Link>
        </DialogContent>
      </Dialog>
    </>
  );
}
