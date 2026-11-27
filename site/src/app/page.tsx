import Link from "next/link";
import { ArrowDown, ArrowUpRight, Code2, MonitorPlay, Folder, FileText, Eye, Undo2, Coins, FolderTree } from "lucide-react";
import { Nav } from "@/components/nav";
import { KineticHeadline } from "@/components/kinetic-headline";
import { Drift } from "@/components/drift";
import { LiveClass } from "@/components/live-class";
import { Footer } from "@/components/footer";
import { REPO_URL } from "@/lib/site";

const specs = [
  { label: "Bemenet", value: "A tanár megosztott képernyője, hang nélkül" },
  { label: "Felismerés", value: "A gépeden: Vision macOS-en, Tesseract Windowson" },
  { label: "Modellhez", value: "Csak a változott képkockák jutnak el" },
  { label: "Kimenet", value: "Jegyzet, kód a projektedben és futó dev szerver" },
  { label: "Nyelv", value: "Magyar felület, magyar jegyzetek" },
];

const principles = [
  {
    icon: Eye,
    title: "Ami most készül, az van elöl.",
    body: "A második monitoron egy pillantásból látod, melyik fájlon dolgozik épp a tanár, és mi került be a projektedbe.",
  },
  {
    icon: Undo2,
    title: "Minden lépés látszik és visszavonható.",
    body: "Minden módosítás kap egy magyar címet és egy saját visszavonás gombot. Nincs ág, nincs rejtett commit: a kód egyenesen a projektmappádba kerül.",
  },
  {
    icon: Coins,
    title: "Olcsó, mert csak a változást küldi.",
    body: "A szövegfelismerés a gépeden fut. A modell csak akkor dolgozik, ha a képernyő tényleg változott, és az óra költségének felső határt adhatsz.",
  },
  {
    icon: FolderTree,
    title: "Magától rendet tart.",
    body: "A T: meghajtóról a csoportod nevével hozza le a projektet, és sosem ír felül meglévő helyi fájlt. A jegyzet a projekt notes mappájába kerül, dátum szerint.",
  },
];

const models = [
  {
    name: "Claude",
    how: "Claude Code, bejelentkezve a Claude előfizetéseddel",
    cmd: "claude auth login",
    note: "Sonnet, Opus és Haiku közül választhatsz.",
  },
  {
    name: "Codex",
    how: "Codex CLI, bejelentkezve a ChatGPT előfizetéseddel",
    cmd: "codex login",
    note: "A bejelentkezett CLI saját modelljei.",
  },
  {
    name: "OpenCode",
    how: "OpenCode CLI a beállított alapmodelleddel",
    cmd: "opencode run",
    note: "A felismert szöveget kapja, így szöveges modell is elég.",
  },
];

