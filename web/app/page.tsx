import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Compass, Database, FlaskConical, Scale, Wallet, Wheat } from "lucide-react";
import { GoogleIcon } from "@/components/icons";
import { Landscape } from "@/components/landscape";
import { MiniLab } from "@/components/mini-lab";
import { Counter, Reveal } from "@/components/motion";
import { getAllocatedTotal, getBaseline, getLevers, type Lever, type Preset } from "@/lib/data";
import { getT } from "@/lib/i18n-server";
import { localizeParams, presetName } from "@/lib/localize";

const SYSTEM_ORDER = ["model-a", "model-b", "model-c", "model-d"];
const MINI_LEVERS = ["tau_top", "bite", "m"];
const pct = (v: number | string | undefined) => (typeof v === "number" ? `${Math.round(v * 100)}%` : "—");

export default async function Home() {
  const [baseline, allocated, t] = await Promise.all([getBaseline(), getAllocatedTotal(), getT()]);
  const ind = baseline?.indicators ?? {};
  const version = baseline?.modelVersion ?? "0.1.0";
  const levers = localizeParams(await getLevers(version), t);
  const miniLevers = MINI_LEVERS.map((c) => levers.find((l) => l.code === c)).filter(Boolean) as Lever[];
  const systems = SYSTEM_ORDER.map((s) => baseline?.presets.find((p) => p.slug === s)).filter(Boolean) as Preset[];

  return (
    <>
      {/* ---------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden bg-dawn">
        <div className="absolute inset-0 bg-gradient-to-b from-[#edf5e7] via-[#d7e8ca] to-[#b9d497]" />
        <div className="relative mx-auto grid max-w-[1380px] gap-10 px-5 pb-8 pt-16 lg:grid-cols-[1.05fr_.95fr] lg:px-10 lg:pt-28">
          <div className="relative z-10 max-w-3xl">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-forest/15 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[.18em] text-forest shadow-sm">
                <span className="h-2 w-2 animate-pulse-slow rounded-full bg-vivid" aria-hidden="true" /> {t.hero.eyebrow}
              </span>
            </Reveal>
            <h1 className="mt-7 font-display text-5xl font-semibold leading-[.93] tracking-[-.055em] text-forest sm:text-7xl lg:text-[92px]">
              {t.hero.title[0]}
              <br />
              <span className="text-leaf">{t.hero.title[1]}</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-ink/70 sm:text-xl">{t.hero.lead}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/experiment"
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-forest px-7 font-bold text-white shadow-lift transition hover:-translate-y-1 hover:bg-leaf"
              >
                {t.cta.experiment} <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                href="#lab"
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full border border-forest/20 bg-white px-7 font-bold text-forest transition hover:border-forest hover:bg-cream"
              >
                <Compass className="h-5 w-5" aria-hidden="true" /> {t.cta.explore}
              </Link>
            </div>
            <ul className="mt-10 flex flex-wrap gap-2" aria-label={t.hero.badgesLabel}>
              {[
                [Database, t.badges.synthetic],
                [Wallet, t.badges.virtual],
                [FlaskConical, t.badges.model],
              ].map(([Icon, label]) => {
                const I = Icon as typeof Database;
                return (
                  <li
                    key={label as string}
                    className="inline-flex items-center gap-1.5 rounded-full border border-forest/15 bg-white/70 px-3 py-1.5 text-[11px] font-bold text-forest"
                  >
                    <I className="h-3.5 w-3.5" aria-hidden="true" /> {label as string}
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="relative min-h-[380px] lg:min-h-[590px]">
            <div className="absolute right-8 top-0 h-28 w-28 rounded-full bg-[#f1d66f] opacity-90 shadow-[0_0_70px_rgba(241,214,111,.65)]" />
            <Landscape label={t.hero.art} />
            <div className="absolute right-2 top-24 animate-sway rounded-2xl border border-white/60 bg-white p-4 shadow-soft sm:right-12">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-sage/40 text-forest">
                  <Wheat className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <span className="block text-xs font-bold uppercase tracking-wider text-ink/70">{t.hero.economyLabel}</span>
                  <strong className="text-forest">{t.hero.economy}</strong>
                </div>
              </div>
            </div>
            <div className="absolute bottom-24 left-2 rounded-2xl bg-forest p-4 text-white shadow-lift sm:left-10">
              <p className="text-xs font-bold uppercase tracking-widest text-sage">{t.hero.flowLabel}</p>
              <p className="mt-1 font-display text-xl">{t.hero.flow}</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden border-t border-forest/10 bg-forest py-3 text-white">
          <p className="animate-flow whitespace-nowrap text-center text-xs font-bold uppercase tracking-[.2em] text-sage">
            {t.hero.ticker}
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------------- what is Verdania? (context for newcomers) */}
      <section className="bg-white px-5 py-20 lg:px-10 lg:py-28" aria-labelledby="about-title">
        <div className="mx-auto max-w-[1240px]">
          <Reveal className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-[.25em] text-leaf">{t.about.eyebrow}</span>
            <h2 id="about-title" className="mt-4 font-display text-4xl font-semibold tracking-tight text-forest lg:text-5xl">
              {t.about.title}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-ink/80">{t.about.lead}</p>
            <p className="mt-3 text-ink/70">{t.about.country}</p>
          </Reveal>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {t.about.tiles.map((tile, i) => {
              const Icon = [FlaskConical, Scale, Wallet, BadgeCheck][i];
              return (
                <li key={tile.title} className="h-full">
                  <Reveal delay={i * 0.05} className="h-full">
                    <Link href={tile.href} className="flex h-full flex-col rounded-[2rem] border border-forest/10 bg-cream p-6 transition hover:-translate-y-0.5 hover:border-forest/30">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-forest text-white">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <h3 className="mt-4 font-display text-xl font-semibold text-forest">{tile.title}</h3>
                      <p className="mt-2 text-sm text-ink/70">{tile.text}</p>
                    </Link>
                  </Reveal>
                </li>
              );
            })}
          </ul>
          <p className="mt-6 text-xs text-ink/70">{t.about.environment}</p>
        </div>
      </section>

      {/* ---------------------------------------------------------------- baseline figures (real, from Supabase) */}
      <section className="border-b border-forest/10 bg-white px-5 py-16 lg:px-10" aria-label={t.stats.label}>
        <dl className="mx-auto grid max-w-[1240px] gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [t.stats.population, baseline?.population ?? null, "int"],
            [t.stats.employment, ind.employment_rate ?? null, "pct"],
            [t.stats.gdp, ind.gdp_pc ?? null, "money"],
            [t.stats.allocated, allocated, "money"],
          ].map(([label, value, format], i) => (
            <Reveal key={label as string} delay={i * 0.05} className="flex flex-col-reverse">
              <dt className="mt-1 text-sm font-semibold text-ink/70">
                {label as string}
                <span className="mt-1 block text-[11px] font-normal text-ink/70">{t.stats.source(version)}</span>
              </dt>
              <dd className="font-display text-4xl font-semibold text-forest">
                <Counter value={value as number | null} format={format as "int" | "pct" | "money"} />
              </dd>
            </Reveal>
          ))}
        </dl>
      </section>

      {/* ---------------------------------------------------------------- live mini-experiment (engine results only) */}
      <section id="lab" className="bg-mist px-5 py-24 lg:px-10 lg:py-32">
        <div className="mx-auto max-w-[1240px]">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-[.25em] text-leaf">{t.lab.eyebrow}</span>
            <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight text-forest lg:text-6xl">{t.lab.title}</h2>
            <p className="mt-4 text-ink/70">{t.lab.lead}</p>
          </Reveal>
          <div className="mt-12">
            {miniLevers.length === MINI_LEVERS.length ? (
              <MiniLab levers={miniLevers} />
            ) : (
              <p className="text-center text-ink/70">{t.lab.error}</p>
            )}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- four systems (from the seeded presets) */}
      <section className="bg-white px-5 py-24 lg:px-10 lg:py-32">
        <div className="mx-auto max-w-[1240px]">
          <Reveal className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-[.25em] text-leaf">{t.systems.eyebrow}</span>
            <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight text-forest lg:text-6xl">{t.systems.title}</h2>
            <p className="mt-4 text-ink/70">{t.systems.lead}</p>
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {systems.map((p, i) => (
              <Reveal key={p.slug} delay={i * 0.05} className="flex flex-col rounded-[2rem] border border-forest/10 bg-cream p-6">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-forest font-display text-lg font-bold text-white">
                  {p.family}
                </span>
                <h3 className="mt-4 font-display text-2xl font-semibold leading-tight text-forest">{presetName(t, p.slug, p.name)}</h3>
                <dl className="mt-4 flex-1 space-y-2 text-sm">
                  {(["tau_top", "cb", "s_pub"] as const).map((k) => (
                    <div key={k} className="flex justify-between gap-3 border-b border-forest/10 pb-2">
                      <dt className="text-ink/70">{t.systems.traits[k]}</dt>
                      <dd className="font-bold tabular-nums text-forest">{pct(p.levers[k])}</dd>
                    </div>
                  ))}
                </dl>
                <Link
                  href={`/experiment?preset=${p.family}`}
                  className="mt-6 inline-flex items-center gap-2 font-bold text-forest hover:text-leaf"
                >
                  {t.systems.test} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-sm text-ink/70">{t.systems.note}</p>
        </div>
      </section>

      {/* ---------------------------------------------------------------- join */}
      <section className="bg-deep px-5 py-20 text-white lg:px-10">
        <div className="mx-auto flex max-w-[1240px] flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-sage">{t.join.eyebrow}</p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight lg:text-5xl">{t.join.title}</h2>
            <p className="mt-3 max-w-xl text-white/70">{t.join.lead}</p>
          </div>
          <div className="flex w-full flex-col gap-3 md:w-auto">
            <Link
              href="/sign-in"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 font-bold text-forest transition hover:-translate-y-0.5 hover:bg-sage"
            >
              <GoogleIcon /> {t.cta.google}
            </Link>
            <Link
              href="#lab"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/25 px-6 font-bold text-white transition hover:bg-white hover:text-forest"
            >
              {t.join.keepExploring}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
