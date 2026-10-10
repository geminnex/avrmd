"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Sparkles, X } from "lucide-react";
import { openAssistant } from "./assistant-events";

const sections = [
  {
    heading: "Library",
    links: [
      { href: "/explore", label: "Records" },
      { href: "/topics", label: "Clinical topics" },
      { href: "/stages", label: "Stages — where are you stuck?" },
      { href: "/clearances", label: "FDA-authorized AR/VR devices" },
      { href: "/signals", label: "Papers & news" },
      { href: "/talks", label: "Talks" },
    ],
  },
  {
    heading: "People",
    links: [
      { href: "/ask", label: "Ask a question" },
      { href: "/questions", label: "Questions" },
      { href: "/members", label: "Members" },
      { href: "/network", label: "Updates" },
    ],
  },
  {
    heading: "For organizations",
    links: [
      { href: "/for-organizations#claim", label: "Claim your record" },
      { href: "/participate", label: "Suggest a record" },
      { href: "/for-organizations#promotion", label: "Promotion" },
      { href: "/about", label: "About and how we review" },
    ],
  },
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <button
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="menu-button"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      {open && (
        <nav aria-label="Site menu" className="mobile-nav">
          {sections.map((section) => (
            <div className="mobile-nav-section" key={section.heading}>
              <span className="mobile-nav-heading">{section.heading}</span>
              {section.links.map((link) => (
                <Link href={link.href} key={link.label} onClick={close}>
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
          <div className="mobile-nav-actions">
            <button
              className="ai-button"
              onClick={() => {
                close();
                openAssistant();
              }}
              type="button"
            >
              <Sparkles size={15} />
              Ask AVRMD
            </button>
            <Link className="signin-button" href="/sign-in" onClick={close}>
              Sign in
            </Link>
          </div>
        </nav>
      )}
    </>
  );
}
