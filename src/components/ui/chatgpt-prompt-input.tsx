import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AI_PLUGINS, pluginById, type AiPluginId } from "@/lib/ai-plugins";
import { BUILTIN_MODELS, modelById, type AiModel } from "@/lib/ai-models";
import { NewBadge } from "@/components/NewBadge";


type ClassValue = string | number | boolean | null | undefined;
function cn(...inputs: ClassValue[]): string {
  return inputs.filter(Boolean).join(" ");
}

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & { showArrow?: boolean }
>(({ className, sideOffset = 4, showArrow = false, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "relative z-50 max-w-[280px] rounded-md bg-popover px-1.5 py-1 text-xs text-popover-foreground animate-in fade-in-0 zoom-in-95",
        className,
      )}
      {...props}
    >
      {props.children}
      {showArrow && <TooltipPrimitive.Arrow className="-my-px fill-popover" />}
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-64 rounded-xl bg-popover p-2 text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95",
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

const Dialog = DialogPrimitive.Root;
const DialogPortal = DialogPrimitive.Portal;
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/60 backdrop-blur-sm", className)}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-[90vw] translate-x-[-50%] translate-y-[-50%] gap-4 border-none bg-transparent p-0 shadow-none md:max-w-[800px]",
        className,
      )}
      {...props}
    >
      <div className="relative overflow-hidden rounded-[28px] bg-card p-1 shadow-2xl">
        {children}
        <DialogPrimitive.Close className="absolute right-3 top-3 z-10 rounded-full bg-background/50 p-1 transition-all hover:bg-accent">
          <XIcon className="h-5 w-5 text-muted-foreground" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </div>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M12 5V19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M5 12H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const Settings2Icon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    {...props}
  >
    <path d="M20 7h-9" />
    <path d="M14 17H5" />
    <circle cx="17" cy="17" r="3" />
    <circle cx="7" cy="7" r="3" />
  </svg>
);
const SendIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M12 5.25L12 18.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path
      d="M18.75 12L12 5.25L5.25 12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    {...props}
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const GlobeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);
const PencilIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    {...props}
  >
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </svg>
);
const LightbulbIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path
      d="M12 7C9.23858 7 7 9.23858 7 12C7 13.3613 7.54402 14.5955 8.42651 15.4972C8.77025 15.8484 9.05281 16.2663 9.14923 16.7482L9.67833 19.3924C9.86537 20.3272 10.6862 21 11.6395 21H12.3605C13.3138 21 14.1346 20.3272 14.3217 19.3924L14.8508 16.7482C14.9472 16.2663 15.2297 15.8484 15.5735 15.4972C16.456 14.5955 17 13.3613 17 12C17 9.23858 14.7614 7 12 7Z"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path d="M12 4V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M10 17H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const StopIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);
const SparkIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 2l1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9L12 2zm6.5 12l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9.9-2.4z" />
  </svg>
);
const ChevronIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const toolsList = [


  { id: "searchWeb", name: "Cari di web", shortName: "Search", icon: GlobeIcon },
  { id: "writeCode", name: "Tulis atau ngoding", shortName: "Write", icon: PencilIcon },
  { id: "thinkLonger", name: "Berpikir lebih lama", shortName: "Think", icon: LightbulbIcon },
];

export interface PromptBoxProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  isLoading?: boolean;
  /** Optional controlled image (data URL) so the parent can send it with the message. */
  image?: string | null;
  onImageChange?: (dataUrl: string | null) => void;
  document?: { name: string; text: string } | null;
  onDocumentChange?: (document: { name: string; text: string } | null) => void;
  /** Notifies the parent which tool the user picked (searchWeb | writeCode | thinkLonger). */
  onToolChange?: (toolId: string | null) => void;
  /** Called when the user aborts a streaming response. */
  onStop?: () => void;
  /** Plugin aktif (dipilih lewat "@"). */
  plugin?: AiPluginId | null;
  onPluginChange?: (id: AiPluginId | null) => void;
  /** Daftar model yang bisa dipilih + model aktif. */
  models?: AiModel[];
  modelId?: string;
  onModelChange?: (id: string) => void;
  /** Dipakai supaya komponen bisa membersihkan karakter "@" dari teks. */
  onValueChange?: (value: string) => void;
}


