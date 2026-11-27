import type { Metadata } from "next";
import { ArrowUpRight, Download, Laptop, Monitor, Check, ShieldAlert, KeyRound, AppWindow, FolderInput, Settings2 } from "lucide-react";
import { Nav } from "@/components/nav";
import { KineticHeadline } from "@/components/kinetic-headline";
import { Drift } from "@/components/drift";
import { Footer } from "@/components/footer";
import { OsPick } from "@/components/os-pick";
import { LATEST_RELEASE_URL, RELEASES_URL, REPO_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Letöltés",
  description: "Töltsd le a MeetCoder legújabb kiadását macOS-re vagy Windowsra a GitHubról.",
};

const platforms = [
  {
    os: "mac",
    icon: Laptop,
    name: "macOS",
    cta: "Letöltés macOS-re",
    specs: [
      { label: "Rendszer", value: "macOS 14 Sonoma vagy újabb" },
      { label: "Alkalmazás", value: "MeetCoder.app, natív SwiftUI" },
      { label: "Engedély", value: "Képernyőfelvétel, az első indításkor kéri" },
    ],
    caveat:
      "Az alkalmazás nincs az Apple-nél hitelesítve. Első indításkor kattints rá jobb gombbal, és válaszd a Megnyitás lehetőséget.",
  },
  {
    os: "windows",
    icon: Monitor,
    name: "Windows",
    cta: "Letöltés Windowsra",
    specs: [
      { label: "Rendszer", value: "Windows 10 (1903+) vagy 11, x64" },
      { label: "Fájl", value: "Telepítő vagy hordozható .exe, x64" },
      { label: "Kell még", value: "Git for Windows a visszavonható változásnaplóhoz" },
    ],
    caveat:
      "A telepítő nincs aláírva, ezért a SmartScreen figyelmeztethet. Válaszd a További információ, majd a Futtatás mindenképp lehetőséget.",
  },
] as const;

const steps = [
  {
    icon: KeyRound,
    title: "Jelentkezz be egy modellbe",
    body: "Elég egy: claude auth login, codex login, vagy egy működő opencode run.",
  },
  {
    icon: AppWindow,
    title: "Nyisd meg az órát Chrome-ban",
    body: "A Meet vagy Screentask ablak lehet takarásban, de ne legyen kis méretre állítva.",
  },
  {
    icon: FolderInput,
    title: "Add meg a projektmappát és a csoportodat",
    body: "Alapból ~/school/projects. A csoportnév alapján hozza le a projektet a T: meghajtóról.",
  },
  {
    icon: Settings2,
    title: "Hagyd Automatikuson",
    body: "A Beállítások → Modell alatt az Automatikus mindig a legjobb elérhető modellt választja.",
  },
];

export default function DownloadPage() {
  return (
    <div className="page">
      <Nav current="download" />
      <main id="main">
        <section className="hero hero-short wide" aria-labelledby="dl-title">
          <KineticHeadline
            id="dl-title"
            label="Óra előtt töltsd le."
            lines={[
              { parts: [{ text: "Óra" }, { text: "előtt" }, { sticker: <Download strokeWidth={2.5} /> }] },
              { parts: [{ text: "töltsd" }, { text: "le." }], align: "end" },
            ]}
          />
          <div className="hero-foot">
            <div className="hero-action">
              <a className="pill" href={LATEST_RELEASE_URL} rel="noopener">
                Legújabb kiadás a GitHubon
                <span className="pill-chip">
                  <ArrowUpRight strokeWidth={2.25} />
                </span>
              </a>
              <span className="hero-platforms">macOS 14+ és Windows 10+</span>
            </div>
            <p className="hero-lede">
              Minden kiadás a <strong>GitHub Releases</strong> oldalon jelenik meg. Válaszd a saját rendszeredet, a
              gomb a legfrissebb kiadáshoz visz.
            </p>
          </div>
        </section>

        <div className="world world-dl">
          <Drift rows={["LETÖLTÉSKIADÁSLETÖLTÉS", "MACOSWINDOWSMACOS", "TELEPÍTÉSINDÍTÁS"]} />

          <section className="wide platforms" aria-label="Platformok">
            {platforms.map(({ os, icon: Icon, name, cta, specs, caveat }) => (
              <article key={os} className="glass panel platform" data-os={os} aria-labelledby={`${os}-title`}>
                <header className="platform-head">
                  <span className="platform-icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <h2 id={`${os}-title`} className="headline-sm">
                    {name}
                  </h2>
                  <span className="yours">
                    <Check aria-hidden="true" />
                    Ezt használod
                  </span>
                </header>
                <dl className="spec">
                  {specs.map((s) => (
                    <div key={s.label} className="spec-row">
                      <dt>{s.label}</dt>
                      <dd>{s.value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="caveat">
                  <ShieldAlert aria-hidden="true" />
                  {caveat}
                </p>
                <a className="pill pill-wide" href={LATEST_RELEASE_URL} rel="noopener">
                  {cta}
                  <span className="pill-chip">
                    <ArrowUpRight strokeWidth={2.25} />
                  </span>
                </a>
              </article>
            ))}
          </section>

          <section className="wide setup" aria-labelledby="setup-title">
            <div className="glass panel setup-panel">
              <h2 id="setup-title" className="headline">
                Az első óra előtt
              </h2>
              <ol className="steps">
                {steps.map(({ icon: Icon, title, body }, i) => (
                  <li key={title} className="step">
                    <span className="step-n" aria-hidden="true">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="subtitle">
                        <Icon aria-hidden="true" />
                        {title}
                      </h3>
                      <p>{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </div>

        <section className="field hue-royal sheet field-deep" aria-labelledby="src-title">
          <div className="wide field-grid">
            <div className="field-head">
              <h2 id="src-title" className="headline">
                Inkább forrásból?
              </h2>
              <p className="lede">
                Régebbi verzió kell, vagy saját magad fordítanád? Minden kiadás és a teljes forráskód a GitHubon van.
              </p>
              <p className="links-row">
                <a className="text-link" href={RELEASES_URL} rel="noopener">
                  Összes kiadás
                  <ArrowUpRight aria-hidden="true" />
                </a>
                <a className="text-link" href={REPO_URL} rel="noopener">
                  Forráskód
                  <ArrowUpRight aria-hidden="true" />
                </a>
              </p>
            </div>
            <div className="solid builds">
              <div className="build">
                <h3 className="title">macOS</h3>
                <pre className="shell">
                  <code>./build.sh</code>
                </pre>
                <p>A MeetCoder.app a repó gyökerébe kerül.</p>
              </div>
              <div className="build">
                <h3 className="title">Windows</h3>
                <pre className="shell">
                  <code>{"cd windows\nnpm install\nnpm run dist"}</code>
                </pre>
                <p>A telepítő és a hordozható exe a windows/release mappába kerül.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer cta={false} />
      <OsPick />
    </div>
  );
}
