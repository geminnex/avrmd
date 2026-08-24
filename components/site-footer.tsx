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
          <h3>Directory</h3>
          <Link href="/stages">Stages</Link>
          <Link href="/explore">All records</Link>
          <Link href="/explore?kind=organization">Organizations</Link>
          <Link href="/explore?kind=solution">Solutions</Link>
          <Link href="/explore?kind=evidence">Evidence</Link>
          <Link href="/gear">Gear and hardware</Link>
          <Link href="/resources">Related websites</Link>
          <Link href="/signals">Signals</Link>
        </div>
        <div>
          <h3>Take part</h3>
          <Link href="/community">Community</Link>
          <Link href="/opportunities">Opportunities</Link>
          <Link href="/participate">Suggest a record</Link>
          <Link href="/for-organizations#claim">Claim your record</Link>
          <Link href="/for-organizations#promotion">Promotion</Link>
          <Link href="/about">About and how we review</Link>
        </div>
      </div>
      <div className="shell footer-bottom">
        <span>© 2026 AVRMD</span>
        <span>Professional information only — not medical advice.</span>
      </div>
    </footer>
  );
}
