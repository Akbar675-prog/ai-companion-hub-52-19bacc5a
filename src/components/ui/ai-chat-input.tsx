"use client";

import * as React from "react";
import type { AiModel } from "@/lib/ai-models";
import type { AiPluginId } from "@/lib/ai-plugins";
import { cn } from "@/lib/utils";

export interface PromptInputProps {
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onValueChange?: (value: string) => void;
  onImageChange?: (value: string | null) => void;
  onDocumentChange?: (value: { name: string; text: string } | null) => void;
  onToolChange?: (value: string | null) => void;
  onPluginChange?: (value: AiPluginId | null) => void;
  onModelChange?: (id: string) => void;
  onStop?: () => void;
  isLoading?: boolean;
  image?: string | null;
  document?: { name: string; text: string } | null;
  plugin?: AiPluginId | null;
  models?: AiModel[];
  modelsLoading?: boolean;
  modelId?: string;
  className?: string;
  placeholder?: string;
}

function ArrowUp() {
  return <svg viewBox="0 0 14 14" className="size-4" fill="none" aria-hidden="true"><path d="M7 12V2m0 0L2.5 6.5M7 2l4.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function Plus() {
  return <svg viewBox="0 0 14 14" className="size-4" fill="none" aria-hidden="true"><path d="M7 2.5v9M2.5 7h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
}

function Close() {
  return <svg viewBox="0 0 14 14" className="size-3" fill="none" aria-hidden="true"><path d="m2.5 2.5 9 9m0-9-9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}

function MorphingText({ text }: { text: string }) {
  const [width, setWidth] = React.useState<number | "auto">("auto");
  const measureRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    if (measureRef.current) setWidth(measureRef.current.offsetWidth);
  }, [text]);

  return (
    <span
      className="relative inline-flex items-center justify-center overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]"
      style={{ width }}
    >
      <span ref={measureRef} className="invisible whitespace-nowrap px-1">{text}</span>
      <span key={text} className="absolute inset-0 flex animate-in zoom-in-95 fade-in items-center justify-center whitespace-nowrap duration-300">
        {text}
      </span>
    </span>
  );
}

function ModelIcon({ model, className }: { model: AiModel | null; className?: string }) {
  if (model?.logo) {
    return <img src={model.logo} alt="" className={cn("size-4 shrink-0 rounded-full object-cover", className)} />;
  }
  return (
    <svg viewBox="0 0 16 16" className={cn("size-4 shrink-0 text-primary", className)} fill="none" aria-hidden="true">
      <path d="M8 1.5 9.8 6.2 14.5 8l-4.7 1.8L8 14.5l-1.8-4.7L1.5 8l4.7-1.8L8 1.5Z" fill="currentColor" />
    </svg>
  );
}

function Bars({ level }: { level: string }) {
  const mediumOrHigh = level === "Medium" || level === "Max Effort";
  const high = level === "Max Effort";
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="1.5" y="8" width="2.5" height="4.5" rx="1" fill="currentColor" />
      <rect x="5.75" y="5" width="2.5" height="7.5" rx="1" fill="currentColor" className="transition-opacity duration-300" opacity={mediumOrHigh ? 1 : 0.3} />
      <rect x="10" y="2" width="2.5" height="10.5" rx="1" fill="currentColor" className="transition-opacity duration-300" opacity={high ? 1 : 0.3} />
    </svg>
  );
}

