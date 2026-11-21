/* standalone bypass-only: no yt-dlp deps, no sfile download */
const API_BASE = "";
const API = {
  session: "/api/session",
  logout: "/api/logout",
  googleConfig: "/api/auth/google/config",
  googleLogin: "/api/auth/google",
  jobs: "/api/jobs",
  status: "/status",
  adminResolvers: "/api/admin/resolvers",
  coinBalance: "/api/coins/balance",
  coinCosts: "/api/coins/costs",
  coinTelegram: "/api/coins/telegram",
  refundOnFail: "/api/admin/settings/refund_on_fail",
  allowSignup: "/api/admin/settings/allow_signup",
  freeCoins: "/api/admin/settings/free_coins",
  theme: "/api/user/theme",
  announcement: "/api/announcement",
  adminAnnouncement: "/api/admin/settings/announcement",
};

// Device signal: stable per browser+device, survives logout/incognito/clear-site-data.
// Purpose: a second account from the SAME device gets 0 coins instead of 10,
// regardless of IP changes (proxy, VPN, CGNAT). Computed from browser properties
// only - nothing is stored client-side.
function _deviceId(){
  var t = [
    navigator.userAgent   || "",
    navigator.language    || "",
    navigator.platform    || "",
    (navigator.hardwareConcurrency || 0),
    (navigator.maxTouchPoints || 0),
    screen.width + "x" + screen.height + "x" + (screen.colorDepth || 0),
    (new Date().getTimezoneOffset())
  ].join("|");
  var h1 = 0x811c9dc5, h2 = 0x1000193;
  for(var i=0;i<t.length;i++){
    var c = t.charCodeAt(i);
    h1 = ((h1 ^ c) * 16777619) >>> 0;
    h2 = ((h2 + c) * 31 + i) >>> 0;
  }
  return (h1.toString(16).padStart(8,"0") + h2.toString(16).padStart(8,"0"));
}

// ponytail: extend _JOB_ERRORS whenever a new backend or a new error code
// appears. Public errors never leak raw API strings â€” the fallback picks copy
// by status code, so every job surfaces a readable Indonesian message.
const _BACKEND_NAMES = {
  sfgl: "sf.gl", bicolink: "Bicolink", pndk: "PNDK", move2link: "Move2Link",
  nypass: "NYPass", adsafelink: "Adsafelink", sub2unlock: "Sub2Unlock",
  sub4: "Sub4Unlock", link2unlock: "Link2Unlock", shrinkme: "ShrinkMe",
  ouo: "ouo.io", link4sub: "Link4Sub", linkvertise: "Linkvertise",
  lootlabs: "LootLabs", chain: "Rantai",
  zflexlink: "zFlexLink", adlinksumo: "Adlinksumo",
  arahlink: "ArahLink",
  platorelay: "PlatoRelay",
};

// Engines shown on the hero strip, in display order. Generated markup (see
// supportedStripHtml) so a resolver can never be registered in app.js and
// still be missing from the homepage. nypass is deprecated: hidden there.
const SUPPORTED_ENGINES = ["sfgl","bicolink","move2link","pndk","sub4","sub2unlock","link2unlock","adsafelink","shrinkme","ouo","link4sub","linkvertise","lootlabs","zflexlink","adlinksumo","arahlink","platorelay"];
function supportedStripHtml(){
  const newest = SUPPORTED_ENGINES[SUPPORTED_ENGINES.length-1];
  return SUPPORTED_ENGINES.map(b=>{
    const label = _BACKEND_NAMES[b] || b;
    return b===newest ? `<b>${label}</b> <span class="new-pill">new</span>` : label;
  }).join(' <i>Â·</i> ');
}

// Generic copy per status code, used when (backend|status) has no entry.
// Shape is {t: judul singkat, d: penjelasan + apa yang harus dilakukan}.
const _STATUS_GENERIC = {
  400: {
    t: "Format link salah",
    d: "Alamat link tidak cocok dengan format situs aslinya. Periksa lagi, pastikan link disalin utuh dari sumbernya.",
  },
  402: {
    t: "Link terkunci",
    d: "Pembuat link memasang syarat pembayaran atau langganan sebelum link bisa dibuka, jadi tidak bisa dibuka otomatis.",
  },
  403: {
    t: "Link butuh verifikasi",
    d: "Situs asal memblokir akses karena terdeteksi bot atau memerlukan verifikasi tambahan. Coba lagi beberapa menit kemudian.",
  },
  404: {
    t: "Link tidak ditemukan",
    d: "Link ini sudah tidak aktif â€” mungkin kedaluwarsa, dihapus, atau salah ketik. Minta link baru ke pembuatnya.",
  },
  408: {
    t: "Server link terlalu lama merespons",
    d: "Situs asal tidak menjawab tepat waktu. Coba lagi beberapa saat lagi.",
  },
  410: {
    t: "Link berputar tanpa tujuan",
    d: "Link ini hanya memutar iklan dan tidak pernah mengarah ke berkas tujuan. Minta link baru ke pembuatnya.",
  },
  502: {
    t: "Server link sedang bermasalah",
    d: "Situs asli menolak permintaan atau sedang tidak bisa diakses. Coba lagi nanti.",
  },
  503: {
    t: "Layanan sedang gangguan",
    d: "Fitur ini sedang dinonaktifkan atau dalam perbaikan. Coba lagi nanti.",
  },
};

const _JOB_ERRORS = {
  // 400: format link salah
  "sfgl|400": { t: "Format link salah", d: "Format URL sf.gl tidak sesuai. Gunakan format https://sfl.gl/xxx." },
  "bicolink|400": { t: "Format link salah", d: "Format URL Bicolink tidak sesuai. Gunakan format https://bicolink.com/xxx atau https://bicolink.com/al/xxx." },
  "move2link|400": { t: "Format link salah", d: "Format URL Move2Link tidak sesuai. Gunakan format https://move2link.co/xxx." },
  "sub4|400": { t: "Format link salah", d: "Format URL Sub4 tidak sesuai. Pastikan format https://sub4unlock.co/xxx." },
  "sub2unlock|400": { t: "Format link salah", d: "Format URL Sub2Unlock tidak sesuai. Pastikan link disalin utuh dari sumbernya." },
  "link2unlock|400": { t: "Format link salah", d: "Format URL Link2Unlock tidak sesuai. Pastikan link disalin utuh dari sumbernya." },
  "pndk|400": { t: "Format link salah", d: "Format URL PNDK tidak sesuai. Pastikan link disalin utuh dari sumbernya." },
  "adsafelink|400": { t: "Format link salah", d: "Format URL Adsafelink tidak sesuai. Pastikan link disalin utuh dari sumbernya." },
  "adlinksumo|400": { t: "Format link salah", d: "Format URL Adlinksumo tidak sesuai. Pastikan link disalin utuh dari sumbernya." },
  "ouo|400": { t: "Format link salah", d: "Format URL ouo.io tidak sesuai. Gunakan format https://ouo.io/xxx." },
  "shrinkme|400": { t: "Format link salah", d: "Format URL ShrinkMe tidak sesuai. Pastikan link disalin utuh dari sumbernya." },
  "nypass|400": { t: "Format link salah", d: "Format URL NYPass tidak sesuai. Pastikan link disalin utuh dari sumbernya." },
  "link4sub|400": { t: "Format link salah", d: "Format URL Link4Sub tidak sesuai. Pastikan link disalin utuh dari sumbernya." },
  "linkvertise|400": { t: "Format link salah", d: "Format URL Linkvertise tidak sesuai. Pastikan link disalin utuh dari sumbernya." },
  "lootlabs|400": { t: "Format link salah", d: "Format URL LootLabs tidak sesuai. Pastikan link disalin utuh dari sumbernya." },
  "chain|400": { t: "Format link salah", d: "Salah satu hop dalam rantai memiliki URL yang tidak valid. Periksa kembali semua link." },
  "zflexlink|400": { t: "Format link salah", d: "Format URL zFlexLink tidak sesuai. Gunakan format https://zflexlink.com/xxx." },
  "arahlink|400": { t: "Format link salah", d: "Format URL ArahLink tidak sesuai. Gunakan format https://arahlink.com/xxx." },
  "platorelay|400": { t: "Format link salah", d: "Format URL PlatoRelay tidak sesuai. Gunakan format https://auth.platorelay.com/a?d=..." },
  // 402: link terkunci / berbayar
  "move2link|402": { t: "Link terkunci", d: "Link ini terkunci oleh pemiliknya di Move2Link dan memerlukan akses berbayar." },
  "chain|402": { t: "Link terkunci", d: "Salah satu hop dalam rantai memerlukan pembayaran untuk dilanjutkan." },
  // 403: butuh verifikasi / diblokir
  "sfgl|403": { t: "Link butuh verifikasi", d: "Situs perantara shorturl.at sedang memblokir server ini. Coba lagi beberapa menit kemudian atau tempel langsung link sfl.gl-nya." },
  "bicolink|403": { t: "Link butuh verifikasi", d: "Bicolink memblokir permintaan ini karena terdeteksi sebagai bot. Coba lagi beberapa menit kemudian." },
  "move2link|403": { t: "Link butuh verifikasi", d: "Move2Link diblokir Cloudflare untuk server ini. Coba lagi beberapa menit kemudian." },
  "sub4|403": { t: "Link butuh verifikasi", d: "Sub4 memblokir permintaan ini. Coba lagi beberapa menit kemudian." },
  "sub2unlock|403": { t: "Link butuh verifikasi", d: "Sub2Unlock memerlukan verifikasi manual. Coba lagi nanti." },
  "link2unlock|403": { t: "Link butuh verifikasi", d: "Link2Unlock memerlukan verifikasi manual. Coba lagi nanti." },
  "adsafelink|403": { t: "Link butuh verifikasi", d: "Adsafelink memerlukan verifikasi. Coba lagi beberapa menit kemudian." },
  "adlinksumo|403": { t: "Link butuh verifikasi", d: "Adlinksumo diblokir Cloudflare untuk server ini (proxy egress). Coba lagi beberapa menit kemudian." },
  "ouo|403": { t: "Link butuh verifikasi", d: "ouo.io meminta verifikasi manusia. Coba lagi nanti." },
  "pndk|403": { t: "Link butuh verifikasi", d: "PNDK memblokir karena deteksi bot (Cloudflare). Coba lagi beberapa menit kemudian." },
  "shrinkme|403": { t: "Link butuh verifikasi", d: "ShrinkMe memblokir permintaan ini karena terdeteksi bot. Coba lagi beberapa menit kemudian." },
  "chain|403": { t: "Link butuh verifikasi", d: "Salah satu hop dalam rantai diblokir. Coba lagi beberapa menit kemudian." },
  // 404: link tidak ditemukan
  "sfgl|404": { t: "Link tidak ditemukan", d: "Link sf.gl tidak ditemukan atau sudah kedaluwarsa. Minta link baru ke pembuatnya." },
  "bicolink|404": { t: "Link tidak ditemukan", d: "Link Bicolink tidak ditemukan atau sudah kedaluwarsa. Minta link baru ke pembuatnya." },
  "move2link|404": { t: "Link tidak ditemukan", d: "Link Move2Link tidak ditemukan atau sudah kedaluwarsa. Minta link baru ke pembuatnya." },
  "sub4|404": { t: "Link tidak ditemukan", d: "Link Sub4 tidak ditemukan atau sudah kedaluwarsa. Minta link baru ke pembuatnya." },
  "sub2unlock|404": { t: "Link tidak ditemukan", d: "Link Sub2Unlock tidak ditemukan atau sudah kedaluwarsa. Minta link baru ke pembuatnya." },
  "link2unlock|404": { t: "Link tidak ditemukan", d: "Link Link2Unlock tidak ditemukan atau sudah kedaluwarsa. Minta link baru ke pembuatnya." },
  "adsafelink|404": { t: "Link tidak ditemukan", d: "Link Adsafelink tidak ditemukan atau sudah kedaluwarsa. Minta link baru ke pembuatnya." },
  "adlinksumo|404": { t: "Link tidak ditemukan", d: "Link Adlinksumo tidak ditemukan atau sudah kedaluwarsa. Minta link baru ke pembuatnya." },
  "ouo|404": { t: "Link tidak ditemukan", d: "Link ouo.io tidak ditemukan atau sudah kedaluwarsa. Minta link baru ke pembuatnya." },
  "shrinkme|404": { t: "Link tidak ditemukan", d: "Link ShrinkMe tidak ditemukan atau sudah kedaluwarsa. Minta link baru ke pembuatnya." },
  "link4sub|404": { t: "Link tidak ditemukan", d: "Link Link4Sub tidak ditemukan atau sudah kedaluwarsa. Minta link baru ke pembuatnya." },
  "linkvertise|404": { t: "Link tidak ditemukan", d: "Link Linkvertise tidak ditemukan atau sudah kedaluwarsa. Minta link baru ke pembuatnya." },
  "lootlabs|404": { t: "Link tidak ditemukan", d: "Link LootLabs tidak ditemukan atau sudah kedaluwarsa. Minta link baru ke pembuatnya." },
  "zflexlink|404": { t: "Link tidak ditemukan", d: "Link zFlexLink tidak aktif atau sudah kedaluwarsa. Minta link baru ke pembuatnya." },
  "arahlink|404": { t: "Link tidak ditemukan", d: "Link ArahLink tidak aktif atau sudah kedaluwarsa. Minta link baru ke pembuatnya." },
  "platorelay|404": { t: "Link tidak ditemukan", d: "Ticket PlatoRelay tidak ditemukan atau sudah terpakai. Minta link baru ke pembuatnya." },
  // 408: server link terlalu lama merespons
  "sfgl|408": { t: "Server link terlalu lama merespons", d: "sf.gl tidak menjawab tepat waktu. Coba lagi beberapa saat lagi." },
  "bicolink|408": { t: "Server link terlalu lama merespons", d: "Bicolink tidak menjawab tepat waktu. Coba lagi beberapa saat lagi." },
  "move2link|408": { t: "Server link terlalu lama merespons", d: "Move2Link tidak menjawab tepat waktu. Coba lagi beberapa saat lagi." },
  "sub4|408": { t: "Server link terlalu lama merespons", d: "Sub4 tidak menjawab tepat waktu. Coba lagi beberapa saat lagi." },
  "sub2unlock|408": { t: "Server link terlalu lama merespons", d: "Sub2Unlock tidak menjawab tepat waktu. Coba lagi beberapa saat lagi." },
  "link2unlock|408": { t: "Server link terlalu lama merespons", d: "Link2Unlock tidak menjawab tepat waktu. Coba lagi beberapa saat lagi." },
  "pndk|408": { t: "Server link terlalu lama merespons", d: "PNDK tidak menjawab tepat waktu. Coba lagi beberapa saat lagi." },
  "adsafelink|408": { t: "Server link terlalu lama merespons", d: "Adsafelink tidak menjawab tepat waktu. Coba lagi beberapa saat lagi." },
  "adlinksumo|408": { t: "Server link terlalu lama merespons", d: "Adlinksumo tidak menjawab tepat waktu. Coba lagi beberapa saat lagi." },
  "ouo|408": { t: "Server link terlalu lama merespons", d: "ouo.io tidak menjawab tepat waktu. Coba lagi beberapa saat lagi." },
  "shrinkme|408": { t: "Server link terlalu lama merespons", d: "ShrinkMe tidak menjawab tepat waktu. Coba lagi beberapa saat lagi." },
  "nypass|408": { t: "Server link terlalu lama merespons", d: "NYPass tidak menjawab tepat waktu. Coba lagi beberapa saat lagi." },
  "link4sub|408": { t: "Server link terlalu lama merespons", d: "Link4Sub tidak menjawab tepat waktu. Coba lagi beberapa saat lagi." },
  "linkvertise|408": { t: "Server link terlalu lama merespons", d: "Linkvertise tidak menjawab tepat waktu. Coba lagi beberapa saat lagi." },
  "lootlabs|408": { t: "Server link terlalu lama merespons", d: "LootLabs tidak menjawab tepat waktu. Coba lagi beberapa saat lagi." },
  "chain|408": { t: "Server link terlalu lama merespons", d: "Salah satu hop dalam rantai tidak menjawab tepat waktu. Coba lagi beberapa saat lagi." },
  "zflexlink|408": { t: "Server link terlalu lama merespons", d: "zFlexLink tidak menjawab tepat waktu. Coba lagi beberapa saat lagi." },
  "arahlink|408": { t: "Server link terlalu lama merespons", d: "ArahLink tidak menjawab tepat waktu. Resolusi ArahLink butuh ~10 detik; coba lagi beberapa saat lagi." },
  "platorelay|408": { t: "Server link terlalu lama merespons", d: "PlatoRelay tidak menjawab tepat waktu. Coba lagi beberapa saat lagi." },
  // 410: rantai berputar tanpa tujuan akhir
  "chain|410": { t: "Link berputar tanpa tujuan", d: "Link ini hanya memutar iklan dan tidak pernah mengarah ke berkas tujuan. Minta link baru ke pembuatnya." },
  // 502: server link sedang bermasalah
  "sfgl|502": { t: "Server link sedang bermasalah", d: "sf.gl sedang mengalami gangguan. Coba lagi nanti." },
  "bicolink|502": { t: "Server link sedang bermasalah", d: "Bicolink sedang mengalami gangguan. Coba lagi nanti." },
  "move2link|502": { t: "Server link sedang bermasalah", d: "Move2Link sedang mengalami gangguan. Coba lagi nanti." },
  "sub4|502": { t: "Server link sedang bermasalah", d: "Sub4 tidak dapat diproses saat ini. Coba lagi nanti." },
  "sub2unlock|502": { t: "Server link sedang bermasalah", d: "Sub2Unlock tidak dapat diproses saat ini. Coba lagi nanti." },
  "link2unlock|502": { t: "Server link sedang bermasalah", d: "Link2Unlock tidak dapat diproses saat ini. Coba lagi nanti." },
  "pndk|502": { t: "Server link sedang bermasalah", d: "PNDK sedang mengalami gangguan. Coba lagi nanti." },
  "adsafelink|502": { t: "Server link sedang bermasalah", d: "Adsafelink sedang mengalami gangguan. Coba lagi nanti." },
  "adlinksumo|502": { t: "Server link sedang bermasalah", d: "Adlinksumo sedang mengalami gangguan. Coba lagi nanti." },
  "ouo|502": { t: "Server link sedang bermasalah", d: "ouo.io sedang mengalami gangguan. Coba lagi nanti." },
  "shrinkme|502": { t: "Server link sedang bermasalah", d: "ShrinkMe sedang mengalami gangguan. Coba lagi nanti." },
  "nypass|502": { t: "Server link sedang bermasalah", d: "NYPass sedang mengalami gangguan. Coba lagi nanti." },
  "link4sub|502": { t: "Server link sedang bermasalah", d: "Link4Sub sedang mengalami gangguan. Coba lagi nanti." },
  "linkvertise|502": { t: "Server link sedang bermasalah", d: "Linkvertise sedang mengalami gangguan. Coba lagi nanti." },
  "lootlabs|502": { t: "Server link sedang bermasalah", d: "LootLabs sedang mengalami gangguan. Coba lagi nanti." },
  "chain|502": { t: "Server link sedang bermasalah", d: "Salah satu hop dalam rantai gagal diproses. Coba lagi nanti." },
  "zflexlink|502": { t: "Server link sedang bermasalah", d: "zFlexLink menolak permintaan atau sedang tidak bisa diakses. Coba lagi nanti." },
  "arahlink|502": { t: "Server link sedang bermasalah", d: "ArahLink menolak permintaan atau sedang tidak bisa diakses. Coba lagi nanti." },
  "platorelay|502": { t: "Server link sedang bermasalah", d: "PlatoRelay menolak permintaan atau sedang tidak bisa diakses. Coba lagi nanti." },
  // 503: maintenance / dinonaktifkan
  "chain|503": { t: "Layanan sedang gangguan", d: "Fitur rantai sedang dinonaktifkan atau dalam perbaikan. Coba lagi nanti." },
};

