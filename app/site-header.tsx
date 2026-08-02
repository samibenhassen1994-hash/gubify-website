"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

const navigationLinks = [
  { href: "/#features", label: "Features", desktop: true, mobile: true },
  { href: "/#how-it-works", label: "How it works", desktop: true, mobile: true },
  { href: "/#communities", label: "Communities", desktop: true, mobile: true },
  { href: "/fundraising", label: "Support us", desktop: true, mobile: false },
  { href: "/support", label: "Contact Us", desktop: true, mobile: true },
  { href: "/#about", label: "About", desktop: true, mobile: true },
  { href: "/pre-register", label: "Pre-register", desktop: false, mobile: true },
  { href: "/privacy", label: "Privacy Policy", desktop: false, mobile: true },
  { href: "/terms", label: "Terms of Service", desktop: false, mobile: true },
  { href: "/fundraising", label: "Support Gubify", desktop: false, mobile: true },
] as const;

export default function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback((restoreFocus = true) => {
    setIsOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => menuButtonRef.current?.focus());
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    const desktopQuery = window.matchMedia("(min-width: 961px)");
    const handleDesktopChange = (event: MediaQueryListEvent) => {
      if (event.matches) closeMenu(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    desktopQuery.addEventListener("change", handleDesktopChange);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      desktopQuery.removeEventListener("change", handleDesktopChange);
    };
  }, [closeMenu, isOpen]);

  return (
    <>
      <header className="site-header">
        <Link className="brand" href="/#top" aria-label="Gubify home">
          <span className="brand-mark" aria-hidden="true">G</span>
          <span>Gubify</span>
        </Link>

        <nav className="main-nav" aria-label="Main navigation">
          {navigationLinks.filter((link) => link.desktop).map((link) => (
            <Link href={link.href} key={link.label}>{link.label}</Link>
          ))}
        </nav>

        <Link className="header-cta" href="/#coming-soon">Get the app</Link>

        <button
          ref={menuButtonRef}
          className={`mobile-menu-button${isOpen ? " is-open" : ""}`}
          type="button"
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          onClick={() => (isOpen ? closeMenu() : setIsOpen(true))}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>

        <nav
          id="mobile-navigation"
          className="mobile-navigation"
          aria-label="Mobile navigation"
          hidden={!isOpen}
        >
          {navigationLinks.filter((link) => link.mobile).map((link) => (
            <Link href={link.href} key={`${link.label}-${link.href}`} onClick={() => closeMenu()}>
              {link.label}
            </Link>
          ))}
        </nav>
      </header>

      {isOpen && (
        <button
          className="mobile-nav-backdrop"
          type="button"
          aria-label="Close navigation menu"
          tabIndex={-1}
          onClick={() => closeMenu()}
        />
      )}
    </>
  );
}