export const PromptBox = React.forwardRef<HTMLTextAreaElement, PromptBoxProps>(
  (
    {
      className,
      isLoading,
      value: controlledValue,
      onChange,
      image,
      onImageChange,
      document,
      onDocumentChange,
      onToolChange,
      onStop,
      plugin,
      onPluginChange,
      models,
      modelId,
      onModelChange,

      onValueChange,
      ...props
    },
    ref,
  ) => {
    const internalTextareaRef = React.useRef<HTMLTextAreaElement>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [innerValue, setInnerValue] = React.useState("");
    const value = controlledValue !== undefined ? String(controlledValue) : innerValue;
    const [innerImage, setInnerImage] = React.useState<string | null>(null);
    const imagePreview = image !== undefined ? image : innerImage;
    const setImagePreview = (v: string | null) => {
      if (image === undefined) setInnerImage(v);
      onImageChange?.(v);
    };
    const [selectedTool, setSelectedToolState] = React.useState<string | null>(null);
    const setSelectedTool = (id: string | null) => {
      setSelectedToolState(id);
      onToolChange?.(id);
    };
    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
    const [isImageDialogOpen, setIsImageDialogOpen] = React.useState(false);
    const [pluginMenuOpen, setPluginMenuOpen] = React.useState(false);
    const activePlugin = pluginById(plugin ?? null);
    const [isModelOpen, setIsModelOpen] = React.useState(false);
    const modelList = models && models.length > 0 ? models : BUILTIN_MODELS;
    const activeModel = modelById(modelId, modelList);


    React.useImperativeHandle(ref, () => internalTextareaRef.current!, []);

    React.useLayoutEffect(() => {
      const textarea = internalTextareaRef.current;
      if (textarea) {
        textarea.style.height = "auto";
        textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
      }
    }, [value]);

    function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
      const next = e.target.value;
      // Ketik "@" (di awal atau setelah spasi) → tampilkan daftar plugin.
      const grew = next.length > value.length;
      const atTrigger = grew && next.endsWith("@") && /(^|\s)@$/.test(next);
      if (atTrigger) setPluginMenuOpen(true);
      else if (!next.trimEnd().endsWith("@")) setPluginMenuOpen(false);
      if (controlledValue === undefined) setInnerValue(next);
      onChange?.(e);
    }

    function pickPlugin(id: AiPluginId) {
      setPluginMenuOpen(false);
      onPluginChange?.(id);
      const cleaned = value.replace(/(^|\s)@$/, "");
      if (controlledValue === undefined) setInnerValue(cleaned);
      onValueChange?.(cleaned);
      internalTextareaRef.current?.focus();
    }


    function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
      const file = event.target.files?.[0];
      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
      } else if (file) {
        if (file.size > 8_000_000) {
          event.target.value = "";
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          const text = typeof reader.result === "string" ? reader.result.slice(0, 4_000_000) : "";
          onDocumentChange?.({ name: file.name, text });
        };
        reader.readAsText(file);
      }
      event.target.value = "";
    }

    function handleRemoveImage(e: React.MouseEvent<HTMLButtonElement>) {
      e.stopPropagation();
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }

    const hasValue = value.trim().length > 0 || !!imagePreview || !!document;
    const activeTool = selectedTool ? toolsList.find((t) => t.id === selectedTool) : null;
    const ActiveToolIcon = activeTool?.icon;

    return (
      <div
        className={cn(
          "m3-shadow-1 relative flex cursor-text flex-col rounded-[28px] border border-border/60 bg-card p-2 transition-colors",
          className,
        )}
      >
        {pluginMenuOpen && (
          <>
            <button
              type="button"
              aria-label="Tutup daftar plugin"
              onClick={() => setPluginMenuOpen(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <div className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-[24px] border border-border/60 bg-card p-2 shadow-xl duration-150 animate-in fade-in slide-in-from-bottom-2">
              {AI_PLUGINS.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => pickPlugin(p.id)}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent"
                  >
                    <Icon className="size-5 shrink-0 text-muted-foreground" />
                    <span className="font-medium">{p.name}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,.txt,.md,.csv,.json,.xml,.html,.css,.js,.ts,.tsx,.jsx,.py,.java,.c,.cpp,.sql,.log"
        />


        {imagePreview && (
          <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
            <div className="relative mb-1 w-fit rounded-[1rem] px-1 pt-1">
              <button type="button" onClick={() => setIsImageDialogOpen(true)}>
                <img
                  src={imagePreview}
                  alt="Pratinjau gambar"
                  className="h-14 w-14 rounded-[1rem] object-cover"
                />
              </button>
              <button
                onClick={handleRemoveImage}
                type="button"
                className="absolute right-2 top-2 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-background/70 text-foreground transition-colors hover:bg-accent"
                aria-label="Hapus gambar"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            <DialogContent>
              <img
                src={imagePreview}
                alt="Pratinjau penuh"
                className="max-h-[95vh] w-full rounded-[24px] object-contain"
              />
            </DialogContent>
          </Dialog>
        )}

        {document && (
          <div className="mx-1 mb-1 flex items-center justify-between rounded-2xl bg-surface-variant px-3 py-2 text-sm">
            <span className="min-w-0 truncate">{document.name}</span>
            <button type="button" onClick={() => onDocumentChange?.(null)} aria-label="Hapus dokumen" className="ml-2 rounded-full p-1 hover:bg-accent">
              <XIcon className="size-4" />
            </button>
          </div>
        )}

        {activePlugin && (
          <div className="px-2 pt-1">
            <button
              type="button"
              onClick={() => onPluginChange?.(null)}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <activePlugin.icon className="size-4" />
              {activePlugin.name}
              <XIcon className="size-3.5 opacity-70" />
            </button>
          </div>
        )}

        <textarea

          ref={internalTextareaRef}
          rows={1}
          value={value}
          onChange={handleInputChange}
          placeholder="Tulis pesan..."
          className="min-h-12 w-full resize-none border-0 bg-transparent p-3 text-foreground outline-none placeholder:text-muted-foreground focus:ring-0 focus-visible:outline-none"
          {...props}
        />

        <div className="mt-0.5 p-1 pt-0">
          <TooltipProvider delayDuration={100}>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent"
                  >
                    <PlusIcon className="h-6 w-6" />
                    <span className="sr-only">Lampirkan file</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" showArrow>
                  <p>Lampirkan gambar atau dokumen teks</p>
                </TooltipContent>
              </Tooltip>

              <Popover open={isModelOpen} onOpenChange={setIsModelOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex h-8 min-w-0 items-center gap-1.5 rounded-full bg-surface-variant px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-primary-container"
                  >
                    {activeModel.logo ? (
                      <img src={activeModel.logo} alt="" className="size-4 rounded-full object-cover" />
                    ) : (
                      <SparkIcon className="size-4 text-primary" />
                    )}
                    <span className="max-w-[8.5rem] truncate">{activeModel.name}</span>
                    {activeModel.isNew && <NewBadge className="hidden sm:inline-flex" />}
                    <ChevronIcon className="size-3.5 opacity-60" />
                    <span className="sr-only">Pilih model AI</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent side="top" align="start" className="w-[19rem]">
                  <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
                    {modelList.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          onModelChange?.(m.id);
                          setIsModelOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-start gap-2.5 rounded-xl p-2 text-left transition-colors hover:bg-accent",
                          m.id === activeModel.id && "bg-primary/10",
                        )}
                      >
                        {m.logo ? (
                          <img src={m.logo} alt="" className="mt-0.5 size-5 rounded-full object-cover" />
                        ) : (
                          <SparkIcon className="mt-0.5 size-5 text-primary" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                            {m.name}
                            {m.isNew && <NewBadge />}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {m.tagline}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex h-8 items-center gap-2 rounded-full p-2 text-sm text-foreground transition-colors hover:bg-accent"
                      >
                        <Settings2Icon className="h-4 w-4" />
                        {!selectedTool && "Tools"}
                      </button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top" showArrow>
                    <p>Jelajahi Tools</p>
                  </TooltipContent>
                </Tooltip>
                <PopoverContent side="top" align="start">
                  <div className="flex flex-col gap-1">
                    {toolsList.map((tool) => (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => {
                          setSelectedTool(tool.id);
                          setIsPopoverOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-accent"
                      >
                        <tool.icon className="h-4 w-4" />
                        <span>{tool.name}</span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {activeTool && (
                <>
                  <div className="h-4 w-px bg-border" />
                  <button
                    type="button"
                    onClick={() => setSelectedTool(null)}
                    className="flex h-8 cursor-pointer flex-row items-center justify-center gap-2 rounded-full px-2 text-sm text-primary transition-colors hover:bg-accent"
                  >
                    {ActiveToolIcon && <ActiveToolIcon className="h-4 w-4" />}
                    {activeTool.shortName}
                    <XIcon className="h-4 w-4" />
                  </button>
                </>
              )}

              <div className="ml-auto flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type={isLoading ? "button" : "submit"}
                      onClick={isLoading ? onStop : undefined}
                      disabled={!isLoading && !hasValue}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-40"
                    >
                      {isLoading ? (
                        <StopIcon className="h-4 w-4" />
                      ) : (
                        <SendIcon className="h-6 w-6" />
                      )}
                      <span className="sr-only">{isLoading ? "Hentikan" : "Kirim pesan"}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" showArrow>
                    <p>{isLoading ? "Hentikan" : "Kirim"}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </TooltipProvider>
        </div>
      </div>
    );
  },
);
PromptBox.displayName = "PromptBox";
