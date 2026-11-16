import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import { Check, ChevronDown, Globe2, Mail, X } from "lucide-react";

export const Route = createFileRoute("/mellowmods/wink")({
  component: WinkPage,
  head: () => ({
    meta: [
      { title: "Wink SVIP · Galileo" },
      { name: "description", content: "Informasi fitur, ketentuan, dan panduan Wink SVIP." },
    ],
  }),
});

const copy = {
  id: {
    subtitle:
      "Selamat! Aplikasi Wink AI Anda telah di-unlocked ke versi SVIP. Pelajari fitur dan ketentuan penting di bawah ini agar aplikasi berjalan optimal.",
    update: "Cek Update Terbaru",
    features: "Fitur & Ketentuan",
    feature: "Fitur",
    mod: "Mod SVIP",
    free: "Gratis",
    tools: "Alat AI Video & Foto",
    toolsDesc: "Fitur AI khusus gambar, tidak mendukung pemrosesan video",
    unsupported: "Fitur yang bergantung pada server",
    unsupportedDesc: "Fitur ini mungkin gagal atau macet karena batasan server resmi.",
    server: "Fitur ini diproses oleh server resmi dan mungkin tidak tersedia di versi modifikasi.",
    uhd: "Membutuhkan koin/kredit server Wink sehingga tidak dapat diakses di versi ini.",
    rules: "Ketentuan & Panduan Penting",
    rulesDesc: "Simak aturan berikut agar penggunaan aplikasi bebas dari kendala",
    rule1: "Jangan Melakukan Login",
    rule1Desc:
      "Login akun Google, Email, atau FB dapat membuat akun terdeteksi menggunakan versi modifikasi atau memicu error.",
    rule2: "Fitur Unlocked vs Server",
    rule2Desc:
      "Fitur retouch SVIP tersedia. Fitur yang membutuhkan kredit diproses di server resmi.",
    rule3: "Matikan DNS & VPN",
    rule3Desc: "Jika mengalami kendala koneksi media, coba matikan VPN atau DNS khusus.",
    rule4: "Dilarang Diperjualbelikan",
    rule4Desc: "Aplikasi ini disediakan gratis. Dilarang menjualnya demi keuntungan pribadi.",
    faq: "Pertanyaan Umum",
    faqDesc: "Jawaban atas pertanyaan yang sering diajukan seputar Wink.",
    questions: [
      "Mengapa fitur UHD Video AI tidak bisa digunakan?",
      "Apakah harus login?",
      "Apakah aplikasi bisa digunakan tanpa VPN/DNS?",
    ],
    answers: [
      "Fitur UHD Video AI diproses langsung oleh server Wink dengan verifikasi kredit secara real-time, sehingga mungkin tidak tersedia di aplikasi modifikasi.",
      "Tidak perlu login untuk menggunakan fitur yang tersedia. Login dapat menimbulkan masalah pada aplikasi modifikasi.",
      "Aplikasi tidak memerlukan VPN atau DNS khusus. Jika koneksi bermasalah, periksa pengaturan jaringan.",
    ],
    lang: "Indonesia",
    cta: "Cek Update Terbaru",
    toast: "Bahasa diubah ke English",
  },
  en: {
    subtitle:
      "Your Wink AI app is now shown as SVIP. Review the feature notes and usage guidance below.",
    update: "Check Latest Updates",
    features: "Features & Terms",
    feature: "Feature",
    mod: "SVIP Mod",
    free: "Free",
    tools: "AI Photo & Video Tools",
    toolsDesc: "Image-focused AI tools; video processing may be unsupported",
    unsupported: "Server-dependent features",
    unsupportedDesc: "These features may fail or stall due to official server limitations.",
    server:
      "This feature is processed by official servers and may not be available in modified versions.",
    uhd: "Requires Wink server coins/credits and may not be available in this version.",
    rules: "Important Terms & Guidelines",
    rulesDesc: "Review these notes for a smoother experience.",
    rule1: "Avoid Logging In",
    rule1Desc:
      "Signing in with Google, email, or Facebook may flag a modified app or cause errors.",
    rule2: "Unlocked vs Server Features",
    rule2Desc:
      "SVIP retouch features are available. Credit-based features are processed by official servers.",
    rule3: "Disable Custom DNS or VPN",
    rule3Desc: "If media connections fail, try disabling VPN or custom DNS settings.",
    rule4: "Not for Resale",
    rule4Desc: "This app is provided free of charge. Do not resell it for personal profit.",
    faq: "Frequently Asked Questions",
    faqDesc: "Common questions about Wink.",
    questions: [
      "Why is UHD Video AI unavailable?",
      "Do I need to log in?",
      "Can I use the app without VPN/DNS?",
    ],
    answers: [
      "UHD Video AI is processed by Wink servers with real-time credit checks, so it may not be available in modified apps.",
      "You do not need to log in to use available features. Signing in may cause issues with modified apps.",
      "The app does not require a VPN or custom DNS. If the connection fails, check your network settings.",
    ],
    lang: "English",
    cta: "Check Latest Updates",
    toast: "Language switched to English",
  },
};

