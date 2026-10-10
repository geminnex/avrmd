"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Sparkles, X } from "lucide-react";
import { openAssistant } from "./assistant-events";
import { topics } from "@/lib/topics";

const sections = [
  {
    heading: "Network",
    links: [
      { href: "/network", label: "Updates from members" },
      { href: "/talks", label: "Talks" },
      { href: "/members", label: "Member directory" },
    ],
  },
  {
    heading: "Clinical topics",
    links: [
      ...topics.map((topic) => ({ href: `/topics/${topic.slug}`, label: topic.shortName })),
      { href: "/topics", label: "All topics" },
      { href: "/stages", label: "Stages — where are you stuck?" },
    ],
  },
  {
    heading: "Directory",
    links: [
      { href: "/explore", label: "All records" },
      { href: "/explore?kind=organization", label: "Organizations" },
      { href: "/explore?kind=solution", label: "Solutions" },
      { href: "/explore?kind=evidence", label: "Evidence" },
      { href: "/explore?kind=event", label: "Events" },
      { href: "/clearances", label: "FDA-authorized AR/VR devices" },
      { href: "/gear", label: "Gear and hardware" },
      { href: "/resources", label: "Related websites" },
      { href: "/signals", label: "Signals" },
    ],
  },
  {
    heading: "Community",
    links: [
      { href: "/questions", label: "Questions" },
      { href: "/ask", label: "Ask the network" },
      { href: "/community", label: "Discussions by topic" },
      { href: "/opportunities", label: "Opportunities" },
      { href: "/participate", label: "Suggest a record" },
    ],
  },
  {
    heading: "For organizations",
    links: [
      { href: "/for-organizations#claim", label: "Claim your record" },
      { href: "/for-organizations#promotion", label: "Promotion" },
      { href: "/workspace", label: "Workspace preview" },
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
