import Link from "next/link";
import { ArrowDown } from "lucide-react";
import { Mark } from "./mark";

export function Nav({ current }: { current: "home" | "download" }) {
  const home = current === "home" ? "" : "/";
  return (
    <header className="nav-wrap">
      <nav className="nav glass-bar" aria-label="Fő navigáció">
        <Link href="/" className="wordmark" aria-label="MeetCoder főoldal">
          <span className="wordmark-tile">
            <Mark />
          </span>
          MeetCoder
        </Link>
        <ul className="nav-links">
          <li>
            <a href={`${home}#mukodes`}>Hogyan működik</a>
          </li>
          <li>
            <a href={`${home}#rend`}>Megbízhatóság</a>
          </li>
          <li>
            <a href={`${home}#modellek`}>Modellek</a>
          </li>
        </ul>
        <Link
          href="/letoltes/"
          className="pill pill-compact"
          aria-current={current === "download" ? "page" : undefined}
        >
          Letöltés
          <span className="pill-chip">
            <ArrowDown strokeWidth={2.25} />
          </span>
        </Link>
      </nav>
    </header>
  );
}