const featureNames = [
  "UHD AI Image",
  "Ultra HD Video",
  "AI Repair",
  "Unlimited",
  "Lifetime",
  "Unlocked",
];
const tools = ["AI Repair", "4K Quality", "Frame Interpolation", "Retouch AI"];
const showcase = [
  {
    title: "AI Repair Pro Video",
    src: "https://titan-img.meitudata.com/wink-cut/wink-static/web/task-index/ai_repair_pro_auto_oversea.mp4",
  },
  {
    title: "AI Video Generator",
    src: "https://wink.ai/_next/static/media/photo-to-video.0d9z36nxex8zh.mp4",
  },
  {
    title: "Video Enhance",
    src: "https://wink.ai/_next/static/media/ai-enhance-ai_v1.0nvyui7jf-9wa.mp4",
  },
  {
    title: "UHD Video AI",
    src: "https://wink.ai/_next/static/media/portrait.1o1q-p33xbv18.mp4",
    uhd: true,
  },
];

function WinkPage() {
  const [language, setLanguage] = useState<"id" | "en">("id");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const t = copy[language];
  const toggleLanguage = () => {
    const next = language === "id" ? "en" : "id";
    setLanguage(next);
    setToast(copy[next].toast);
    window.setTimeout(() => setToast(""), 2500);
  };

  return (
    <div className="wink-page">
      <style>{`
        .wink-page{--gold:#ffdbb8;--gold-deep:#f5bb89;--line:rgba(255,255,255,.17);min-height:100dvh;background:#080808;color:#fff;font-family:'Plus Jakarta Sans',ui-sans-serif,system-ui,sans-serif;line-height:1.55;padding-bottom:100px}
        .wink-page *{box-sizing:border-box}.wink-page a{color:inherit}.wink-bg{position:fixed;inset:0 0 auto;height:420px;pointer-events:none;background:radial-gradient(ellipse 60% 55% at 62% 0,rgba(255,197,143,.14),transparent 75%),radial-gradient(ellipse 50% 50% at 30% 8%,rgba(207,140,255,.08),transparent 70%)}
        .wink-shell{position:relative;z-index:1;width:min(100% - 32px,600px);margin:auto}.wink-header{position:sticky;top:0;z-index:5;background:rgba(8,8,8,.88);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}.wink-nav{height:56px;display:flex;align-items:center;justify-content:space-between}.wink-brand{display:flex;align-items:center}.wink-brand img{width:auto;height:24px;max-width:120px;object-fit:contain}.wink-nav-right{display:flex;align-items:center;gap:10px}.wink-status{width:84px;height:22px;object-fit:contain}.wink-lang{display:inline-flex;align-items:center;gap:7px;min-height:40px;padding:0 12px;border:1px solid var(--line);border-radius:999px;background:#ffffff0e;color:#fff;font-weight:600;cursor:pointer}.wink-hero{padding:42px 0 36px}.wink-hero-row{display:flex;align-items:center;gap:14px;margin-bottom:14px}.wink-icon{width:54px;height:54px;border-radius:15px;background:#151515;border:1px solid var(--line);object-fit:contain;padding:5px}.wink-title{font-size:clamp(1.65rem,5vw,2.05rem);line-height:1.2;letter-spacing:-.03em}.wink-subtitle{max-width:540px;color:rgba(255,255,255,.82);font-size:.96rem;margin:0 0 22px}.wink-actions{display:flex;flex-wrap:wrap;gap:10px}.wink-btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 18px;border-radius:999px;text-decoration:none;font-size:.88rem;font-weight:700;transition:filter .2s,transform .2s}.wink-btn:hover{filter:brightness(1.08);transform:translateY(-1px)}.wink-btn-primary{background:linear-gradient(94deg,#fff0db,var(--gold),var(--gold-deep));color:#340d05!important}.wink-btn-secondary{border:1px solid var(--line);background:#ffffff0e}.wink-section{margin:0 0 38px}.wink-heading{font-size:1.2rem;letter-spacing:-.015em;margin:0 0 5px}.wink-desc{font-size:.875rem;color:rgba(255,255,255,.64);margin:0 0 16px}.wink-card{border:1px solid var(--line);border-radius:20px;background:rgba(255,255,255,.045);overflow:hidden}.wink-grid{display:grid;grid-template-columns:2fr 1fr 1fr}.wink-cell{min-height:48px;padding:11px 9px;border-bottom:1px solid #ffffff20;border-right:1px solid var(--line);display:flex;align-items:center;justify-content:center;text-align:center;font-size:.82rem}.wink-cell:nth-child(3n){border-right:0}.wink-cell:nth-last-child(-n+3){border-bottom:0}.wink-cell-head{color:#ffffffd4;font-weight:700}.wink-cell-label{justify-content:flex-start;text-align:left;padding-left:14px;color:#ffffffd4}.wink-check{color:var(--gold);width:17px;height:17px}.wink-cross{color:#aaa;width:17px;height:17px}.wink-tools{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.wink-tool{padding:14px;border:1px solid var(--line);border-radius:13px;background:#ffffff0b;font-weight:600}.wink-showcase{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.wink-video-card{position:relative;height:230px;border:1px solid var(--line);border-radius:16px;overflow:hidden;background:#121212}.wink-video-card video{width:100%;height:100%;object-fit:cover}.wink-video-shade{position:absolute;inset:35% 0 0;background:linear-gradient(transparent,rgba(0,0,0,.92));pointer-events:none}.wink-video-caption{position:absolute;bottom:0;padding:14px}.wink-video-caption h3{font-size:.95rem;margin:0 0 4px}.wink-video-caption p{font-size:.79rem;color:#ffffffc9;margin:0}.wink-rules{padding:4px 20px}.wink-rule{padding:17px 0;border-bottom:1px solid var(--line)}.wink-rule:last-child{border-bottom:0}.wink-rule-title{font-weight:700}.wink-rule-title span{display:inline-block;margin-right:10px;padding:1px 7px;border-radius:5px;background:linear-gradient(94deg,#fff0db,var(--gold),var(--gold-deep));color:#2e1e11;font-size:.75rem}.wink-rule p{margin:6px 0 0;color:#ffffffd4;font-size:.88rem}.wink-faq{padding:2px 20px}.wink-faq-item+ .wink-faq-item{border-top:1px solid var(--line)}.wink-question{width:100%;min-height:58px;display:flex;align-items:center;justify-content:space-between;gap:12px;background:transparent;border:0;color:#fff;text-align:left;font:inherit;font-weight:650;cursor:pointer}.wink-question svg{flex:none;color:var(--gold);transition:transform .2s}.wink-question[aria-expanded=true] svg{transform:rotate(180deg)}.wink-answer{padding:0 30px 16px 0;color:#ffffffd0;font-size:.875rem}.wink-footer{padding:24px 0 18px;border-top:1px solid var(--line);text-align:center;color:#ffffff9c;font-size:.8rem}.wink-footer-links{display:flex;justify-content:center;gap:14px;margin:15px 0}.wink-footer-link{width:42px;height:42px;display:grid;place-items:center;border:1px solid var(--line);border-radius:50%;text-decoration:none}.wink-bottom{position:fixed;bottom:0;left:50%;z-index:4;transform:translateX(-50%);width:min(100%,600px);padding:20px 16px calc(16px + env(safe-area-inset-bottom));background:linear-gradient(transparent,#080808 45%)}.wink-bottom a{width:100%;box-shadow:0 8px 24px #0009}.wink-toast{position:fixed;z-index:10;left:50%;bottom:90px;transform:translateX(-50%);padding:10px 18px;border-radius:12px;background:#fff;color:#222;font-size:.85rem;font-weight:650;box-shadow:0 10px 30px #0009}.wink-page :focus-visible{outline:3px solid var(--gold);outline-offset:3px}@media(max-width:480px){.wink-shell{width:calc(100% - 32px)}.wink-showcase{grid-template-columns:1fr}.wink-video-card{height:220px}.wink-hero{padding-top:32px}.wink-tools{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:360px){.wink-cell{font-size:.74rem;padding:9px 5px}.wink-cell-label{padding-left:9px}.wink-tools{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){.wink-page *{scroll-behavior:auto!important;transition:none!important}}
      `}</style>
      <div className="wink-bg" aria-hidden="true" />
      <header className="wink-header">
        <div className="wink-shell wink-nav">
          <a
            className="wink-brand"
            href="https://galileomodapk.visora.my.id/apps/u0uhNBdV42GhQYMIBfTSR4"
            aria-label="Wink AI home"
          >
            <img
              src="https://wink.ai/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fwink-logo.1t5zv4bl2o1d9.png&w=384&q=75"
              alt="Wink AI"
            />
          </a>
          <div className="wink-nav-right">
            <img
              className="wink-status"
              src="https://wink-assets-berry.edgeone.dev/modular_vip__ic_vip_log_text_icon_svip.webp"
              alt="SVIP"
            />
            <button className="wink-lang" onClick={toggleLanguage} type="button">
              <Globe2 size={16} aria-hidden="true" />
              {language.toUpperCase()}
            </button>
          </div>
        </div>
      </header>
      <main className="wink-shell">
        <section className="wink-hero">
          <div className="wink-hero-row">
            <img
              className="wink-icon"
              src="https://wink.ai/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo.19dd7_w20-ka_.png&w=1080&q=75"
              alt="Wink app icon"
            />
            <h1 className="wink-title">Wink SVIP Activated</h1>
          </div>
          <p className="wink-subtitle">{t.subtitle}</p>
          <div className="wink-actions">
            <a
              className="wink-btn wink-btn-primary"
              href="https://galileomodapk.visora.my.id/apps/u0uhNBdV42GhQYMIBfTSR4"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.update}
            </a>
            <a className="wink-btn wink-btn-secondary" href="#rules-section">
              {t.features}
            </a>
          </div>
        </section>
        <section className="wink-section" aria-label="Feature comparison">
          <div className="wink-card">
            <div className="wink-grid">
              <div className="wink-cell wink-cell-head wink-cell-label">{t.feature}</div>
              <div className="wink-cell wink-cell-head">{t.mod}</div>
              <div className="wink-cell wink-cell-head">{t.free}</div>
              {featureNames.map((name) => (
                <Fragment key={name}>
                  <div className="wink-cell wink-cell-label">{name}</div>
                  <div className="wink-cell">
                    <Check className="wink-check" aria-label="Included" />
                  </div>
                  <div className="wink-cell">
                    <X className="wink-cross" aria-label="Not included" />
                  </div>
                </Fragment>
              ))}
            </div>
          </div>
        </section>
        <section className="wink-section">
          <h2 className="wink-heading">{t.tools}</h2>
          <p className="wink-desc">{t.toolsDesc}</p>
          <div className="wink-tools">
            {tools.map((tool) => (
              <div className="wink-tool" key={tool}>
                {tool}
              </div>
            ))}
          </div>
        </section>
        <section className="wink-section">
          <h2 className="wink-heading">{t.unsupported}</h2>
          <p className="wink-desc">{t.unsupportedDesc}</p>
          <div className="wink-showcase">
            {showcase.map((item) => (
              <article className="wink-video-card" key={item.title}>
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="none"
                  src={item.src}
                  aria-label={item.title}
                />
                <div className="wink-video-shade" />
                <div className="wink-video-caption">
                  <h3>{item.title}</h3>
                  <p>{item.uhd ? t.uhd : t.server}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="wink-section" id="rules-section">
          <h2 className="wink-heading">{t.rules}</h2>
          <p className="wink-desc">{t.rulesDesc}</p>
          <div className="wink-card wink-rules">
            {[t.rule1, t.rule2, t.rule3, t.rule4].map((title, i) => (
              <article className="wink-rule" key={title}>
                <div className="wink-rule-title">
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  {title}
                </div>
                <p>{[t.rule1Desc, t.rule2Desc, t.rule3Desc, t.rule4Desc][i]}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="wink-section">
          <h2 className="wink-heading">{t.faq}</h2>
          <p className="wink-desc">{t.faqDesc}</p>
          <div className="wink-card wink-faq">
            {t.questions.map((question, i) => (
              <div className="wink-faq-item" key={question}>
                <button
                  className="wink-question"
                  type="button"
                  aria-expanded={openFaq === i}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span>{question}</span>
                  <ChevronDown size={19} aria-hidden="true" />
                </button>
                {openFaq === i && <div className="wink-answer">{t.answers[i]}</div>}
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer className="wink-footer">
        <div className="wink-shell">
          <button className="wink-lang" type="button" onClick={toggleLanguage}>
            <Globe2 size={16} aria-hidden="true" />
            {t.lang}
          </button>
          <div className="wink-footer-links">
            <a
              className="wink-footer-link"
              href="mailto:galileo@visora.my.id"
              aria-label="Email support"
            >
              <Mail size={17} aria-hidden="true" />
            </a>
          </div>
          <div>© GMA Corp. All Rights Reserved. Modded & Maintained by Galileo Mod APK</div>
        </div>
      </footer>
      <div className="wink-bottom">
        <a
          className="wink-btn wink-btn-primary"
          href="https://galileomodapk.visora.my.id/apps/u0uhNBdV42GhQYMIBfTSR4"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t.cta}
        </a>
      </div>
      {toast && (
        <div className="wink-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