export default function Home() {
  return (
    <div className="page">
      <Nav current="home" />

      <main id="main">
        <section className="hero wide" aria-labelledby="hero-title">
          <KineticHeadline
            id="hero-title"
            label="Nem kell figyelned. A kód megíródik."
            lines={[
              { parts: [{ text: "Nem" }, { text: "kell" }, { sticker: <MonitorPlay strokeWidth={2.25} />, tone: "ink" }] },
              { parts: [{ text: "figyelned." }], align: "indent" },
              { parts: [{ text: "A" }, { text: "kód" }, { sticker: <Code2 strokeWidth={2.5} /> }], align: "start" },
              { parts: [{ text: "megíródik." }], align: "end" },
            ]}
          />
          <div className="hero-foot">
            <div className="hero-action">
              <Link href="/letoltes/" className="pill">
                Letöltés
                <span className="pill-chip">
                  <ArrowDown strokeWidth={2.25} />
                </span>
              </Link>
              <span className="hero-platforms">macOS 14+ és Windows 10+</span>
            </div>
            <p className="hero-lede">
              A MeetCoder figyeli a tanár megosztott képernyőjét a Google Meetben, jegyzetel, és{" "}
              <strong>a saját projektedbe írja azt, amit a tanár épp kódol.</strong>
            </p>
          </div>
        </section>

        <div className="world">
          <Drift rows={["KÓDJEGYZETÓRAKÓDJEGYZET", "PROJEKTMAPPAPROJEKT", "VÁLTOZÁSKÉPKOCKA", "EXPRESSLARAVELNEXT"]} />

          <section className="world-panels wide" aria-label="A MeetCoder röviden">
            <div className="glass panel pitch">
              <p className="lede lede-lg">
                A Meet ablaka a háttérben marad, te a saját dolgodon vagy. Óra után <strong>ott a jegyzet</strong> a
                megfelelő projekt alatt, a megfelelő dátummal, a projektben <strong>ott van, amit a tanár írt</strong>,
                és el is indul.
              </p>
              <a className="text-link" href="#mukodes">
                Nézd meg, hogyan
                <ArrowDown aria-hidden="true" />
              </a>
            </div>
            <div className="glass panel">
              <h2 className="title">Röviden</h2>
              <dl className="spec">
                {specs.map((s) => (
                  <div key={s.label} className="spec-row">
                    <dt>{s.label}</dt>
                    <dd>{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          <div className="wide">
            <LiveClass />
          </div>
        </div>

        <section id="rend" className="field hue-nitro sheet" aria-labelledby="rend-title">
          <div className="wide field-grid">
            <div className="field-head">
              <h2 id="rend-title" className="headline">
                Felügyelet nélkül is megbízható.
              </h2>
              <p className="lede">
                Ha nem figyelsz, akkor is tudnod kell, mi történt. Ezért minden önálló lépés látható, a nevéhez köthető
                és visszafordítható.
              </p>
              <div className="tree" aria-label="Példa mappaszerkezet">
                <p className="tree-tag">Példa</p>
                <ul>
                  <li>
                    <Folder aria-hidden="true" />
                    ~/school/projects
                    <ul>
                      <li>
                        <Folder aria-hidden="true" />
                        webshop
                        <ul>
                          <li>
                            <Folder aria-hidden="true" />
                            notes
                            <ul>
                              <li data-new="">
                                <FileText aria-hidden="true" />
                                2026-11-27.md
                              </li>
                            </ul>
                          </li>
                          <li>
                            <Folder aria-hidden="true" />
                            routes
                            <ul>
                              <li data-new="">
                                <Code2 aria-hidden="true" />
                                termekek.js
                              </li>
                            </ul>
                          </li>
                        </ul>
                      </li>
                    </ul>
                  </li>
                </ul>
              </div>
            </div>
            <ul className="principles">
              {principles.map(({ icon: Icon, title, body }) => (
                <li key={title} className="principle">
                  <span className="principle-icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="subtitle">{title}</h3>
                    <p>{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="modellek" className="field hue-royal sheet field-deep" aria-labelledby="modellek-title">
          <div className="wide field-grid">
            <div className="field-head">
              <h2 id="modellek-title" className="headline">
                Azzal a modellel, amire már előfizetsz.
              </h2>
              <p className="lede">
                Az <strong>Automatikus</strong> beállítás sorban próbálja: előbb a Claude előfizetésedet, aztán a
                ChatGPT-t a Codexen át, végül a helyben beállított OpenCode-ot. A Beállítások → Modell alatt bármikor
                rögzítheted.
              </p>
            </div>
            <div className="models solid">
              <ol className="chain">
                {models.map((m, i) => (
                  <li key={m.name} className="chain-row">
                    <span className="chain-step" aria-hidden="true">
                      {i + 1}
                    </span>
                    <div className="chain-body">
                      <h3 className="title">{m.name}</h3>
                      <p>{m.how}</p>
                      <p className="chain-note">{m.note}</p>
                    </div>
                    <code className="cmd">{m.cmd}</code>
                  </li>
                ))}
              </ol>
              <p className="models-foot">
                C# projektben csak ír: semmit nem futtat, nem fordít és nem állít vissza.{" "}
                <a className="text-link" href={`${REPO_URL}#readme`} rel="noopener">
                  Részletek a GitHubon
                  <ArrowUpRight aria-hidden="true" />
                </a>
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
