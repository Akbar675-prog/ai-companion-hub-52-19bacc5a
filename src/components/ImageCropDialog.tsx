import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useT } from "@/lib/i18n";

type ImageCropDialogProps = {
  file: File;
  shape: "circle" | "rectangle";
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

const FRAME_WIDTH = 320;
const OUTPUT_WIDTH = 1200;

export function ImageCropDialog({ file, shape, onCancel, onConfirm }: ImageCropDialogProps) {
  const t = useT();
  const [source, setSource] = useState("");
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(50);
  const [panY, setPanY] = useState(50);
  const [error, setError] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const dragPoint = useRef<{ x: number; y: number } | null>(null);
  const [frameWidth, setFrameWidth] = useState(FRAME_WIDTH);

  const ratio = shape === "circle" ? 1 : 3;
  const frameHeight = frameWidth / ratio;
  const scale = imageSize
    ? Math.max(frameWidth / imageSize.width, frameHeight / imageSize.height) * zoom
    : 1;
  const imageWidth = (imageSize?.width ?? 0) * scale;
  const imageHeight = (imageSize?.height ?? 0) * scale;
  const imageLeft = (frameWidth - imageWidth) * (panX / 100);
  const imageTop = (frameHeight - imageHeight) * (panY / 100);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSource(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;
    const observer = new ResizeObserver(([entry]) => setFrameWidth(entry.contentRect.width));
    observer.observe(preview);
    return () => observer.disconnect();
  }, []);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    dragPoint.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const previous = dragPoint.current;
    if (!previous) return;
    const deltaX = event.clientX - previous.x;
    const deltaY = event.clientY - previous.y;
    dragPoint.current = { x: event.clientX, y: event.clientY };
    if (imageWidth > frameWidth) {
      setPanX((value) =>
        Math.max(0, Math.min(100, value - (deltaX * 100) / (imageWidth - frameWidth))),
      );
    }
    if (imageHeight > frameHeight) {
      setPanY((value) =>
        Math.max(0, Math.min(100, value - (deltaY * 100) / (imageHeight - frameHeight))),
      );
    }
  }

  function confirmCrop() {
    const image = imageRef.current;
    if (!image || !imageSize) return;

    const outputHeight = OUTPUT_WIDTH / ratio;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_WIDTH;
    canvas.height = outputHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setError(t("Browser tidak dapat memproses gambar ini."));
      return;
    }

    const sourceX = -imageLeft / scale;
    const sourceY = -imageTop / scale;
    const sourceWidth = frameWidth / scale;
    const sourceHeight = frameHeight / scale;
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      OUTPUT_WIDTH,
      outputHeight,
    );
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError(t("Gagal memproses gambar. Coba pilih gambar lain."));
          return;
        }
        onConfirm(
          new File([blob], file.name.replace(/\.[^.]+$/, "") + "-crop.jpg", { type: "image/jpeg" }),
        );
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-crop-title"
        className="w-full max-w-md rounded-3xl bg-card p-5 shadow-2xl"
      >
        <h2 id="image-crop-title" className="font-display text-lg font-semibold">
          {shape === "circle" ? t("Atur bingkai foto profil") : t("Atur bingkai banner")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("Geser pembingkaian dengan penggeser, lalu sesuaikan zoom.")}
        </p>

        <div
          ref={previewRef}
          className="mx-auto mt-5 w-full max-w-80 touch-none cursor-grab overflow-hidden bg-black active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={() => {
            dragPoint.current = null;
          }}
          onPointerCancel={() => {
            dragPoint.current = null;
          }}
          style={{ aspectRatio: String(ratio), borderRadius: shape === "circle" ? "50%" : "1rem" }}
        >
          {source && (
            <img
              ref={imageRef}
              src={source}
              alt={t("Pratinjau pemotongan gambar")}
              onLoad={(event) =>
                setImageSize({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                })
              }
              className="pointer-events-none max-w-none select-none"
              style={{
                width: imageWidth,
                height: imageHeight,
                transform: `translate(${imageLeft}px, ${imageTop}px)`,
              }}
            />
          )}
        </div>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-1 text-sm">
            <span>{t("Geser horizontal")}</span>
            <input
              aria-label={t("Geser horizontal")}
              type="range"
              min="0"
              max="100"
              value={panX}
              onChange={(event) => setPanX(Number(event.target.value))}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>{t("Geser vertikal")}</span>
            <input
              aria-label={t("Geser vertikal")}
              type="range"
              min="0"
              max="100"
              value={panY}
              onChange={(event) => setPanY(Number(event.target.value))}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>{t("Zoom")}</span>
            <input
              aria-label={t("Zoom")}
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
          </label>
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-full border border-input px-4 text-sm font-medium hover:bg-accent"
          >
            {t("Batal")}
          </button>
          <button
            type="button"
            disabled={!imageSize}
            onClick={confirmCrop}
            className="min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {t("Gunakan foto ini")}
          </button>
        </div>
      </section>
    </div>
  );
}
