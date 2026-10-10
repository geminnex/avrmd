import Link from "next/link";
import { BrandMark } from "./brand-mark";
import { AssistantTrigger } from "./assistant-trigger";
import { AccountSlot } from "./account-slot";
import { MobileMenu } from "./mobile-menu";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="header-brand" href="/">
          <BrandMark />
          <span className="brand-divider" />
          <span className="brand-descriptor">Medical XR Network</span>
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <Link href="/explore">Library</Link>
          <Link href="/stages">Stages</Link>
          <Link href="/talks">Talks</Link>
          <Link href="/questions">People</Link>
          <Link href="/for-organizations">For organizations</Link>
        </nav>
        <div className="header-actions">
          <AssistantTrigger />
          <AccountSlot />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
