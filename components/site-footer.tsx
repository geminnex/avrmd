import Link from "next/link";
import { BrandMark } from "./brand-mark";
import { topics } from "@/lib/topics";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div className="footer-brand">
          <BrandMark />
          <p>
            A source-aware professional network for medical virtual, augmented, and mixed
            reality.
          </p>
        </div>
        <div>
          <h3>Clinical topics</h3>
          {topics.map((topic) => (
            <Link href={`/topics/${topic.slug}`} key={topic.slug}>
              {topic.shortName}
            </Link>
          ))}
        </div>
        <div>
          <h3>Library</h3>
          <Link href="/explore">Records</Link>
          <Link href="/stages">Stages</Link>
          <Link href="/clearances">FDA AR/VR devices</Link>
          <Link href="/signals">Papers &amp; news</Link>
          <Link href="/talks">Talks</Link>
          <Link href="/gear">Gear</Link>
          <Link href="/resources">Websites</Link>
        </div>
        <div>
          <h3>Take part</h3>
          <Link href="/ask">Ask a question</Link>
          <Link href="/questions">Questions</Link>
          <Link href="/members">Members</Link>
          <Link href="/participate">Suggest a record</Link>
          <Link href="/for-organizations#claim">Claim your record</Link>
          <Link href="/for-organizations#promotion">Promotion</Link>
          <Link href="/about">About and how we review</Link>
        </div>
      </div>
      <div className="shell footer-bottom">
        <span>© 2026 AVRMD</span>
        <span>
          Professional information only — not medical advice. <Link href="/privacy">Privacy</Link>{" "}
          · <Link href="/terms">Terms</Link>
        </span>
      </div>
    </footer>
  );
}