const _HTTP_ERRORS = {
  401: "Sesi habis. Silakan login ulang.",
  402: "Kekurangan coin. Hubungi admin untuk menambah coin.",
  403: "Halaman dibatasi akses (HTTP 403). Coba masuk ulang atau hubungi admin.",
  404: "Halaman tidak ditemukan (HTTP 404). Link yang Anda tuju mungkin salah.",
  409: "Data sudah diproses sebelumnya. Jangan mengirim link yang sama berkali-kali.",
  429: "Terlalu banyak percobaan. Tunggu sebentar.",
  500: "Server mengalami kesalahan internal. Coba lagi nanti.",
  503: "Layanan sedang tidak tersedia. Coba lagi nanti.",
  "*Too many login attempts*": "Terlalu banyak percobaan masuk. Tunggu sebentar.",
  "*Incorrect username or password*": "Username atau sandi salah.",
  "*Account disabled*": "Akun dinonaktifkan. Hubungi admin.",
  "*Google login not configured*": "Login Google belum dikonfigurasi admin.",
  "*Invalid backend*": "Backend tidak valid.",
};

/* Returns {t, d}: t = short problem title, d = explanation + next step.
   Never returns the raw API string (job.error_message / job.error): those are
   Python exception names and must stay server-side only. */
function friendlyJobError(job){
  if(!job || !job.backend) return {t:"Gagal memproses", d:"Coba lagi sebentar lagi."};
  const key = job.backend + "|" + job.error_status_code;
  if(_JOB_ERRORS[key]) return _JOB_ERRORS[key];
  const status = Number(job.error_status_code);
  if(status && _STATUS_GENERIC[status]) return _STATUS_GENERIC[status];
  const name = _BACKEND_NAMES[job.backend] || job.backend;
  return {t:name + " tidak bisa di-resolve", d:"Coba lagi nanti. Jika masalah berlanjut, hubungi admin di Telegram."};
}

function friendlyHttpError(status, detail, fallback){
  if(!status && (detail instanceof TypeError || /Failed to fetch/i.test(String(detail)))) return "Tidak dapat menghubungi server. Cek koneksi internet Anda.";
  if(status && _HTTP_ERRORS[status]) return _HTTP_ERRORS[status];
  if(detail){
    for(const pattern in _HTTP_ERRORS){
      if(pattern.charAt(0)==="*" && new RegExp(pattern.slice(1,-1),"i").test(detail)) return _HTTP_ERRORS[pattern];
    }
  }
  return fallback || "Terjadi kesalahan. Coba lagi nanti.";
}

async function jsonOr(r){
  const t = await r.text();
  if(!t) throw new Error("Server tidak merespons. Coba lagi sebentar lagi.");
  try{ return JSON.parse(t); }
  catch(_){ throw new Error("Format respons tidak dikenal. Coba lagi sebentar lagi."); }
}

/* Polling fetch: retries transient 5xx/408/429 and network errors with linear
   backoff. Terminal answers (2xx, 401, 403, 404) return on the first try, so
   the caller's existing error handling still runs. */
async function pollFetch(url, tries){
  tries = tries || 3;
  let last = null;
  for(let i=0;i<tries;i++){
    try{
      const r = await fetch(url, {credentials:"include"});
      if(r.ok || r.status===401 || r.status===403 || r.status===404) return r;
      last = r;
    }catch(e){ last = e; }
    if(i < tries-1) await new Promise(res=>setTimeout(res, 400*(i+1)));
  }
  if(last instanceof Error) throw last;
  return last;
}