export const PromptInput = React.forwardRef<HTMLTextAreaElement, PromptInputProps>(function PromptInput(
  {
    value = "",
    onChange,
    onValueChange,
    onImageChange,
    onDocumentChange,
    onToolChange,
    onPluginChange,
    onModelChange,
    onStop,
    isLoading = false,
    image,
    document,
    plugin,
    models = [],
    modelsLoading,
    modelId,
    className,
    placeholder = "Tulis pesan...",
  },
  ref,
) {
  const [expanded, setExpanded] = React.useState(Boolean(value || image || document));
  const [modelOpen, setModelOpen] = React.useState(false);
  const [toolOpen, setToolOpen] = React.useState(false);
  const [effort, setEffort] = React.useState(1);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const tools = [
    { id: "searchWeb", label: "Cari di web" },
    { id: "writeCode", label: "Tulis atau ngoding" },
    { id: "thinkLonger", label: "Berpikir lebih lama" },
  ];
  const efforts = ["Low", "Medium", "Max Effort"];
  const activeModel = models.find((model) => model.id === modelId) ?? models[0];
  const hasContent = Boolean(value.trim() || image || document);

  React.useEffect(() => {
    if (hasContent) setExpanded(true);
  }, [hasContent]);

  function updateValue(next: string) {
    onValueChange?.(next);
  }

  function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => onImageChange?.(String(reader.result));
      reader.readAsDataURL(file);
    } else if (file.size <= 8_000_000) {
      const reader = new FileReader();
      reader.onload = () => onDocumentChange?.({ name: file.name, text: String(reader.result).slice(0, 4_000_000) });
      reader.readAsText(file);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape" && !value.trim() && !image && !document) setExpanded(false);
    // Enter intentionally creates a new line. Sending uses the action button.
  }

  return (
    <div className={cn("relative mx-auto w-full transition-[max-width] duration-300 ease-out", expanded ? "max-w-[30rem]" : "max-w-[20rem]", className)}>
      <input ref={fileRef} type="file" accept="image/*,.txt,.md,.csv,.json,.xml,.html,.css,.js,.ts,.tsx,.jsx,.py,.java,.c,.cpp,.sql,.log" onChange={handleFiles} className="hidden" />
      {(image || document) && (
        <div className="flex gap-2 rounded-t-2xl border border-b-0 border-border bg-surface-variant p-2">
          {image && <div className="relative"><img src={image} alt="Pratinjau lampiran" className="size-12 rounded-xl object-cover" /><button type="button" onClick={() => onImageChange?.(null)} className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-card" aria-label="Hapus gambar"><Close /></button></div>}
          {document && <div className="flex items-center gap-2 rounded-xl bg-card px-3 text-xs"><span className="max-w-32 truncate">{document.name}</span><button type="button" onClick={() => onDocumentChange?.(null)} aria-label="Hapus dokumen"><Close /></button></div>}
        </div>
      )}
      {plugin && <button type="button" onClick={() => onPluginChange?.(null)} className="absolute bottom-full left-2 mb-2 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">@{plugin} ×</button>}
      <div className={cn("relative overflow-visible rounded-[24px] border border-border bg-card shadow-sm transition-shadow focus-within:border-ring/50 focus-within:shadow-md", expanded ? "min-h-[116px]" : "h-12")}>
        {!expanded && <button type="button" onClick={() => setExpanded(true)} className="absolute inset-0 z-10 px-4 text-left text-sm font-medium text-muted-foreground/80">{placeholder}</button>}
        <textarea
          ref={ref}
          value={value}
          onChange={(event) => { onChange?.(event); updateValue(event.target.value); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setExpanded(true)}
          placeholder={expanded ? placeholder : ""}
          aria-label="Prompt"
          rows={1}
          className={cn("w-full resize-none bg-transparent px-4 py-3.5 pr-12 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground", expanded ? "block min-h-16" : "pointer-events-none invisible h-0")}
        />
        <div className={cn("absolute bottom-2 left-3 right-12 flex items-center gap-1 transition-opacity", expanded ? "opacity-100" : "pointer-events-none opacity-0")}>
          <button type="button" onClick={() => fileRef.current?.click()} className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Lampirkan file"><Plus /></button>
          <div className="relative">
            <button type="button" onClick={() => setModelOpen((open) => !open)} className="flex max-w-40 items-center gap-1.5 truncate rounded-full px-2 py-1 text-xs font-semibold text-foreground/60 hover:bg-accent hover:text-foreground"><ModelIcon model={activeModel ?? null} /><MorphingText text={activeModel?.name ?? (modelsLoading ? "Memuat model…" : "Pilih model")} /></button>
            {modelOpen && <div className="absolute bottom-full left-0 z-50 mb-2 max-h-64 w-64 overflow-y-auto rounded-2xl border border-border bg-card p-1 shadow-xl">{models.map((model) => <button key={model.id} type="button" onClick={() => { onModelChange?.(model.id); setModelOpen(false); }} className={cn("flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs hover:bg-accent", model.id === activeModel?.id && "bg-primary/10")}><ModelIcon model={model} />{model.name}</button>)}</div>}
          </div>
          <button type="button" onClick={() => setEffort((current) => (current + 1) % efforts.length)} className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-foreground/60 hover:bg-accent" aria-label={`Effort ${efforts[effort]}`}><Bars level={efforts[effort]} /><MorphingText text={efforts[effort]} /></button>
          <div className="relative ml-auto"><button type="button" onClick={() => setToolOpen((open) => !open)} className="rounded-full px-2 py-1 text-xs text-muted-foreground hover:bg-accent">Tools</button>{toolOpen && <div className="absolute bottom-full right-0 z-50 mb-2 w-48 rounded-2xl border border-border bg-card p-1 shadow-xl">{tools.map((tool) => <button key={tool.id} type="button" onClick={() => { onToolChange?.(tool.id); setToolOpen(false); }} className="block w-full rounded-xl px-3 py-2 text-left text-xs hover:bg-accent">{tool.label}</button>)}</div>}</div>
        </div>
        <button type={isLoading ? "button" : "submit"} onClick={isLoading ? onStop : undefined} disabled={!isLoading && !hasContent} className="absolute bottom-2 right-2 z-20 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-40" aria-label={isLoading ? "Hentikan" : "Kirim pesan"}>
          {isLoading ? <span className="size-3 rounded-sm bg-current" /> : <ArrowUp />}
        </button>
      </div>
    </div>
  );
});

PromptInput.displayName = "PromptInput";
