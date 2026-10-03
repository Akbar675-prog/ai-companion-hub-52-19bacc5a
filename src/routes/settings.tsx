import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Sparkles,
  Gauge,
  MousePointerClick,
  Sun,
  Moon,
  Monitor,
  Languages,
  Search,
  Check,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useSettings, type ThemeMode } from "@/lib/settings";
import { LANGUAGES, findLanguage, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Pengaturan — Galileo Mod APK" },
      {
        name: "description",
        content:
          "Atur tema terang/gelap, pilih bahasa situs dari puluhan bahasa dunia, dan sesuaikan performa Galileo Mod APK.",
      },
      { property: "og:title", content: "Pengaturan — Galileo Mod APK" },
      {
        property: "og:description",
        content: "Tema terang & gelap, pilihan bahasa lengkap, dan opsi performa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { settings, update } = useSettings();
  const { lang, setLang, t, loading } = useI18n();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.native.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q),
    );
  }, [query]);

  const current = findLanguage(lang);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 pt-6 md:px-8">
        <Link
          to="/"
          aria-label={t("Kembali")}
          className="inline-flex size-10 items-center justify-center rounded-full bg-surface-variant transition-colors hover:bg-primary-container"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <span className="text-sm text-muted-foreground">{t("Kembali")}</span>
      </div>

      <main className="mx-auto max-w-2xl px-5 pb-24 pt-4 md:px-8">
        <h1 className="font-display text-4xl leading-tight md:text-5xl">
          {t("Pengaturan")}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {t("Sesuaikan tema, bahasa, dan performa agar pas dengan perangkatmu.")}
        </p>

        <section className="mt-8">
          <h2 className="font-display text-xl">{t("Tema situs")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("Pilih tampilan terang, gelap, atau ikuti sistem.")}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <ThemeCard
              mode="light"
              active={settings.theme === "light"}
              icon={<Sun className="size-5" />}
              label={t("Terang")}
              onSelect={() => update({ theme: "light" })}
            />
            <ThemeCard
              mode="dark"
              active={settings.theme === "dark"}
              icon={<Moon className="size-5" />}
              label={t("Gelap")}
              onSelect={() => update({ theme: "dark" })}
            />
            <ThemeCard
              mode="system"
              active={settings.theme === "system"}
              icon={<Monitor className="size-5" />}
              label={t("Sistem")}
              onSelect={() => update({ theme: "system" })}
            />
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-center gap-2">
            <Languages className="size-5 text-primary" />
            <h2 className="font-display text-xl">{t("Bahasa")}</h2>
            {loading && <m3e-loading-indicator className="m3-loading-sm" aria-label="Memuat bahasa" />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(
              "Seluruh situs — termasuk nama dan deskripsi aplikasi — akan diterjemahkan ke bahasa pilihanmu.",
            )}
          </p>
          <p className="mt-2 text-sm">
            <span className="text-muted-foreground">{t("Bahasa aktif")}: </span>
            <span className="font-semibold">
              {current.flag} {current.native}
            </span>
            <span className="ml-1 text-muted-foreground">({current.name})</span>
          </p>
          {loading && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-primary">
              <m3e-loading-indicator className="m3-loading-sm" aria-label="Menerjemahkan" />
              {t("Menerjemahkan halaman…")}
            </p>
          )}

          <div className="m3-shadow-1 mt-4 flex items-center gap-2 rounded-full bg-card px-4 py-3">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Cari bahasa…")}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="m3-shadow-1 mt-3 max-h-[22rem] overflow-y-auto rounded-2xl bg-card p-2">
            {filtered.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                {t("Bahasa tidak ditemukan.")}
              </p>
            ) : (
              filtered.map((l) => {
                const active = l.code === lang;
                return (
                  <button
                    key={l.code}
                    onClick={() => setLang(l.code)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      active
                        ? "bg-primary-container text-on-primary-container"
                        : "hover:bg-surface-variant"
                    }`}
                  >
                    <span className="text-lg leading-none">{l.flag}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{l.native}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {l.name}
                      </span>
                    </span>
                    {active &&
                      (loading ? (
                        <m3e-loading-indicator className="m3-loading-sm shrink-0" aria-label="Menerjemahkan" />
                      ) : (
                        <Check className="size-4 shrink-0" />
                      ))}
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="font-display text-xl">{t("Performa")}</h2>
          <Toggle
            icon={<Sparkles className="size-5" />}
            title={t("Kurangi animasi")}
            desc={t("Matikan transisi & animasi berat pada tombol dan kartu.")}
            checked={settings.reduceMotion}
            onChange={(v) => update({ reduceMotion: v })}
          />
          <Toggle
            icon={<Gauge className="size-5" />}
            title={t("Mode grafik rendah")}
            desc={t("Turunkan bayangan, blur, dan efek visual untuk pengalaman ringan.")}
            checked={settings.lowGraphics}
            onChange={(v) => update({ lowGraphics: v })}
          />
          <Toggle
            icon={<MousePointerClick className="size-5" />}
            title={t("Matikan efek ripple")}
            desc={t("Hilangkan efek gelombang saat menekan tombol.")}
            checked={settings.disableRipple}
            onChange={(v) => update({ disableRipple: v })}
          />
        </section>

        <p className="mt-8 rounded-2xl bg-surface-variant p-4 text-xs text-muted-foreground">
          {t("Pengaturan disimpan otomatis di perangkat ini.")}
        </p>
      </main>
    </div>
  );
}

function ThemeCard({
  active, icon, label, onSelect,
}: {
  mode: ThemeMode;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`m3-shadow-1 flex flex-col items-center gap-2 rounded-2xl p-4 transition-all active:scale-95 ${
        active
          ? "bg-primary-container text-on-primary-container ring-2 ring-primary"
          : "bg-card hover:bg-surface-variant"
      }`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function Toggle({
  icon, title, desc, checked, onChange,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="m3-shadow-1 flex cursor-pointer items-center gap-4 rounded-2xl bg-card p-4">
      <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-base leading-tight">{title}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
      <span
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-surface-variant"
        }`}
      >
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          className={`absolute left-1 inline-block size-5 rounded-full bg-card shadow transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </span>
    </label>
  );
}