let historyData = [];
let historyStats = null;
let toastTimer;
let csrfToken = null;
let currentAdminId = null;
let googleClientId = "";
let telegramUsername = "";
let sessionUserId = null, sessionUsername = "";   // cached at boot for sync Telegram links
let coinCost = 1;
let refundOnFail = false;
let allowSignup = true;
let freeCoinsEnabled = true;
let coinBalance = null;
let coinUnlimited = false;
let currentRole = "";
let currentPageName = "home";
// ponytail: cache the admin user list (id â†’ username) so the Riwayat page
// can render an extra "User" column without re-fetching the full admin panel.
let adminUserNames = null;
// ponytail: client-side sort state for the admin user table (no backend order change)
let userSortKey = "id";
let userSortDir = 1;
let usersLast = [];
let usersLastMyId = null;
// ponytail: client-side paging â€” the admin table needs the full list anyway for
// the idâ†’username map, and search/sort stay client-side. Move the slice into SQL
// if the user table ever passes a few thousand rows.
const USER_PAGE_SIZE = 10;
let userPage = 1;
const HISTORY_PAGE_SIZE = 20;
let historyPage = 1;
let activeResolve = null;  // {jobId, backend, poll, chain, url, startMs, lastHTML, stepsHTML, terminal}

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const icon = (name, cls="icon") => `<svg class="${cls}" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function toast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2800)}
function on(sel, evt, fn){
  document.addEventListener(evt, function(e){
    const t = e.target && e.target.closest ? e.target.closest(sel) : null;
    if(t) fn(e, t);
  });
}
function applyTheme(t){
  const root = document.documentElement;
  if(t==="dark"){ root.setAttribute("data-theme","dark"); } else { root.removeAttribute("data-theme"); }
  try{ localStorage.setItem("theme", t==="dark"?"dark":"light"); }catch(_){}
  const u = $("#themeToggle") && $("#themeToggle").querySelector("use");
  if(u) u.setAttribute("href", t==="dark" ? "#icon-sun" : "#icon-moon");
  try{ const m=document.querySelector('meta[name="theme-color"]'); if(m)m.setAttribute("content",t==="dark"?"#0e1010":"#f5f0e7"); }catch(_){}
}
function currentTheme(){ return document.documentElement.getAttribute("data-theme")==="dark" ? "dark" : "light"; }

/* Page markup lives in JS, not in the served HTML, so the static source carries no page structure. */
const PAGE_TEMPLATES = {
  home: () => `
      <section class="page active">
        <section class="hero">
          <div class="hero-copy">
            <h1>Every link has<br><em>a destination.</em></h1>
            <p class="hero-desc">Uraikan link dengan mudah. Satu tempat untuk mengelola resolver, memantau status, dan menyimpan hasil.</p>
            <form class="resolve-form" id="resolveForm">
              <input id="urlInput" type="text" inputmode="url" autocomplete="off" spellcheck="false" placeholder="Tempel link yang ingin di-resolve..." required />
              <button class="primary-btn" type="submit">Resolve <span>â†’</span></button>
            </form>
            <label style="display:flex;gap:6px;align-items:center;justify-content:center;margin-top:10px;font-size:11px;color:var(--muted)"><input type="checkbox" id="chainToggle" style="width:14px;height:14px" /> Chain auto hop, lanjut sampai tujuan akhir</label>
            <div id="chainSteps" class="resolve-result hidden" style="margin-top:10px;text-align:left"></div>
            <div class="supported"> ${supportedStripHtml()} </div>
            <div class="resolve-result hidden" id="resolveResult" aria-live="polite"></div>
          </div>
          <div class="hero-art" aria-hidden="true">
            <div class="sun"></div><div class="arch arch-one"></div><div class="arch arch-two"></div>
            <div class="city-line city-back"></div><div class="city-line city-front"></div>
            <div class="building b1"></div><div class="building b2"></div><div class="building b3"></div>
            <div class="bridge"><span></span><span></span><span></span></div>
            <div class="art-note"><span class="note-icon">${icon("shield")}</span><div><b>One clear destination</b><small>Keep your workflow simple.</small></div></div>
          </div>
        </section>
        <section class="feature-grid">
          <article class="feature featured"><span class="feature-icon"><svg class="icon-feature" aria-hidden="true"><use href="#icon-link"></use></svg></span><div><h2>Multi-resolver</h2><p>Gunakan engine resolver yang sudah terhubung.</p></div></article>
          <article class="feature"><span class="feature-icon"><svg class="icon-feature" aria-hidden="true"><use href="#icon-history"></use></svg></span><div><h2>Riwayat tersimpan</h2><p>Temukan hasil resolve sebelumnya dengan cepat.</p></div></article>
          <article class="feature"><span class="feature-icon"><svg class="icon-feature" aria-hidden="true"><use href="#icon-status"></use></svg></span><div><h2>Status transparan</h2><p>Pantau kondisi layanan dan ketersediaan API.</p></div></article>
          <article class="feature"><span class="feature-icon"><svg class="icon-feature" aria-hidden="true"><use href="#icon-coin"></use></svg></span><div><h2>Member workspace</h2><p>Kelola aktivitas dari satu dashboard.</p></div></article>
        </section>
      </section>`,
  dashboard: () => `
      <section class="page active">
        <div class="page-heading"><div><h1>Selamat datang kembali.</h1><p>Ringkasan aktivitas resolver kamu.</p></div><button class="outline-btn" data-page="home">+ Resolve baru</button></div>
        <div class="stats-grid">
          <article class="stat-card"><span>Total resolve</span><strong id="totalStat">0</strong><small id="totalStatCaption">20 terakhir</small><div class="stat-symbol">${icon("link")}</div></article>
          <article class="stat-card"><span>Berhasil</span><strong id="successStat">0</strong><small class="good" id="successRate">â€¦</small><div class="stat-symbol green">âœ“</div></article>
          <article class="stat-card"><span>Gagal</span><strong id="failedStat">0</strong><small>Perlu ditinjau</small><div class="stat-symbol red">!</div></article>
          <article class="stat-card"><span>Coins</span><strong id="coinStat"></strong><small id="coinStatSub">Login untuk melihat saldo</small><div class="stat-symbol">â—ˆ</div></article>
        </div>
        <section class="panel"><div class="panel-heading"><div><h2>Aktivitas terbaru</h2><p>Riwayat resolve terbaru dari workspace kamu.</p></div><button class="text-btn" data-page="history">Lihat semua</button></div><div class="table-wrap"><table><thead><tr><th>Link asal</th><th>Resolver</th><th>Waktu</th><th>Status</th></tr></thead><tbody id="recentRows"></tbody></table></div></section>
      </section>`,
  history: () => `
      <section class="page active">
        <div class="page-heading"><div><h1>Riwayat resolusi</h1><p>Daftar hasil resolve yang tercatat di workspace.</p></div><div class="search-box"><svg class="icon icon-sm" aria-hidden="true"><use href="#icon-search"></use></svg> <input id="historySearch" placeholder="Cari URL atau resolver..." /></div></div>
        <section class="panel"><div class="table-wrap"><table><thead><tr><th>Link asal</th><th>Link tujuan</th><th>Resolver</th><th class="col-user" style="display:none">User</th><th>Durasi</th><th>Waktu</th><th>Status</th></tr></thead><tbody id="historyRows"></tbody></table></div><div class="table-footer hidden" id="historyPager"></div><div class="table-footer"><span id="historyCount">0 aktivitas</span></div></section>
      </section>`,
  status: () => `
      <section class="page active">
        <div class="page-heading"><div><h1>Status resolver</h1><p>Status layanan bypass-only.</p></div><span class="pill success"><span class="live-dot"></span> Sistem operasional</span></div>
        <div id="statusError" class="notice hidden" style="margin:0 0 18px"><span class="live-dot error"></span><div><b>Gagal memuat status.</b><p>Periksa konektivitas atau coba lagi nanti.</p></div></div>
        <div class="resolver-list" id="resolverList">
          <article class="resolver-card"><div class="resolver-icon">M</div><div class="resolver-info"><h2>Memuat...</h2><p>Memuat...</p><code>/api/.../resolve</code></div><div class="resolver-health"><span class="pill warning">...</span></div></article>
        </div>
        <div class="notice"><div><b>Bypass-only resolvers.</b><p>17 engine: sfgl, bicolink, move2link, pndk, sub4, sub2unlock, link2unlock, adsafelink, adlinksumo, shrinkme, ouo, link4sub, linkvertise, lootlabs, zflexlink, arahlink, platorelay.</p></div></div>
      </section>`,
  admin: () => `
      <section class="page active">
        <div class="page-heading"><div><h1>Manajemen resolver</h1><p>Kontrol resolver, coin, dan permintaan Telegram.</p></div></div>
        <div id="adminLoginCard" class="panel">
          <div class="panel-heading"><div><h2>Login admin</h2><p>Masukkan username/password untuk masuk ke panel admin.</p></div></div>
          <form id="authForm"><label>Email atau username<input id="authEmail" autocomplete="username" placeholder="nama@email.com" required /></label><label>Password<input id="authPassword" type="password" autocomplete="current-password" placeholder="Masukkan password" required /></label><button class="primary-btn full" type="submit">Masuk sebagai admin</button></form>
        </div>
        <div id="adminTools" style="display:none">
        <section class="panel"><div class="table-wrap"><table><thead><tr><th>Resolver</th><th>Endpoint</th><th>Status</th><th>Maintenance</th><th>Aktif</th><th>Rate</th></tr></thead><tbody id="adminRows"></tbody></table></div></section>
        <section class="panel"><div class="panel-heading"><div><h2>User &amp; Coin</h2><p>Daftar user, saldo coin, dan atur coin per user.</p></div><div class="search-box"><svg class="icon icon-sm" aria-hidden="true"><use href="#icon-search"></use></svg><input id="userSearch" placeholder="Cari username atau email..." /></div><button class="outline-btn small" id="refreshUsers">Refresh</button></div>
          <div class="table-wrap"><table><thead><tr><th><button type="button" class="sort-th" data-user-sort="id">ID<span class="sort-mark"></span></button></th><th><button type="button" class="sort-th" data-user-sort="username">Username<span class="sort-mark"></span></button></th><th><button type="button" class="sort-th" data-user-sort="role">Role<span class="sort-mark"></span></button></th><th><button type="button" class="sort-th" data-user-sort="status">Status<span class="sort-mark"></span></button></th><th><button type="button" class="sort-th" data-user-sort="coins">Coins<span class="sort-mark"></span></button></th><th><button type="button" class="sort-th" data-user-sort="created_at">Dibuat<span class="sort-mark"></span></button></th><th>Email</th><th>Atur</th><th>Aksi</th></tr></thead><tbody id="userRows"></tbody></table></div>
          <p class="muted small" style="padding:10px 22px">Tip: +10 menambah, -5 mengurangi. Saldo tidak boleh negatif.</p>
          <div class="table-footer hidden" id="userPager"></div>
          <div class="panel-heading"><div><h2>Grant coin manual</h2><p>Top up setelah user chat admin di Telegram.</p></div></div>
          <div style="display:flex;gap:8px;align-items:center;padding:0 22px 16px">
            <input id="grantUserId" placeholder="User ID" style="width:90px" />
            <input id="grantDelta" placeholder="Delta (e.g. 10)" style="width:110px" />
            <button class="primary-btn" id="grantCoinsBtn">Grant coins (by ID)</button>
            <span id="grantResult" class="muted small"></span>
          </div>
        </section>
        <section class="panel settings-panel"><div class="panel-heading"><div><h2>Pengaturan sistem</h2><p>Biaya coin per resolve dan kebijakan refund (global).</p></div></div>
          <label class="setting-row"><span><b>Coin cost per resolve</b><small>Bayar saat sukses. Reset via admin bila saldo kosong.</small></span><span><input id="coinCostInput" type="number" min="1" max="1000" style="width:80px" /> <button class="outline-btn small" id="saveCoinCost">Simpan</button></span></label>
          <label class="setting-row"><span><b>Refund coin saat resolve gagal</b><small>Kalau aktif, resolve gagal mengembalikan coin. Kalau nonaktif, coin tetap terpakai.</small></span><span><input id="refundOnFailInput" type="checkbox" /> <button class="outline-btn small" id="saveRefundOnFail">Simpan</button></span></label>
          <label class="setting-row"><span><b>Izinkan pendaftaran pengguna baru</b><small>Bila nonaktif, pengguna baru tidak bisa daftar via Google. User lama tetap bisa login.</small></span><span><input id="allowSignupInput" type="checkbox" /> <button class="outline-btn small" id="saveAllowSignup">Simpan</button></span></label>
          <label class="setting-row"><span><b>Coin gratis 3/hari untuk semua user</b><small>Bila nonaktif: reset harian berhenti, saldo gratis semua user dikosongkan, dan user baru tidak dapat coin gratis. Coin beli (paid) tetap aman.</small></span><span><input id="freeCoinsEnabledInput" type="checkbox" /> <button class="outline-btn small" id="saveFreeCoins">Simpan</button></span></label>
        </section>
        <section class="panel settings-panel"><div class="panel-heading"><div><h2>Pengumuman</h2><p>Tampilkan pesan global ke semua pengunjung.</p></div></div>
          <label class="setting-row"><span><b>Aktifkan pengumuman</b><small>Bila nonaktif, halaman Pengumuman tampil kosong untuk semua user. Isi tetap tersimpan.</small></span><span><input id="announcementEnabled" type="checkbox" /></span></label>
          <label class="setting-row"><span><b>Judul</b><small>Maks 300 karakter.</small></span><input id="announcementTitleInput" type="text" maxlength="300" style="width:60%" /></label>
          <label class="setting-row"><span><b>Isi pengumuman</b><small>Maks 2000 karakter. Baris baru ikut tampil sebagai baris baru.</small></span><textarea id="announcementBodyInput" rows="2" maxlength="2000" style="width:60%"></textarea></label>
          <label class="setting-row"><span><b>Jenis</b><small>info, success, atau warning.</small></span><span><select id="announcementLevelInput"><option value="info">info</option><option value="success">success</option><option value="warning">warning</option></select> <button class="outline-btn small" id="saveAnnouncement">Simpan</button></span></label>
        </section>
        <section class="panel"><div class="panel-heading"><div><h2>Riwayat User</h2><p>Lihat riwayat resolve milik user tertentu.</p></div></div>
          <div class="table-wrap"><table><thead><tr><th>Link asal</th><th>Tujuan</th><th>Resolver</th><th>Waktu</th><th>Durasi</th><th>Status</th></tr></thead><tbody id="userHistoryRows"></tbody></table></div>
          <p id="userHistoryStatus" class="muted small" style="padding:10px 22px">Klik tombol "Riwayat" pada tabel user di atas.</p>
        </div>
        </section>
      </section>`,
  auth: () => `
    <section class="page active">
      <div class="auth-layout"><div class="auth-visual"><span class="brand"><span class="brand-mark">${icon("link","icon icon-lg")}</span> Archi<span>Bypass</span></span><div><h1>Link kamu,<br><em>tersusun rapi.</em></h1><p>Workspace ringkas untuk menyelesaikan pekerjaan tanpa berantakan.</p></div><small>DIRANCANG DENGAN CERMAT Â· 2026</small></div>
        <div class="auth-card"><div class="auth-top"><h2>Selamat datang.</h2><p>Masuk untuk membuka workspace kamu.</p></div>
          <div id="g_id_onload" data-client_id="962854016982-49im6i1am8ng7892fv04d28bva0vqlpq.apps.googleusercontent.com" data-context="signin" data-callback="onGoogleCredential" data-auto_prompt="false"></div>
          <div class="g_id_signin" data-type="standard" data-shape="pill" data-theme="outline" data-size="large" data-logo_alignment="left"></div>
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#6f5c4a;margin:8px 0 0"><input id="rememberMe" type="checkbox" checked style="accent-color:var(--terra);width:16px;height:16px" /> Jangan lupakan saya</label>
          <p id="googleStatus" class="muted small" style="margin:6px 0 8px"></p>
          <p id="signupBlockedMsg" class="muted small" style="margin:6px 0 8px;display:none;color:#8a3b1f;font-weight:600">Registrasi pengguna baru sedang dinonaktifkan. Hubungi admin di Telegram.</p>
          <p class="auth-foot" id="authFootNote">Login pakai Google. Hubungi admin di Telegram untuk beli coin. User baru dapat 3 coin gratis setiap pukul 00.00 WIB</p>
          <p><a id="telegramLink" href="#" target="_blank" rel="noopener" data-telegram-link style="display:none">${icon("telegram","icon icon-sm")} Beli coin, hubungi admin di Telegram</a></p>
          <button class="outline-btn small" id="logoutBtn" style="display:none">Logout</button>
        </div>
      </div>
    </section>`,
  error: () => `
      <section class="page active">
        <div class="error-page">
          <h1>Halaman tidak ditemukan.</h1>
          <p class="muted">Halaman yang kamu cari tidak ada atau sudah dipindahkan.</p>
          <button class="primary-btn" data-page="home">Kembali ke beranda</button>
        </div>
      </section>`,
};

function renderPage(name){
  const known = !!PAGE_TEMPLATES[name];
  const tpl = PAGE_TEMPLATES[name] || PAGE_TEMPLATES.error;
  const app = $("#app");
  if(!app) return;
  app.innerHTML = tpl();
  currentPageName = known ? name : "error";
}

function setNavAuth(auth, role){
  document.querySelectorAll('.topnav [data-page="history"], .topnav [data-page="status"], .topnav [data-page="dashboard"]').forEach(el=>{ el.style.display = auth ? "" : "none"; });
  // ponytail: admin-only nav tab injected by JS so it never leaks into static source;
  // server still enforces /admin route guard at app.js:916.
  const nav = document.querySelector(".topnav");
  if(nav){
    let btn = nav.querySelector('[data-page="admin"]');
    if(auth && role === "admin"){
      if(!btn){
        btn = document.createElement("button");
        btn.className = "nav-link";
        btn.dataset.page = "admin";
        btn.innerHTML = '<svg class="icon icon-sm" aria-hidden="true"><use href="#icon-nav-admin"></use></svg> Admin';
        nav.appendChild(btn);
      }
    } else if(btn){
      btn.remove();
    }
  }
  if(!auth && ["history","status","dashboard","admin"].includes(currentPageName)) page("home");
}

function page(name){
  const loader = document.querySelector(".app-loader");
  if(loader) loader.remove();
  if(!PAGE_TEMPLATES[name]) name = "error";
  renderPage(name);
  // keep URL in sync: only `/admin` is deep-linkable
  const want = name === "admin" ? "/admin" : "/";
  if(window.location.pathname !== want) history.replaceState({}, "", want);
  $$((".nav-link")).forEach(el=>el.classList.toggle("active",el.dataset.page===name));
  if(name==="home") restoreResolveUI();
  if(name==="history") refreshHistory();
  if(name==="dashboard") { refreshHistory(); refreshStatus(); refreshCoin(); }
  if(name==="status") refreshStatus();
  if(name==="admin") renderAdmin();
  if(name==="auth") { fetchGoogleConfig(); const ab=$("#accountButton"); if(ab) ab.textContent="U"; }
  // Topbar status/dot are outside #app; refresh on every navigation so home page
  // never shows stale "Memeriksa status..."
  refreshStatus();
  window.scrollTo({top:0,behavior:"smooth"});
}

on("[data-page]","click",(e,t)=>{ e.preventDefault(); page(t.dataset.page); });
function openDrawer(){ document.querySelectorAll(".topbar, #app, footer").forEach(el=>el.setAttribute("inert","")); const d=$("#accountDrawer"); d.classList.remove("closed"); d.setAttribute("aria-hidden","false"); $("#accountBackdrop").classList.remove("hidden"); $("#drawerClose").focus(); }
function closeDrawer(){ const d=$("#accountDrawer"); document.querySelectorAll(".topbar, #app, footer").forEach(el=>el.removeAttribute("inert")); d.classList.add("closed"); d.setAttribute("aria-hidden","true"); $("#accountBackdrop").classList.add("hidden"); $("#accountButton").focus(); }
on("#accountButton","click", async ()=>{
  let sess = null;
  try{
    const r = await fetch(API_BASE + API.session, {credentials:"include"});
    sess = await r.json();
    if(!sess.authenticated) sess = null;
  }catch(_){}
  const nameEl = $("#drawerName"), roleEl = $("#drawerRole"), avEl = $("#drawerAvatar"), coinsEl = $("#drawerCoins");
  const logoutBtn = $("#drawerLogout"), loginBtn = $("#drawerLogin");
  if(sess){
    if(nameEl) nameEl.textContent = sess.username;
    if(roleEl) roleEl.textContent = sess.role + " Â· " + (sess.user_id ? "ID "+sess.user_id : "");
    currentRole = sess.role || "";
    if(avEl) avEl.textContent = sess.username.slice(0,1).toUpperCase();
    if(coinsEl) coinsEl.textContent = drawerCoinText();
    if(logoutBtn) logoutBtn.style.display = "";
    if(loginBtn) loginBtn.style.display = "none";
    csrfToken = sess.csrf_token || csrfToken;
    await fetchCoin();
    setTimeout(()=>{ if(coinsEl) coinsEl.textContent = drawerCoinText(); }, 600);
  } else {
    if(nameEl) nameEl.textContent = "Belum login";
    if(roleEl) roleEl.textContent = "Silakan login dulu";
    if(avEl) avEl.textContent = "U";
    if(coinsEl) coinsEl.textContent = "Login untuk melihat saldo coin";
    if(logoutBtn) logoutBtn.style.display = "none";
    if(loginBtn) loginBtn.style.display = "";
  }
  const supEl = $("#drawerSupport");
  if(supEl) supEl.style.display = telegramUsername ? "" : "none";
  if(supEl) supEl.href = telegramUsername ? "https://t.me/"+telegramUsername : "#";
  openDrawer();
});
on("#drawerClose","click",closeDrawer);
on("#accountBackdrop","click",closeDrawer);
function doLocalLogout(){
  stopCoinPoll();
  csrfToken = null; coinBalance = null; coinUnlimited = false; currentRole = ""; updateCoinUI();
  $("#accountButton").textContent = "U";
  setNavAuth(false, null);
}
on("#drawerLogout","click", async ()=>{
  try{
    const r = await fetch(API_BASE + API.session, {credentials:"include"});
    const j = await r.json();
    const csrf = j.csrf_token || csrfToken || "";
    await fetch(API_BASE + API.logout, {method:"POST", headers:{"X-CSRF-Token": csrf}, credentials:"include"});
  }catch(_){}
  doLocalLogout();
  closeDrawer();
  toast("Logout berhasil.");
  page("auth");
});
on("#drawerLogin","click", ()=>{ closeDrawer(); page("auth"); });

function statusClass(status){return status==="Berhasil"?"success":status==="Gagal"?"failed":"warning"}
// ponytail: one duration source for every history table. Job timestamps are the
// general case (chain + resolver jobs); result.elapsed_sec is the fallback the
// resolver jobs also carry. Returns null when unknown so the formatter prints "-".
function jobDurationSec(job){
  if(!job) return null;
  if(job.started_at && job.completed_at){
    const s = (new Date(job.completed_at) - new Date(job.started_at)) / 1000;
    if(isFinite(s) && s >= 0) return s;
  }
  const e = job.result && job.result.elapsed_sec;
  return (typeof e === "number" && isFinite(e)) ? e : null;
}
function fmtDuration(secs){
  if(secs === null || !isFinite(secs)) return "-";
  return secs >= 60 ? `${Math.floor(secs/60)}m ${(secs%60).toFixed(0)}s` : `${secs.toFixed(1)}s`;
}
// ponytail: esc() escapes HTML characters but not URL schemes, so a destination
// of "javascript:..." would still be a clickable XSS vector. Allowlist http(s)
// only; anything else returns "" and the caller degrades to plain text.
function safeUrl(u){
  const s = String(u ?? "").trim();
  return /^https?:\/\//i.test(s) ? s : "";
}

function bumpStats(ok){
  if(!historyStats) return;
  historyStats.total++;
  if(ok) historyStats.success++; else historyStats.failed++;
}

function renderRecent(){
  const rr = $("#recentRows");
  if(rr) rr.innerHTML=historyData.slice(0,5).map(item=>`<tr><td class="url-cell" title="${esc(item.source)}">${esc(item.source)}</td><td>${esc(item.resolver)}</td><td>${esc(item.time)}</td><td><span class="pill ${statusClass(item.status)}">${esc(item.status)}</span></td></tr>`).join("")||'<tr><td colspan="4">Belum ada aktivitas.</td></tr>';
  const tot = historyStats ? historyStats.total : historyData.length;
  const ok = historyStats ? historyStats.success : historyData.filter(x=>x.status==="Berhasil").length;
  const fail = historyStats ? historyStats.failed : historyData.filter(x=>x.status==="Gagal").length;
  const t=$("#totalStat"); if(t) t.textContent=String(tot);
  const cap=$("#totalStatCaption"); if(cap && historyStats) cap.textContent = `${tot} total`;
  const su=$("#successStat"); if(su) su.textContent=String(ok);
  const fa=$("#failedStat"); if(fa) fa.textContent=String(fail);
  const rate = tot ? ((ok/tot)*100).toFixed(1)+"%" : "0%";
  const sr = $("#successRate"); if(sr) sr.textContent = rate + " berhasil";
  const cs = $("#coinStat"); if(cs) cs.textContent = coinUnlimited ? "âˆž" : (coinBalance===null?"nol":String(coinBalance));
  const css = $("#coinStatSub"); if(css) css.textContent = coinUnlimited ? "Admin unlimited" : (coinBalance===null?"Login untuk melihat saldo":`Biaya ${coinCost} coin / resolve`);
}

function renderHistory(){
  const hr = $("#historyRows");
  if(!hr) return;
  // ponytail: admin-only "User" column.
  document.querySelectorAll(".col-user").forEach(th => { th.style.display = (currentRole==="admin") ? "" : "none"; });
  const q=($("#historySearch")?.value||"").toLowerCase();
  const filtered=historyData.filter(x=>[x.source,x.target,x.resolver,x.status].join(" ").toLowerCase().includes(q));
  const colspan = currentRole==="admin" ? 7 : 6;
  const pages = Math.max(1, Math.ceil(filtered.length / HISTORY_PAGE_SIZE));
  if(historyPage > pages) historyPage = pages;
  if(historyPage < 1) historyPage = 1;
  const start = (historyPage - 1) * HISTORY_PAGE_SIZE;
  const shown = filtered.slice(start, start + HISTORY_PAGE_SIZE);
  hr.innerHTML=shown.map(item=>{
    const uid = item.raw?.owner_id;
    const uname = (currentRole==="admin" && uid != null && adminUserNames[uid]) ? esc(adminUserNames[uid]) : "";
    const dur = fmtDuration(jobDurationSec(item.raw));
    return `<tr><td class="url-cell" title="${esc(item.source)}">${esc(item.source)}</td><td class="url-cell" title="${esc(item.target)}">${esc(item.target)}</td><td>${esc(item.resolver)}</td>${uname?`<td class="muted small">${uname}</td>`:""}<td>${esc(dur)}</td><td>${esc(item.time)}</td><td><span class="pill ${statusClass(item.status)}">${esc(item.status)}</span></td></tr>`;
  }).join("")||`<tr><td colspan="${colspan}" class="muted small">Tidak ada riwayat yang cocok.</td></tr>`;
  const hc=$("#historyCount"); if(hc) hc.textContent=`${filtered.length} aktivitas`;
  renderHistoryPager(filtered.length, pages);
}

function renderHistoryPager(total, pages){
  const el = $("#historyPager");
  if(!el) return;
  if(total <= HISTORY_PAGE_SIZE){ el.classList.add("hidden"); return; }
  el.classList.remove("hidden");
  const from = (historyPage - 1) * HISTORY_PAGE_SIZE + 1;
  const to = Math.min(historyPage * HISTORY_PAGE_SIZE, total);
  el.innerHTML =
    `<button class="outline-btn small" data-history-page="prev"${historyPage<=1?" disabled":""}>Sebelumnya</button>` +
    `<span class="muted small">Menampilkan ${from}â€“${to} dari ${total} aktivitas Â· Halaman ${historyPage} / ${pages}</span>` +
    `<button class="outline-btn small" data-history-page="next"${historyPage>=pages?" disabled":""}>Berikutnya</button>`;
}
on("#historySearch","input",()=>{ historyPage = 1; renderHistory(); });
on("[data-history-page]","click", (_e,t)=>{
  historyPage += t.dataset.historyPage === "next" ? 1 : -1;
  renderHistory();
});

// Announcement: a compact topbar popover, not a full page. Fetched on open so
// an admin's save shows up without a reload. The body is admin-authored but
// still escaped (esc), newlines -> <br>; no raw HTML from the API.
let announcementLoaded = false;
async function fetchAnnouncement(){
  try{
    const j = await fetch(API_BASE + API.announcement, {credentials:"include"}).then(r=>r.json());
    announcementLoaded = true;
    return j;
  }catch(_){
    return null;
  }
}
function paintAnnouncement(j){
  const pop=$("#announcementPopover"), title=$("#announcementTitleText"),
        body=$("#announcementBodyText"), upd=$("#announcementUpdated"), empty=$("#announcementEmptyText");
  const has = !!(j && j.enabled && (j.title || j.body));
  if(title) title.textContent = has ? (j.title || "Pengumuman") : "Pengumuman";
  if(body){
    body.innerHTML = has ? esc(j.body).replace(/\n/g,"<br>") : "Semua layanan berjalan normal.";
    body.style.display = "";
  }
  if(upd) upd.textContent = has && j.updated_at ? "Diperbarui " + new Date(j.updated_at*1000).toLocaleString("id-ID",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}) : "";
  if(empty) empty.style.display = has ? "none" : "";
}
async function openAnnouncement(){
  const pop=$("#announcementPopover");
  if(!pop) return;
  if(!announcementLoaded){ paintAnnouncement(await fetchAnnouncement()); }
  pop.classList.remove("hidden");
  $("#announcementClose")?.focus?.();
}
function closeAnnouncement(){ $("#announcementPopover")?.classList.add("hidden"); }
on("#announcementButton","click", (e)=>{
  e.stopPropagation();
  const pop=$("#announcementPopover");
  if(pop && !pop.classList.contains("hidden")){ closeAnnouncement(); return; }
  openAnnouncement();
});
on("#announcementClose","click", closeAnnouncement);
document.addEventListener("click", (e)=>{
  const pop=$("#announcementPopover");
  if(pop && !pop.classList.contains("hidden") && !e.target.closest("#announcementPopover") && !e.target.closest("#announcementButton")) closeAnnouncement();
});

function backendForUrl(url){
  try{
    const h = new URL(url).hostname.toLowerCase().replace(/\.$/,"");
    if(h==="sfl.gl"||h.endsWith(".sfl.gl")||h==="shorturl.at"||h.endsWith(".shorturl.at")||h==="xmz-anti.vercel.app"||h==="id.gociwidey.com") return "sfgl";
    if(h==="bicolink.com"||h==="www.bicolink.com"||h==="bicolink.net"||h==="www.bicolink.net"||h==="bicosafe.com"||h==="www.bicosafe.com"||h==="bclnk.net"||h==="www.bclnk.net") return "bicolink";
    if(h.endsWith("move2link.co")) return "move2link";
    if(h.endsWith("pndk.to")) return "pndk";
    if(h.endsWith("sub4unlock.io")||h.endsWith("sub4unlock.co")||h.endsWith("subs4unlock.id")||h.endsWith("sub4unlock.com")) return "sub4";
    if(h.endsWith("sub2unlock.io")||h.endsWith("sub2unlock.me")||h.endsWith("sub2unlock.id")||h.endsWith("subunlock.com")) return "sub2unlock";
    if(h.endsWith("link2unlock.com")) return "link2unlock";
    if(h==="link.adsafelink.com"||h.endsWith(".adsafelink.com")) return "adsafelink";
    if(h==="adlinksumo.com"||h.endsWith(".adlinksumo.com")) return "adlinksumo";
    if(h.endsWith("shrinkme.click")||h.endsWith("shrinkme.io")||h.endsWith("shrinke.me")) return "shrinkme";
    if(h.endsWith("ouo.io")) return "ouo";
    if(h.endsWith("link4sub.com")) return "link4sub";
    if(h.endsWith("linkvertise.com")||h.endsWith("link-to.net")||h.endsWith("link-target.net")||h.endsWith("link-hub.net")||h.endsWith("direct-link.net")||h.endsWith("up-to-down.net")) return "linkvertise";
    if(h.endsWith("loot-link.com")||h.endsWith("links.lootlabs.gg")||h.endsWith("lootlabs.gg")) return "lootlabs";
    if(h.endsWith("zflexlink.com")) return "zflexlink";
    if(h.endsWith("arahlink.com")) return "arahlink";
    if(h.endsWith("platorelay.com")||h.endsWith("platoboost.com")) return "platorelay";
  }catch(_){}
  return null;
}

async function fetchCoin(){
  const prev = lastCoinBalance;
  try{
    const r = await fetch(API_BASE + API.coinBalance, {credentials:"include"});
    if(!r.ok){ coinBalance=null; coinUnlimited=false; lastCoinBalance=null; return; }
    const j = await r.json();
    coinCost = j.cost ?? 1;
    coinUnlimited = !!j.unlimited;
    coinBalance = j.balance;
    lastCoinBalance = coinBalance;
  }catch(_){ coinBalance=null; lastCoinBalance=null; }
  // fetchCoin is called on every refresh, so also pull the public cost+refund info for fresh UI state.
  try{
    const cr = await fetch(API_BASE + API.coinCosts, {credentials:"include"});
    if(cr.ok){
      const cj = await cr.json();
      coinCost = cj.cost ?? coinCost;
      refundOnFail = !!cj.refund_on_fail;
    }
  }catch(_){}
  updateCoinUI();
  if(prev!==null && lastCoinBalance!==null && lastCoinBalance > prev){
    toast(`Coin bertambah: +${lastCoinBalance - prev}`);
  }
}
async function refreshCoin(){ await fetchCoin(); renderRecent(); }
let lastCoinBalance = null;
let coinPollTimer = null;
function startCoinPoll(){ stopCoinPoll(); coinPollTimer = setInterval(refreshCoin, 10000); }
function stopCoinPoll(){ if(coinPollTimer){ clearInterval(coinPollTimer); coinPollTimer=null; } }
function updateCoinUI(){
  const el = $("#coinBalance");
  if(!el) return;
  if(coinBalance===null && !coinUnlimited){
    el.style.display="none";
    return;
  }
  el.style.display="";
  el.textContent = coinUnlimited ? "âˆž coins (admin)" : `${coinBalance} coins`;
  const tg = $("#telegramLink"); if(tg) tg.style.display = telegramUsername ? "" : "none";
  const dc = $("#drawerCoins");
  const drawer = $("#accountDrawer");
  if(dc && drawer && !drawer.classList.contains("closed")){
    dc.textContent = drawerCoinText();
  }
}
function drawerCoinText(){
  const bal = coinUnlimited ? "âˆž coins (admin unlimited)" : (coinBalance!==null ? `${coinBalance} coins` : "0 coins");
  return `${currentRole || "user"} Â· ${bal}`;
}

async function fetchTelegramConfig(){
  try{
    const r = await fetch(API_BASE + API.coinTelegram);
    const j = await r.json();
    telegramUsername = j.username || "";
    const tg = $("#telegramLink");
    if(tg){
      tg.href = telegramUsername ? "https://t.me/"+telegramUsername : "#";
      tg.style.display = telegramUsername ? "" : "none";
    }
    document.querySelectorAll("[data-telegram-link]").forEach(a=>{
      a.href = telegramUsername ? "https://t.me/"+telegramUsername : "#";
      a.style.display = telegramUsername ? "" : "none";
    });
  }catch(_){}
}

function telegramUrlFor(amount, username, userId){
  const base = telegramUsername ? "https://t.me/"+telegramUsername : null;
  if(!base) return null;
  if(!username && !userId) return base;   // anonymous: plain handle, a ?text= needs a nick to be useful
  const text = encodeURIComponent(`Halo admin, saya mau beli ${amount} coin. Username: ${username} (id: ${userId})`);
  return base + "?text=" + text;
}

function showCoinModal(cost, balance){
  const m = $("#coinModal");
  const t = $("#coinModalText");
  const a = $("#coinModalTg");
  if(!m||!t||!a) return;
  t.textContent = `Coin tidak cukup (butuh ${cost}, saldo ${balance}). Hubungi admin di Telegram untuk top up.`;
  // Set href synchronously: a click must be a native user gesture or the popup
  // blocker eats window.open() after the async fetch. Caching session at boot
  // lets us build the full URL right away.
  const url = telegramUrlFor(cost, sessionUsername, sessionUserId) || (telegramUsername ? "https://t.me/"+telegramUsername : "#");
  a.href = url || "#";
  document.querySelectorAll(".app-shell").forEach(el=>el.setAttribute("inert",""));
  m.classList.remove("hidden");
  setTimeout(()=>{ const c=$("#coinModalClose"); if(c) c.focus(); }, 0);
}
function closeCoinModal(){
  document.querySelectorAll(".app-shell").forEach(el=>el.removeAttribute("inert"));
  $("#coinModal").classList.add("hidden");
  const b=$("#accountButton"); if(b) b.focus();
}
on("#coinModalClose","click", closeCoinModal);
on("#coinModal","click",(e)=>{ if(e.target.id==="coinModal") closeCoinModal(); });

// Farming-prevention warning popup, shown when a new Google signup reuses a
// signup signal (same IP, same device fingerprint, or subnet flood in 24 h).
var FARM_TEXT = `[WARNING] Multiple Account On Same IP Detected\nTolong Jangan Membuat Akun Dalam 1 IP`;
function showFarmWarning(){
  var m=document.getElementById("farmWarningModal");
  var t=document.getElementById("farmWarningText");
  if(!m||!t) return;
  t.textContent=FARM_TEXT;
  document.querySelectorAll(".app-shell").forEach(function(el){el.setAttribute("inert","");});
  m.classList.remove("hidden");
  setTimeout(function(){var c=document.getElementById("farmWarningClose");if(c)c.focus();},0);
}
function closeFarmWarning(){
  document.querySelectorAll(".app-shell").forEach(function(el){el.removeAttribute("inert");});
  $("#farmWarningModal").classList.add("hidden");
  var b=$("#accountButton"); if(b)b.focus();
}
on("#farmWarningClose","click",closeFarmWarning);
on("#farmWarningModal","click",function(e){if(e.target.id==="farmWarningModal")closeFarmWarning();});

// Welcome coin-purchase popup â€” shows on first load each day unless dismissed.
function welcomeTodayKey(){
  var d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}
function showWelcomeModal(){
  var m = document.getElementById("welcomeModal");
  if(!m) return;
  document.querySelectorAll(".app-shell").forEach(function(el){ el.setAttribute("inert",""); });
  m.classList.remove("hidden");
  setTimeout(function(){ var b=document.getElementById("welcomeCloseBtn"); if(b) b.focus(); },0);
}
function closeWelcomeModal(){
  var m = document.getElementById("welcomeModal");
  if(!m) return;
  m.classList.add("hidden");
  document.querySelectorAll(".app-shell").forEach(function(el){ el.removeAttribute("inert"); });
  var b = document.getElementById("accountButton"); if(b) b.focus();
}
function dismissWelcomeModal(){
  try{ localStorage.setItem("welcomeDismissedDate", welcomeTodayKey()); }catch(_){}
  // Only persist preference; user must click Tutup to actually close.
}
on("#welcomeCloseBtn","click", closeWelcomeModal);
on("#welcomeDismissCb","change", function(e){ if(e.target.checked) dismissWelcomeModal(); });
on("#welcomeModal","click", function(e){ if(e.target.id === "welcomeModal") closeWelcomeModal(); });

// Welcome popup: shows every day until the user dismisses it.
var _wd = null;
try{ _wd = localStorage.getItem("welcomeDismissedDate"); }catch(_){}
if(_wd !== welcomeTodayKey()) showWelcomeModal();

// Google Sign-In is rendered on demand: the auth page only exists after renderPage("auth").
let gsiInited = false, gsiTries = 0;
function paintFreeCoinsCopy(){
  const foot = $("#authFootNote");
  if(!foot) return;
  foot.textContent = freeCoinsEnabled
    ? "Login pakai Google. Hubungi admin di Telegram untuk beli coin. User baru dapat 3 coin gratis setiap pukul 00.00 WIB"
    : "Login pakai Google. Hubungi admin di Telegram untuk beli coin.";
}
async function fetchGoogleConfig(){
  try{
    if(!googleClientId){
      const r = await fetch(API_BASE + API.googleConfig, {credentials:"include"});
      const j = await r.json();
      googleClientId = j.client_id || "";
      allowSignup = j.allow_signup !== false;
      freeCoinsEnabled = j.free_coins_enabled !== false;
      const msg = $("#signupBlockedMsg");
      if(msg) msg.style.display = allowSignup ? "none" : "";
    }
  }catch(_){}
  paintFreeCoinsCopy();
  const el = document.getElementById("g_id_onload");
  if(el && googleClientId) el.setAttribute("data-client_id", googleClientId);
  const btn = document.querySelector(".g_id_signin");
  if(googleClientId && window.google && window.google.accounts && btn){
    try{
      if(!gsiInited){
        window.google.accounts.id.initialize({client_id: googleClientId, callback: window.onGoogleCredential});
        gsiInited = true;
      }
      window.google.accounts.id.renderButton(btn, {type:"standard", shape:"pill", theme:"outline", size:"large"});
    }catch(_){}
  } else if(googleClientId && !gsiInited && gsiTries < 25){
    gsiTries++;
    setTimeout(fetchGoogleConfig, 400);
  }
  const gs = $("#googleStatus");
  if(gs) gs.textContent = googleClientId ? "" : "Google login belum dikonfigurasi admin.";
}
async function readSession(){
  const r = await fetch(API_BASE + API.session, {credentials:"include"});
  const s = await r.json().catch(()=>({}));
  if(!r.ok || !s || s.authenticated !== true || !s.username){
    const why = (s && s.detail) || (r.ok ? "session kosong" : "HTTP " + r.status);
    throw new Error("Sesi tidak tersimpan (" + why + "). Muat ulang halaman lalu coba lagi.");
  }
  return s;
}

async function onGoogleCredential(resp){
  try{
    const r = await fetch(API_BASE + API.googleLogin, {
      method:"POST", headers:{"Content-Type":"application/json"}, credentials:"include",
      body: JSON.stringify({id_token: resp.credential, remember: !!(document.getElementById("rememberMe")?.checked), device_id: _deviceId()})
    });
    const j = await r.json();
    if(!r.ok) throw new Error(friendlyHttpError(r.status, j.detail, "Login Google gagal."));
    csrfToken = j.csrf_token || null;
    const s = await readSession();
    csrfToken = s.csrf_token || csrfToken;
    if(j.signup_zeroed) showFarmWarning();
    $("#accountButton").textContent = s.username.slice(0,1).toUpperCase();
    if(s.theme) applyTheme(s.theme);
    setNavAuth(true, s.role);
    toast(`Masuk sebagai ${s.username} (${s.role})`);
    page(s.role === "admin" ? "admin" : "home");
    await refreshHistory(); await refreshStatus(); await fetchCoin();
    startCoinPoll();
  }catch(e){ toast(e.message); }
}
window.onGoogleCredential = onGoogleCredential;

on("#authForm","submit",async e=>{
  e.preventDefault();
  const username = $("#authEmail").value.trim();
  const password = $("#authPassword").value;
  try{
    const r = await fetch(API_BASE + "/api/login", {method:"POST", headers:{"Content-Type":"application/json"}, credentials:"include", body: JSON.stringify({username,password,remember:!!($("#rememberMe")?.checked)})});
    const j = await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(friendlyHttpError(r.status, j.detail, "Login gagal."));
    const s = await readSession();
    csrfToken = s.csrf_token;
    $("#accountButton").textContent = s.username.slice(0,1).toUpperCase();
    if(s.theme) applyTheme(s.theme);
    setNavAuth(true, s.role);
    toast(`Masuk sebagai ${s.username}`);
    page(s.role === "admin" ? "admin" : "home");
    await refreshHistory(); await refreshStatus(); await fetchCoin();
    startCoinPoll();
  }catch(err){ toast(err.message||"Login gagal."); }
});
on("#logoutBtn","click", async()=>{
  try{
    const s = await fetch(API_BASE + API.session, {credentials:"include"}).then(r=>r.json()).catch(()=>null);
    const tok = csrfToken || (s && s.csrf_token) || "";
    await fetch(API_BASE + API.logout, {method:"POST", headers:{"X-CSRF-Token": tok}, credentials:"include"});
  }catch(_){}
  doLocalLogout();
  toast("Logout berhasil."); page("auth");
});

async function refreshHistory(){
  try{
    const limit = 100; // MAX_STORED_JOBS cap; matches server clamp
    const r = await fetch(API_BASE + API.jobs + `?limit=${limit}`, {credentials:"include"});
    if(!r.ok){ renderHistory(); renderRecent(); return; }
    const j = await r.json();
    // ponytail: admin-only â€” build a lightweight idâ†’username map for the
    // additional User column; cached per page load so we don't re-fetch the
    // full admin users list on every nav back to History.
    if (currentRole === "admin" && !adminUserNames) {
      try {
        const ur = await fetch(API_BASE + "/api/admin/users", {credentials:"include"});
        if (ur.ok) {
          const uj = await ur.json();
          adminUserNames = {};
          (uj.users || []).forEach(u => { adminUserNames[u.id] = u.username; });
        }
      } catch(_){}
    }
    historyData = (j.jobs || []).map(job=>({
      source: job.source_url, target: job.destination || job.result?.destination || (job.download_url ? "[file] "+(job.metadata?.filename||"") : ""),
      resolver: job.backend, time: new Date(job.created_at).toLocaleString("id-ID"), status: job.status==="complete"?"Berhasil":job.status==="failed"?"Gagal":job.status,
      raw: job
    }));
    historyStats = j.stats || null;
    renderHistory(); renderRecent();
  }catch(_){ renderHistory(); renderRecent(); }
}
async function renderUserHistory(userId){
  const rows = document.getElementById("userHistoryRows");
  if(!rows) return;
  const st = document.getElementById("userHistoryStatus");
  try{
    rows.innerHTML = '<tr><td colspan="6">Memuat...</td></tr>';
    const r = await fetch(`${API_BASE}/api/admin/users/${encodeURIComponent(userId)}/jobs?limit=50`, {credentials:"include"});
    const j = await r.json();
    if(!r.ok){
      rows.innerHTML = '<tr><td colspan="6">Gagal memuat.</td></tr>';
      if(st) st.textContent = friendlyHttpError(r.status, j && j.detail, "Gagal memuat.");
      return;
    }
    if(!j.jobs || !j.jobs.length){
      rows.innerHTML = '<tr><td colspan="6">Tidak ada riwayat.</td></tr>';
      if(st) st.textContent = `${j.username} (id ${j.user_id}), 0 job.`;
      return;
    }
    rows.innerHTML = j.jobs.map(job=>{
      const time = job.created_at ? new Date(job.created_at).toLocaleString("id-ID") : "?";
      const pill = job.status==="complete" ? '<span class="pill success">Berhasil</span>'
                 : job.status==="failed"   ? '<span class="pill failed">Gagal</span>'
                 : `<span class="pill warning">${esc(job.status)}</span>`;
      const src = (job.source_url || "").slice(0,60);
      const dest = job.destination || (job.result && job.result.destination) || "";
      const destShort = dest.length > 60 ? dest.slice(0,60) + "..." : dest;
      const dur = fmtDuration(jobDurationSec(job));
      return `<tr><td title="${esc(job.source_url||"")}">${esc(src)}</td>`
        + `<td title="${esc(dest)}">${safeUrl(dest) ? `<a href="${esc(safeUrl(dest))}" target="_blank" rel="noopener">${esc(destShort)}</a>` : (esc(dest) || "-")}</td>`
        + `<td>${esc(job.backend)}</td><td>${esc(time)}</td><td>${esc(dur)}</td><td>${pill}</td></tr>`;
    }).join("");
    if(st) st.textContent = `${j.username} (id ${j.user_id}), ${j.total_jobs} job.`;
  }catch(e){
    rows.innerHTML = '<tr><td colspan="6">Gagal memuat.</td></tr>';
    console.error(e);
  }
}
async function refreshStatus(){
  const label = document.querySelector(".status-label");
  const dot = document.querySelector(".live-dot");
  const pill = document.querySelector(".page-heading > .pill");
  const err = document.querySelector("#statusError");
  let degraded = 0, total = 0;
  try{
    const r = await fetch(API_BASE + API.status);
    const j = await r.json();
    const resolvers = (j.resolvers || []).filter(r => r.backend !== "nypass");
    total = resolvers.length;
    degraded = resolvers.filter(r => !(r.enabled && !r.maintenance_mode)).length;
    if(err) err.classList.add("hidden");
    const list = $("#resolverList");
    if(list) list.innerHTML = resolvers.map(res=>{
      const enabled = res.enabled && !res.maintenance_mode;
      const label = !res.enabled ? "Disabled" : res.maintenance_mode ? "Maintenance" : "Online";
      const pill = !res.enabled ? "failed" : res.maintenance_mode ? "warning" : "success";
      const srVal = (j.success_rate && typeof j.success_rate==="object" && j.success_rate[res.backend]!=null) ? j.success_rate[res.backend] : (typeof j.success_rate==="number"?j.success_rate:null);
      const uptime = (srVal!=null && !isNaN(srVal)) ? (srVal*100).toFixed(1)+"% success" : "belum ada data";
      const rIcon = {sfgl:"link",bicolink:"link",move2link:"link",pndk:"shield",sub4:"chain",sub2unlock:"chain",link2unlock:"link",adsafelink:"shield",shrinkme:"link",ouo:"link",link4sub:"link",linkvertise:"shield",lootlabs:"shield",zflexlink:"chain",adlinksumo:"shield",arahlink:"shield",platorelay:"shield",chain:"chain"}[res.backend]||"link";
      return `<article class="resolver-card"><div class="resolver-icon">${icon(rIcon)}</div><div class="resolver-info"><h2>${esc(res.backend)}</h2><p>${esc(label)}</p><code>/api/${esc(res.backend)}/resolve</code></div><div class="resolver-health"><span class="pill ${pill}">${esc(label)}</span><small>${esc(uptime)}</small></div></article>`;
    }).join("") || '<p class="muted">Tidak ada resolver.</p>';
    if(label) label.textContent = degraded ? `${degraded} resolver bermasalah` : "Semua sistem normal";
    if(dot) dot.className = `live-dot${degraded ? " warn" : ""}`;
    if(pill){
      if(total===0){ pill.className="pill failed"; pill.innerHTML='<span class="live-dot error"></span>Data tidak tersedia'; }
      else if(degraded===0){ pill.className="pill success"; pill.innerHTML='<span class="live-dot"></span>Operasional'; }
      else { pill.className="pill warning"; pill.innerHTML=`<span class="live-dot warn"></span>${degraded} resolver bermasalah`; }
    }
  }catch(_){
    if(label) label.textContent = "Status tidak dapat diperiksa";
    if(dot) dot.className = "live-dot error";
    if(pill){ pill.className="pill failed"; pill.innerHTML='<span class="live-dot error"></span>Data tidak tersedia'; }
    if(err) err.classList.remove("hidden");
  }
}

async function resolveLink(url){
  const backend = backendForUrl(url);
  if(!backend){
    try{
      const s = await fetch(API_BASE + API.session, {credentials:"include"}).then(r=>r.json());
      if(s && s.authenticated && s.role==="admin"){
        const r = await fetch(API_BASE + "/api/admin/chain/resolve", {
          method:"POST", headers:{"Content-Type":"application/json","X-CSRF-Token": csrfToken || s.csrf_token}, credentials:"include",
          body: JSON.stringify({url})
        });
        const j = await r.json(); if(!r.ok) throw new Error(friendlyHttpError(r.status, j.detail, "Chain resolve gagal."));
        return {job_id: j.id, backend:"chain", poll: "/api/jobs/"+j.id, chain:true};
      }
    }catch(e){ if(e.message && e.message.includes("Chain")) throw e; }
    throw new Error("Resolver tidak mendukung host ini. Login sebagai admin untuk chain, atau coba resolver lain.");
  }
  let csrfToken = null;
  try{
    const s = await fetch(API_BASE + API.session, {credentials:"include"}).then(r=>r.json());
    if(s && s.authenticated) csrfToken = s.csrf_token;
  }catch(_){}
  const headers = {"Content-Type":"application/json"};
  if(csrfToken) headers["X-CSRF-Token"] = csrfToken;
  const path = `/api/${backend}/resolve`;
  const r = await fetch(API_BASE + path, {method:"POST", headers, credentials:"include", body: JSON.stringify({url})});
  const j = await jsonOr(r);
  if(!r.ok){
    if(r.status===401){
      toast("Login dulu untuk pakai resolver.");
      page("auth");
      throw new Error("Harus login dulu.");
    }
    const d = j.detail;
    if(d && d.code==="insufficient_coins"){
      showCoinModal(d.cost, d.balance);
      throw new Error(`Coin tidak cukup (butuh ${d.cost}, saldo ${d.balance}). Hubungi admin di Telegram.`);
    }
    throw new Error(friendlyHttpError(r.status, typeof d==="string"?d:d?.message||d?.detail, "Resolve gagal."));
  }
  const jobId = j.job_id || j.id;
  const poll = `/api/${backend}/result/${jobId}`;
  return {job_id: jobId, backend, poll, chain:false};
}

function friendlyStatus(job, elapsed){
  const status = job.status;
  const detail = String(job.progress_detail ?? "");
  if(status==="complete") return {title:"âœ“ Link berhasil di-resolve", sub:`${elapsed}s`, ok:true};
  if(status==="failed"){
    const fe = friendlyJobError(job);
    return {title: fe.t || "Resolve gagal", sub: fe.d || ""};
  }
  if(status==="queued") return {title:"Menunggu giliran...", sub:`${elapsed}s${job.queue_position ? ` Â· Antrian ke-${job.queue_position}` : ""}`};
  if(status==="retrying") return {title:"Mencoba lagi...", sub:`${elapsed}s`};
  const clean = detail.replace(/https?:\/\/[^\s]+/g, "").replace(/\s+/g," ").trim();
  const label = clean ? `, ${clean}` : "";
  return {title:`Sedang memproses link${label}`, sub:`${elapsed}s`};
}

/* F-12: in-progress spinner (hidden by CSS when terminal states render) */
const spinnerHTML = '<span class="resolve-spinner" aria-hidden="true"></span>';

/* Resolve-progress persistence across SPA tab switches.
   page() wipes #app, so element refs captured at submit time detach; the
   poll loops keep running and re-lookup the DOM through these helpers. */

function paintResolveResult(html){
  if(activeResolve) activeResolve.lastHTML = html;
  const el = document.getElementById("resolveResult");
  if(el){ el.innerHTML = html; el.classList.remove("hidden"); }
}
function appendResolveResult(html){
  if(activeResolve) activeResolve.lastHTML = (activeResolve.lastHTML || "") + html;
  const el = document.getElementById("resolveResult");
  if(el) el.innerHTML += html;
}
function paintChainSteps(html, show){
  if(activeResolve) activeResolve.stepsHTML = html;
  const el = document.getElementById("chainSteps");
  if(el){ el.innerHTML = html; el.classList.toggle("hidden", !show); }
}
function restoreResolveUI(){
  const a = activeResolve;
  if(!a) return;
  const input = document.getElementById("urlInput");
  if(input && a.url) input.value = a.url;
  const cb = document.getElementById("chainToggle");
  if(cb && a.chain) cb.checked = true;
  paintResolveResult(a.lastHTML || spinnerHTML + "<b>Menghubungi resolver...</b>");
  if(a.chain && a.stepsHTML) paintChainSteps(a.stepsHTML, true);
  const btn = document.querySelector("#resolveForm button[type=submit]");
  if(btn && !a.terminal){
    btn.disabled = true;
    btn.innerHTML = 'Memproses <span class="btn-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>';
  }
}
// Release the submit button when a job reaches a terminal state, even if the
// original DOM was destroyed by navigation (the restored button stays stuck
// disabled otherwise).
function finishResolve(){
  if(activeResolve) activeResolve.terminal = true;
  const btn = document.querySelector("#resolveForm button[type=submit]");
  if(btn){ btn.disabled = false; btn.innerHTML = 'Resolve <span>â†’</span>'; }
}

async function pollResult(jobId, backend, pollPath, resultEl, startMs){
  const url = API_BASE + pollPath;
  let since = 0;
  const deadline = Date.now() + 300000;
  while(Date.now() < deadline){
    const sep = url.includes("?") ? "&" : "?";
    const r = await pollFetch(url + sep + `wait=20&since=${since}`);
    const j = await r.json().catch(()=>({}));
    if(!r.ok){ if(r.status===401){ toast("Sesi habis, login lagi."); page("auth"); throw new Error("Harus login dulu."); } throw new Error(friendlyHttpError(r.status, j.detail, "Poll gagal.")); }
    if(typeof j.version === "number") since = j.version;
    const elapsed = ((Date.now()-startMs)/1000).toFixed(1);
    const fs = friendlyStatus(j, elapsed);
    if(fs.ok){
      finishResolve();
      const dest = j.destination || j.result?.destination || "";
      paintResolveResult(`<b>${esc(fs.title)}</b><br>${safeUrl(dest) ? `<a href="${esc(safeUrl(dest))}" target="_blank" rel="noopener">${esc(dest)}</a>` : esc(dest)}<br><small>${esc(fs.sub)}</small>`);
      historyPage = 1; historyData.unshift({source: j.source_url, target: dest, resolver: backend, time:"Baru saja", status:"Berhasil"});
      bumpStats(true);
      renderRecent(); renderHistory(); await fetchCoin(); toast("Resolve berhasil.");
      return dest;
    }
    if(j.status==="failed"){
      finishResolve();
      const fe = friendlyJobError(j) || {t:"Gagal", d:""};
      paintResolveResult(
        `<b>${esc(fe.t || "Resolve gagal")}</b>` +
        `<br><small>${esc(fe.d || "")}</small>`
      );
      historyPage = 1; historyData.unshift({source: j.source_url, target:"", resolver: backend, time:"Baru saja", status:"Gagal"});
      bumpStats(false);
      renderRecent(); renderHistory(); await fetchCoin(); toast("Resolver tidak menemukan tujuan." + (refundOnFail && !coinUnlimited ? " Coin dikembalikan." : ""));
      return null;
    }
    paintResolveResult(`${spinnerHTML}<b>${esc(fs.title)}</b><br><small>${esc(fs.sub)}</small>`);
  }
  finishResolve();
  paintResolveResult(`<b>Masih diproses</b><br><small>Resolve melewati batas 5 menit. Cek halaman Riwayat sebentar lagi.</small>`);
  return null;
}

function stillBypassable(url){
  try{
    const h = new URL(url).hostname.toLowerCase().replace(/\.$/,"");
    if(h==="sfl.gl"||h.endsWith(".sfl.gl")||h==="shorturl.at"||h.endsWith(".shorturl.at")||h==="xmz-anti.vercel.app"||h==="id.gociwidey.com") return true;
    if(h==="bicolink.com"||h==="www.bicolink.com"||h==="bicolink.net"||h==="www.bicolink.net"||h==="bicosafe.com"||h==="www.bicosafe.com"||h==="bclnk.net"||h==="www.bclnk.net") return true;
    if(h.endsWith("move2link.co")) return true;
    if(h.endsWith("pndk.to")) return true;
    if(h.endsWith("sub4unlock.io")||h.endsWith("sub4unlock.co")||h.endsWith("subs4unlock.id")||h.endsWith("sub4unlock.com")) return true;
    if(h.endsWith("sub2unlock.io")||h.endsWith("sub2unlock.me")||h.endsWith("sub2unlock.id")||h.endsWith("subunlock.com")) return true;
    if(h.endsWith("link2unlock.com")) return true;
    if(h==="link.adsafelink.com"||h.endsWith(".adsafelink.com")) return true;
    if(h==="adlinksumo.com"||h.endsWith(".adlinksumo.com")) return true;
    if(h.endsWith("shrinkme.click")||h.endsWith("shrinkme.io")||h.endsWith("shrinke.me")) return true;
    if(h.endsWith("ouo.io")) return true;
  }catch(_){}
  return false;
}
async function pollChain(jobId, resultEl, stepsEl, startMs){
  const url = API_BASE + "/api/jobs/" + jobId;
  let since = 0;
  const deadline = Date.now() + 300000;
  while(Date.now() < deadline){
    const sep = url.includes("?") ? "&" : "?";
    const r2 = await pollFetch(url + sep + `wait=20&since=${since}`);
    const j = await r2.json().catch(()=>({}));
    if(!r2.ok){
      if(r2.status===401){ toast("Sesi habis, login lagi."); page("auth"); throw new Error("Harus login dulu."); }
      throw new Error(friendlyHttpError(r2.status, typeof j.detail==="string"?j.detail:j?.detail||j?.message||"Poll gagal.", "Poll gagal."));
    }
    if(typeof j.version === "number") since = j.version;
    if(j.status==="complete"){
      finishResolve();
      const steps = j.result?.steps || [];
      const dest = j.destination || j.result?.destination || "";
      const sum = steps.reduce((a,s)=>a+Number(s.elapsed_sec||0),0);
      const shown = sum > 0 ? sum.toFixed(1) : ((Date.now()-startMs)/1000).toFixed(1);
      paintResolveResult(`<b>âœ“ Selesai (${steps.length} langkah)</b><br>${safeUrl(dest) ? `<a href="${esc(safeUrl(dest))}" target="_blank" rel="noopener">${esc(dest)}</a>` : esc(dest)}<br><small>${esc(shown)}s</small>`);
      if(stepsEl || true){
        paintChainSteps(steps.map((st,i)=>`<div style="padding:6px 0;border-bottom:1px solid var(--line)"><small>${i+1}. <b>${esc(st.backend)}</b></small><br><span class="muted small">${esc(st.source)}</span><br>${safeUrl(st.destination) ? `<a href="${esc(safeUrl(st.destination))}" target="_blank" rel="noopener" style="word-break:break-all">${esc(st.destination)}</a>` : esc(st.destination)} <small>${st.elapsed_sec ?? 0}s</small></div>`).join("") || '<small>Tidak ada hop.</small>', true);
      }
      historyPage = 1; historyData.unshift({source: j.source_url, target: dest, resolver: "chain:"+steps.map(x=>x.backend).join(""), time:"Baru saja", status:"Berhasil"});
      bumpStats(true);
      renderRecent(); renderHistory(); await fetchCoin(); toast(`Chain selesai, ${steps.length} hop.`);
      return dest;
    }
    if(j.status==="failed"){
      finishResolve();
      const fe = friendlyJobError(j) || {t:"Gagal", d:""};
      const stepsF = j.result?.steps || [];
      const sumF = stepsF.reduce((a,s)=>a+Number(s.elapsed_sec||0),0);
      const shownF = sumF > 0 ? sumF.toFixed(1) : ((Date.now()-startMs)/1000).toFixed(1);
      paintResolveResult(
        `<b>${esc(fe.t || "Gagal memproses")}</b>` +
        `<br><small>${esc(fe.d || "")}</small>` +
        `<br><small>${esc(shownF)}s</small>`
      );
      if(j.result?.steps?.length){
        paintChainSteps(j.result.steps.map((st,i)=>`<div style="padding:4px 0"><small>${i+1}. <b>${esc(st.backend)}</b> ${esc(st.source)}</small></div>`).join(""), true);
      }
      historyPage = 1; historyData.unshift({source: j.source_url, target:"", resolver:"chain", time:"Baru saja", status:"Gagal"});
      bumpStats(false);
      renderRecent(); renderHistory(); await fetchCoin(); toast("Chain gagal." + (refundOnFail && !coinUnlimited ? " Coin dikembalikan." : ""));
      return null;
    }
    const cur = j.result?.steps?.length || 0;
    const elapsed = ((Date.now()-startMs)/1000).toFixed(1);
    const queue = j.queue_position ? ` Â· Antrian ke-${j.queue_position}` : "";
    paintResolveResult(`${spinnerHTML}<b>Sedang memproses</b><br><small>${esc(elapsed)}s Â· ${cur>0?`langkah ${cur}`:"menunggu giliran..."}${esc(queue)}</small>`);
    if(j.result?.steps?.length){
      paintChainSteps(j.result.steps.map((st,i)=>`<div style="padding:4px 0"><small>${i+1}. <b>${esc(st.backend)}</b> ${esc(st.source)}</small></div>`).join(""), true);
    }
  }
  finishResolve();
  paintResolveResult(`<b>Masih diproses</b><br><small>Chain melewati batas 5 menit. Cek halaman Riwayat sebentar lagi.</small>`);
  return null;
}

on("#resolveForm","submit",async e=>{
  e.preventDefault();
  const input=$("#urlInput"),button=e.submitter,result=$("#resolveResult");
  let url=input.value.trim();
  if(url && !/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) url = "https://" + url;
  try{new URL(url)}catch(_){toast("Format URL tidak valid.");return}
  button.disabled=true;button.innerHTML='Memproses <span class="btn-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>';result.classList.remove("hidden");paintResolveResult(`${spinnerHTML}Menghubungi resolver...`);
  const chainStepsEl = document.getElementById("chainSteps");
  if(chainStepsEl){ chainStepsEl.classList.add("hidden"); chainStepsEl.innerHTML=""; }
  const start=Date.now();
  try{
    const useChain = document.getElementById("chainToggle")?.checked;
    if(useChain){
      let csrf = csrfToken;
      try{ const sess = await fetch(API_BASE + API.session, {credentials:"include"}).then(r=>r.json()); csrf = sess.csrf_token || csrf; }catch(_){}
      const rChain = await fetch(API_BASE + "/api/chain/resolve", {method:"POST", headers:{"Content-Type":"application/json","X-CSRF-Token": csrf || ""}, credentials:"include", body: JSON.stringify({url})});
      const jChain = await jsonOr(rChain);
      if(!rChain.ok){
        if(rChain.status===401){ toast("Login dulu untuk pakai resolver."); page("auth"); throw new Error("Harus login dulu."); }
        const d=jChain.detail;
        if(d && d.code==="insufficient_coins"){ showCoinModal(d.cost, d.balance); throw new Error(`Coin tidak cukup (butuh ${d.cost}, saldo ${d.balance}).`); }
        throw new Error(friendlyHttpError(rChain.status, typeof d==="string"?d:d?.message||d?.detail, "Chain resolve gagal."));
      }
      activeResolve = {jobId: jChain.id, backend:"chain", poll:"/api/jobs/"+jChain.id, chain:true, url, startMs:start, lastHTML: spinnerHTML+"Chain job polling...", stepsHTML:"", terminal:false};
      paintResolveResult(spinnerHTML+"Chain job polling...");
      const dest = await pollChain(jChain.id, result, chainStepsEl, start);
      if(dest && stillBypassable(dest) && dest !== url.trim()){
        appendResolveResult(`<br><button class="outline-btn small" id="continueChain">Lanjutkan chain ${esc(dest.slice(0,40))}...</button>`);
        document.getElementById("continueChain")?.addEventListener("click", ()=>{ document.getElementById("urlInput").value=dest; document.getElementById("resolveForm").requestSubmit(); });
      }
    } else {
      const job = await resolveLink(url);
      activeResolve = {jobId: job.job_id, backend: job.backend, poll: job.poll, chain:false, url, startMs:start, lastHTML: spinnerHTML+"<b>Sedang memproses link</b>", stepsHTML:"", terminal:false};
      const elapsed2=((Date.now()-start)/1000).toFixed(1);
      paintResolveResult(`${spinnerHTML}<b>Sedang memproses link</b><br><small>${elapsed2}s</small>`);
      await pollResult(job.job_id, job.backend, job.poll, result, start);
      try{
        const dest2 = await fetch(API_BASE + job.poll, {credentials:"include"}).then(r=>r.json()).then(j=>j.destination || j.result?.destination || null);
        if(dest2 && stillBypassable(dest2) && dest2 !== url.trim()){
          appendResolveResult(`<br><button class="outline-btn small" id="continueChain2">Lanjutkan chain ${esc(dest2.slice(0,40))}...</button>`);
          document.getElementById("continueChain2")?.addEventListener("click", ()=>{ document.getElementById("urlInput").value=dest2; const cb=document.getElementById("chainToggle"); if(cb) cb.checked=true; document.getElementById("resolveForm").requestSubmit(); });
        }
      }catch(_){}
    }
  }catch(err){
    const msg = (err instanceof TypeError || /Failed to fetch/i.test(err.message))
      ? "Tidak dapat menghubungi server. Cek koneksi internet Anda."
      : (err.message || "Terjadi kesalahan. Coba lagi nanti.");
    if(!activeResolve) activeResolve = {jobId:null, backend:null, poll:null, chain:false, url, startMs:start, lastHTML:"", stepsHTML:"", terminal:true};
    finishResolve();
    paintResolveResult(`<b title="${esc(err.message || "")}">Terjadi kesalahan</b><br>${esc(msg)}`);
    toast(msg);
  }
  finally{
    // Mid-flight navigation leaves a fresh form behind; restoreResolveUI owns
    // that button's state and finishResolve() releases it on terminal.
    if(!activeResolve || activeResolve.terminal){
      button.disabled=false;button.innerHTML='Resolve <span>â†’</span>'
    }
  }
});

async function renderAdmin(){
  let sess=null;
  try{ sess = await fetch(API_BASE + API.session, {credentials:"include"}).then(r=>r.json()); }catch(_){}
  const loginCard = document.getElementById("adminLoginCard");
  const toolsDiv  = document.getElementById("adminTools");
  if(!sess || sess.role !== "admin"){
    if(loginCard) loginCard.style.display = "";
    if(toolsDiv)  toolsDiv.style.display = "none";
    if(sess && sess.role === "user"){
      toast("Akun ini bukan admin. Tidak bisa akses panel admin.");
    }
    return;
  }
  if(loginCard) loginCard.style.display = "none";
  if(toolsDiv)  toolsDiv.style.display = "";
  csrfToken = sess.csrf_token;
  currentAdminId = sess.user_id;
  await refreshUserCoins(currentAdminId);
  try{
    const [resR, costR, refR, asR, annR, fcR] = await Promise.all([
      fetch(API_BASE + API.adminResolvers, {credentials:"include"}),
      fetch(API_BASE + API.coinCosts, {credentials:"include"}).catch(()=>null),
      fetch(API_BASE + API.refundOnFail, {credentials:"include"}).catch(()=>null),
      fetch(API_BASE + API.allowSignup, {credentials:"include"}).catch(()=>null),
      fetch(API_BASE + API.adminAnnouncement, {credentials:"include"}).catch(()=>null),
      fetch(API_BASE + API.freeCoins, {credentials:"include"}).catch(()=>null),
    ]);
    const resolvers = ((await resR.json()).resolvers || []).filter(r => r.backend !== "nypass");
    const ar=$("#adminRows");
    if(ar) ar.innerHTML = resolvers.map(r=>`<tr><td><b>${esc(r.backend)}</b></td><td><code>/api/${esc(r.backend)}/resolve</code></td><td><span class="pill ${r.enabled?"success":"failed"}">${r.enabled?"Enabled":"Disabled"}</span></td><td><input type="checkbox" data-maint="${esc(r.backend)}" ${r.maintenance_mode?"checked":""}></td><td><input type="checkbox" data-en="${esc(r.backend)}" ${r.enabled?"checked":""}></td><td><input type="number" min="1" max="100000" step="1" style="width:72px" data-rate="${esc(r.backend)}" value="${r.rate_limit_rpm ?? ""}"/></td></tr>`).join("") || '<tr><td colspan="6">Tidak ada resolver.</td></tr>';
    if(costR && costR.ok){
      const cj = await costR.json(); const inp=$("#coinCostInput"); if(inp) inp.value = cj.cost;
    }
    if(refR && refR.ok){
      const rj = await refR.json(); refundOnFail = !!rj.refund_on_fail;
      const cb = $("#refundOnFailInput"); if(cb) cb.checked = refundOnFail;
    }
    if(asR && asR.ok){
      const aj = await asR.json(); allowSignup = !!aj.allow_signup;
      const cb = $("#allowSignupInput"); if(cb) cb.checked = allowSignup;
    }
    if(fcR && fcR.ok){
      const fj = await fcR.json();
      freeCoinsEnabled = fj.free_coins_enabled !== false;
      const cb = $("#freeCoinsEnabledInput"); if(cb) cb.checked = freeCoinsEnabled;
    }
    if(annR && annR.ok){
      const aj = await annR.json();
      const en=$("#announcementEnabled"), ti=$("#announcementTitleInput"),
            bo=$("#announcementBodyInput"), lv=$("#announcementLevelInput");
      if(en) en.checked = !!aj.enabled;
      if(ti) ti.value = aj.title || "";
      if(bo) bo.value = aj.body || "";
      if(lv && aj.level) lv.value = aj.level;
    }
  }catch(e){ toast("Gagal memuat admin. " + (friendlyHttpError(null, e.message, "") || "Coba lagi.")); }
}
on("[data-en]","change", async (_e,t)=>{
  await fetch(`${API_BASE}/api/admin/resolvers/${t.dataset.en}`, {method:"PATCH", headers:{"Content-Type":"application/json","X-CSRF-Token":csrfToken}, credentials:"include", body: JSON.stringify({enabled: t.checked})});
  toast("Disimpan."); refreshStatus();
});
on("[data-maint]","change", async (_e,t)=>{
  const r = await fetch(`${API_BASE}/api/admin/resolvers/${t.dataset.maint}`, {method:"PATCH", headers:{"Content-Type":"application/json","X-CSRF-Token":csrfToken}, credentials:"include", body: JSON.stringify({maintenance: t.checked})});
  if(!r.ok){ toast("Gagal simpan maintenance."); return; }
  toast("Disimpan.");
  refreshStatus();
});
on("[data-rate]","change", async (_e,t)=>{
  const rpm = parseInt(t.value, 10);
  if(!Number.isFinite(rpm) || rpm < 1){ toast("Rate harus >= 1."); refreshAdmin(); return; }
  const resp = await fetch(`${API_BASE}/api/admin/resolvers/${t.dataset.rate}`, {method:"PATCH", headers:{"Content-Type":"application/json","X-CSRF-Token":csrfToken}, credentials:"include", body: JSON.stringify({rate_limit_rpm: rpm})});
  toast(resp.ok ? "Rate disimpan." : "Gagal simpan rate.");
});

const USER_SORT_FIELDS = {
  id: u => u.id,
  username: u => String(u.username || "").toLowerCase(),
  role: u => String(u.role || ""),
  status: u => (u.active ? 1 : 0) * 2 + (u.stopped ? 0 : 1),
  coins: u => u.coins ?? 0,
  created_at: u => u.created_at ?? 0,
};
const fmtCreated = ts => ts ? new Date(ts * 1000).toLocaleString("id-ID", {day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit"}) : "";
function sortUsers(rows){
  const get = USER_SORT_FIELDS[userSortKey] || USER_SORT_FIELDS.id;
  return [...rows].sort((a,b)=>{
    const av = get(a), bv = get(b);
    if(av < bv) return -userSortDir;
    if(av > bv) return userSortDir;
    return (a.id - b.id) * userSortDir;
  });
}
function paintUserSortIndicators(){
  $$("[data-user-sort]").forEach(el=>{
    const mark = el.querySelector(".sort-mark");
    const active = el.dataset.userSort === userSortKey;
    if(mark) mark.textContent = active ? (userSortDir > 0 ? "\u25B2" : "\u25BC") : "\u21C5";
    el.classList.toggle("sort-active", active);
  });
}
function renderUserRows(){
  const tbody = document.getElementById("userRows");
  if(!tbody) return;
  const q = (($("#userSearch")?.value) || "").trim().toLowerCase();
  if(q !== renderUserRows._lastQuery){
    renderUserRows._lastQuery = q;
    userPage = 1;
  }
  let rows = usersLast;
  if(q){
    rows = rows.filter(u =>
      (u.username || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q));
  }
  rows = sortUsers(rows);
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / USER_PAGE_SIZE));
  if(userPage > pages) userPage = pages;
  if(userPage < 1) userPage = 1;
  const start = (userPage - 1) * USER_PAGE_SIZE;
  const pageRows = rows.slice(start, start + USER_PAGE_SIZE);
  const myId = usersLastMyId;
  tbody.innerHTML = pageRows.length ? pageRows.map(u=>`<tr><td>${u.id}</td><td><b>${esc(u.username)}</b></td><td><span class="pill ${u.role==="admin"?"success":"warning"}">${esc(u.role)}</span></td><td>${u.active?"Aktif":"Nonaktif"}${u.stopped?" (stopped)":""}</td><td><b>${u.coins ?? 0}</b> coin${u.coin_eligible===false?' <span class="pill" style="background:#fee;color:#8a3b1f;border:1px solid #fca5a5;font-size:10px;padding:0 4px;border-radius:3px">blocked</span>':''}</td><td class="muted small">${esc(fmtCreated(u.created_at))}</td><td><input id="email-${u.id}" value="${esc(u.email ?? "")}" placeholder="email" autocomplete="off" style="width:150px" /> <button class="outline-btn small" data-set-email="${u.id}">Simpan</button> ${u.email ? `<button class="outline-btn small" data-clear-email="${u.id}">Hapus</button>` : ""}</td><td style="display:flex;gap:4px;align-items:center"><input id="coins-${u.id}" type="number" value="" placeholder="+/-" style="width:70px" /><button class="outline-btn small" data-set="${u.id}">Set</button><button class="outline-btn small" data-add5="${u.id}">+5</button><button class="outline-btn small" data-add10="${u.id}">+10</button></td><td>${u.id===myId ? '<span class="muted small">Akun kamu</span>' : `<button class="outline-btn small" data-stop-user="${u.id}" data-stopped="${u.stopped}">${u.stopped?"Aktifkan":"Stop"}</button> <button class="outline-btn small" data-history-user="${u.id}">Riwayat</button> ${u.id!==currentAdminId?` <button class="outline-btn small ${u.coin_eligible!==false?'success':'danger'}" data-toggle-eligibility="${u.id}" data-current="${u.coin_eligible!==false?1:0}">${u.coin_eligible!==false?"âœ…":"ðŸš«"}</button>`:''}`}</td></tr>`).join("") : `<tr><td colspan="9" class="muted small">Tidak ada user cocok untuk "${esc(q)}".</td></tr>`;
  renderUserPager(total);
  paintUserSortIndicators();
}
renderUserRows._lastQuery = "";
function renderUserPager(total){
  const el = document.getElementById("userPager");
  if(!el) return;
  if(!total){ el.classList.add("hidden"); return; }
  el.classList.remove("hidden");
  const pages = Math.max(1, Math.ceil(total / USER_PAGE_SIZE));
  const from = (userPage - 1) * USER_PAGE_SIZE + 1;
  const to = Math.min(userPage * USER_PAGE_SIZE, total);
  el.innerHTML =
    `<button class="outline-btn small" data-user-page="prev"${userPage<=1?" disabled":""}>Sebelumnya</button>` +
    `<span class="muted small">Menampilkan ${from}â€“${to} dari ${total} user Â· Halaman ${userPage} / ${pages}</span>` +
    `<button class="outline-btn small" data-user-page="next"${userPage>=pages?" disabled":""}>Berikutnya</button>`;
}
async function refreshUserCoins(myId=null){
  try{
    const r = await fetch(API_BASE + "/api/admin/users", {credentials:"include"});
    if(!r.ok) return;
    const j = await r.json();
    usersLast = j.users || [];
    usersLastMyId = myId;
    renderUserRows();
  }catch(e){ console.error(e); }
}
async function grantCoins(id, delta, label){
  const r2 = await fetch(`${API_BASE}/api/admin/users/${id}/coins`, {method:"POST", headers:{"Content-Type":"application/json","X-CSRF-Token":csrfToken}, credentials:"include", body: JSON.stringify({delta})});
  const jj = await r2.json();
  if(!r2.ok){ toast(friendlyHttpError(r2.status, jj.detail, "Operasi gagal. Coba lagi.")); return false; }
  toast(`${label} untuk user ${id}, saldo baru ${jj.balance}`);
  await refreshUserCoins(); await refreshCoin();
  return true;
}
on("[data-set]","click", async (_e,t)=>{
  const id=t.dataset.set;
  const inp=document.getElementById("coins-"+id);
  const delta=parseInt(inp.value,10);
  if(!delta){ toast("Isi delta (mis. 10 atau -5)"); return; }
  if(await grantCoins(id, delta, `${delta>0?"+":""}${delta} coin`)) inp.value="";
});
on("[data-add5]","click", (_e,t)=>grantCoins(t.dataset.add5, 5, "+5 coin"));
on("[data-add10]","click", (_e,t)=>grantCoins(t.dataset.add10, 10, "+10 coin"));
on("[data-toggle-eligibility]","click", async (_e,t)=>{
  const id = t.dataset.toggleEligibility;
  const cur = t.dataset.current === "1";
  const r = await fetch(`${API_BASE}/api/admin/users/${id}/coin-eligible`, {method:"PATCH", headers:{"Content-Type":"application/json","X-CSRF-Token":csrfToken}, credentials:"include", body: JSON.stringify({coin_eligible: !cur})});
  const j = await r.json().catch(()=>({}));
  if(!r.ok){ toast(friendlyHttpError(r.status, j.detail || j, "Gagal ubah akses coin harian.")); return; }
  toast(`User ${id}: akses coin harian ${j.coin_eligible ? "diaktifkan" : "diblokir"}.`);
  await refreshUserCoins(currentAdminId);
});
on("[data-set-email]","click", async (_e,t)=>{
  const id = t.dataset.setEmail;
  const inp = document.getElementById("email-" + id);
  const val = (inp ? inp.value : "").trim();
  const r = await fetch(`${API_BASE}/api/admin/users/${id}/email`, {method:"PATCH", headers:{"Content-Type":"application/json","X-CSRF-Token":csrfToken}, credentials:"include", body: JSON.stringify({email: val || null})});
  const j = await r.json().catch(()=>({}));
  if(!r.ok){ toast(friendlyHttpError(r.status, j.detail || j, "Gagal simpan email.")); return; }
  toast(`Email user ${id} disimpan.`);
  await refreshUserCoins(currentAdminId);
});
on("[data-clear-email]","click", async (_e,t)=>{
  const id = t.dataset.clearEmail;
  const r = await fetch(`${API_BASE}/api/admin/users/${id}/email`, {method:"PATCH", headers:{"Content-Type":"application/json","X-CSRF-Token":csrfToken}, credentials:"include", body: JSON.stringify({email: null})});
  if(!r.ok){ toast("Gagal hapus email."); return; }
  toast(`Email user ${id} dihapus.`);
  await refreshUserCoins(currentAdminId);
});
on("#userSearch","input",renderUserRows);
on("[data-stop-user]","click", async (_e,t)=>{
  const id=t.dataset.stopUser;
  const wantStopped = t.dataset.stopped !== "true";
  if(wantStopped && !confirm(`Hentikan user ${id}? User ini tidak bisa memakai resolver sampai diaktifkan lagi.`)) return;
  const r = await fetch(`${API_BASE}/api/admin/users/${id}/stopped`, {method:"PATCH", headers:{"Content-Type":"application/json","X-CSRF-Token":csrfToken}, credentials:"include", body: JSON.stringify({stopped: wantStopped})});
  const j = await r.json();
  if(!r.ok){ toast(friendlyHttpError(r.status, j && j.detail, "Operasi gagal.")); return; }
  toast(wantStopped ? `User ${id} dihentikan.` : `User ${id} diaktifkan kembali.`);
  await refreshUserCoins(currentAdminId);
});
on("[data-history-user]","click", (_e,t)=>{
  const rows = document.getElementById("userHistoryRows");
  const st = document.getElementById("userHistoryStatus");
  if(rows) rows.innerHTML = '<tr><td colspan="6">Memuat...</td></tr>';
  if(st) st.textContent = `Memuat riwayat untuk user ${t.dataset.historyUser}...`;
  renderUserHistory(t.dataset.historyUser);
});

on("#refreshUsers","click", ()=>refreshUserCoins(currentAdminId));
on("[data-user-sort]","click", (_e,t)=>{
  const key = t.dataset.userSort;
  if(userSortKey === key){ userSortDir = -userSortDir; } else { userSortKey = key; userSortDir = 1; }
  userPage = 1;
  renderUserRows();
});
on("[data-user-page]","click", (_e,t)=>{
  userPage += t.dataset.userPage === "next" ? 1 : -1;
  renderUserRows();
});
on("#grantCoinsBtn","click", async()=>{
  const uid = parseInt($("#grantUserId").value,10);
  const delta = parseInt($("#grantDelta").value,10);
  if(!uid || !delta){ toast("Isi User ID dan Delta."); return; }
  const r = await fetch(`${API_BASE}/api/admin/users/${uid}/coins`, {method:"POST", headers:{"Content-Type":"application/json","X-CSRF-Token":csrfToken}, credentials:"include", body: JSON.stringify({delta})});
  const j = await r.json();
  if(!r.ok){ toast(friendlyHttpError(r.status, j.detail, "Grant gagal. Coba lagi.")); return; }
  $("#grantResult").textContent = `Saldo baru: ${j.balance}`;
  toast(`Grant ${delta} ke user ${uid} berhasil.`);
});
on("#saveCoinCost","click", async()=>{
  const cost = parseInt($("#coinCostInput").value,10);
  const r = await fetch(API_BASE + "/api/admin/coins/cost", {method:"PATCH", headers:{"Content-Type":"application/json","X-CSRF-Token":csrfToken}, credentials:"include", body: JSON.stringify({cost})});
  const j = await r.json();
  if(!r.ok){ toast(friendlyHttpError(r.status, j.detail, "Simpan gagal. Coba lagi.")); return; }
  coinCost = j.cost; toast(`Coin cost = ${coinCost}`);
});
on("#saveRefundOnFail","click", async()=>{
  const cb = $("#refundOnFailInput");
  const val = !!(cb && cb.checked);
  const r = await fetch(API_BASE + API.refundOnFail, {method:"PATCH", headers:{"Content-Type":"application/json","X-CSRF-Token":csrfToken}, credentials:"include", body: JSON.stringify({refund_on_fail: val})});
  const j = await r.json();
  if(!r.ok){ toast(friendlyHttpError(r.status, j.detail, "Simpan gagal. Coba lagi.")); return; }
  refundOnFail = !!j.refund_on_fail;
  toast(refundOnFail ? "Refund saat gagal: aktif." : "Refund saat gagal: nonaktif, coin tetap terpakai.");
});
on("#saveAllowSignup","click", async()=>{
  const cb = $("#allowSignupInput");
  const val = !!(cb && cb.checked);
  const r = await fetch(API_BASE + API.allowSignup, {method:"PATCH", headers:{"Content-Type":"application/json","X-CSRF-Token":csrfToken}, credentials:"include", body: JSON.stringify({allow_signup: val})});
  const j = await r.json();
  if(!r.ok){ toast(friendlyHttpError(r.status, j.detail, "Simpan gagal. Coba lagi.")); return; }
  allowSignup = j.allow_signup;
  toast(allowSignup ? "Pendaftaran diizinkan." : "Pendaftaran dinonaktifkan.");
});
on("#saveFreeCoins","click", async()=>{
  const cb = $("#freeCoinsEnabledInput");
  const val = !!(cb && cb.checked);
  const r = await fetch(API_BASE + API.freeCoins, {method:"PATCH", headers:{"Content-Type":"application/json","X-CSRF-Token":csrfToken}, credentials:"include", body: JSON.stringify({free_coins_enabled: val})});
  const j = await r.json();
  if(!r.ok){ toast(friendlyHttpError(r.status, j.detail, "Simpan gagal. Coba lagi.")); return; }
  freeCoinsEnabled = !!j.free_coins_enabled;
  paintFreeCoinsCopy();
  toast(freeCoinsEnabled
    ? "Coin gratis harian: aktif (3 coin/user setiap 00.00 WIB)."
    : `Coin gratis harian: nonaktif. Saldo gratis dikosongkan untuk ${j.users ?? 0} user.`);
});
on("#saveAnnouncement","click", async()=>{
  const val = {
    enabled: !!($("#announcementEnabled") && $("#announcementEnabled").checked),
    title: ($("#announcementTitleInput") || {}).value || "",
    body: ($("#announcementBodyInput") || {}).value || "",
    level: ($("#announcementLevelInput") || {}).value || "info",
  };
  const r = await fetch(API_BASE + API.adminAnnouncement, {method:"PATCH", headers:{"Content-Type":"application/json","X-CSRF-Token":csrfToken}, credentials:"include", body: JSON.stringify(val)});
  const j = await r.json();
  if(!r.ok){ toast(friendlyHttpError(r.status, j.detail, "Simpan gagal. Coba lagi.")); return; }
  toast(val.enabled ? "Pengumuman aktif." : "Pengumuman disimpan (nonaktif).");
});

// Bootstrap
(async()=>{
  await fetchTelegramConfig();
  await fetchCoin().catch(()=>{});
  // Prime the announcement pill: fetch once so the pill can show its "has news"
  // state before the user clicks.
  await fetchAnnouncement().then(paintAnnouncement).catch(()=>{});
  let authed = false, role = null, theme = "", uname = "";
  try{
    const s = await fetch(API_BASE + API.session, {credentials:"include"}).then(r=>r.json());
    if(s && s.authenticated){ authed = true; role = s.role; theme = s.theme || ""; uname = s.username || ""; csrfToken = s.csrf_token; currentRole = s.role || ""; sessionUserId = s.user_id; sessionUsername = s.username || ""; }
  }catch(_){}
  const ab=$("#accountButton"); if(ab) ab.textContent = authed ? (uname.slice(0,1).toUpperCase() || "U") : "U";
  if(authed && theme) applyTheme(theme);
  setNavAuth(authed, role);
  if(authed) startCoinPoll();
  else stopCoinPoll();
  document.addEventListener("visibilitychange", ()=>{ if(csrfToken && document.visibilityState==="visible"){ startCoinPoll(); refreshCoin().catch(()=>{}); } });

  (function(){
    const root = document.documentElement, btn = $("#themeToggle");
    function sync() { const u = btn && btn.querySelector("use"); if(u) u.setAttribute("href", root.getAttribute("data-theme")==="dark" ? "#icon-sun" : "#icon-moon"); }
    sync();
    if(btn) btn.addEventListener("click", () => {
      const next = currentTheme()==="dark" ? "light" : "dark";
      applyTheme(next);
      if(csrfToken){
        fetch(API_BASE + API.theme, {method:"POST", headers:{"Content-Type":"application/json","X-CSRF-Token":csrfToken}, credentials:"include", body: JSON.stringify({theme:next})}).catch(function(){});
      }
    });
  })();

  // Render the default page after a short delay so the static shell paints first.
  const wantAdmin = location.pathname.replace(/\/+$/,"") === "/admin";
  setTimeout(()=>{ if(currentPageName==="home") page(wantAdmin ? "admin" : "home"); }, 250);
  const fy = document.getElementById("footerYear"); if(fy) fy.textContent = new Date().getFullYear();

  document.addEventListener("keydown", e=>{
    if(e.key==="Escape"){
      if(!$("#coinModal").classList.contains("hidden")) closeCoinModal();
      else if(!$("#farmWarningModal").classList.contains("hidden")) closeFarmWarning();
      else if(!$("#accountDrawer").classList.contains("closed")) closeDrawer();
      else closeAnnouncement();
    }
  });
})();
