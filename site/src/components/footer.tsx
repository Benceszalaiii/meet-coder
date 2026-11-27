import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { REPO_URL, RELEASES_URL } from "@/lib/site";
import { Mark } from "./mark";

export function Footer({ cta = true }: { cta?: boolean }) {
  return (
    <footer className={cta ? "footer" : "footer footer-bare"}>
      <div className="wide">
        {cta && (
          <div className="footer-close">
            <h2 className="headline">Töltsd le a következő óra előtt.</h2>
            <Link href="/letoltes/" className="pill">
              Letöltés macOS-re és Windowsra
              <span className="pill-chip">
                <ArrowDown strokeWidth={2.25} />
              </span>
            </Link>
          </div>
        )}
        <div className="footer-base">
          <Link href="/" className="wordmark">
            <span className="wordmark-tile">
              <Mark />
            </span>
            MeetCoder
          </Link>
          <ul className="footer-links">
            <li>
              <Link href="/letoltes/">Letöltés</Link>
            </li>
            <li>
              <a href={RELEASES_URL} rel="noopener">
                Kiadások
                <ArrowUpRight aria-hidden="true" />
                <span className="sr-only"> (GitHub)</span>
              </a>
            </li>
            <li>
              <a href={REPO_URL} rel="noopener">
                Forráskód
                <ArrowUpRight aria-hidden="true" />
                <span className="sr-only"> (GitHub)</span>
              </a>
            </li>
          </ul>
          <p className="footer-note">
            A MeetCoder független projekt, nem kapcsolódik a Google-höz, az Anthropichoz vagy az OpenAI-hoz.
          </p>
        </div>
      </div>
    </footer>
  );
}
