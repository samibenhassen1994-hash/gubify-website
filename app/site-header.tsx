"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

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
  const [isScrolled, setIsScrolled] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const focusTimerRef = useRef<number | null>(null);

  const closeMenu = useCallback((restoreFocus = true) => {
    setIsOpen(false);
    if (focusTimerRef.current !== null) window.clearTimeout(focusTimerRef.current);
    if (restoreFocus) {
      focusTimerRef.current = window.setTimeout(() => menuButtonRef.current?.focus(), 200);
    }
  }, []);

  useEffect(() => {
    const updateScrolledState = () => setIsScrolled(window.scrollY > 8);
    updateScrolledState();
    window.addEventListener("scroll", updateScrolledState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrolledState);
  }, []);

  useEffect(() => () => {
    if (focusTimerRef.current !== null) window.clearTimeout(focusTimerRef.current);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const desktopQuery = window.matchMedia("(min-width: 961px)");
    const handleDesktopChange = (event: MediaQueryListEvent) => {
      if (event.matches) closeMenu(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [],
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
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
      <header className={`site-header${isScrolled ? " is-scrolled" : ""}${isOpen ? " menu-open" : ""}`}>
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
          className="mobile-menu-button"
          type="button"
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          tabIndex={isOpen ? -1 : 0}
          onClick={() => setIsOpen(true)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </header>

      <button
        className={`mobile-nav-backdrop${isOpen ? " is-open" : ""}`}
        type="button"
        aria-label="Close navigation menu"
        aria-hidden={!isOpen}
        tabIndex={-1}
        onClick={() => closeMenu()}
      />

      <div
        ref={panelRef}
        id="mobile-navigation"
        className={`mobile-navigation${isOpen ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        aria-hidden={!isOpen}
      >
        <div className="mobile-navigation-header">
          <Link className="mobile-panel-brand" href="/#top" tabIndex={isOpen ? 0 : -1} onClick={() => closeMenu()}>
            <span className="brand-mark" aria-hidden="true">G</span>
            <span>Gubify</span>
          </Link>
          <button
            ref={closeButtonRef}
            className="mobile-menu-close"
            type="button"
            aria-label="Close navigation menu"
            tabIndex={isOpen ? 0 : -1}
            onClick={() => closeMenu()}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
        </div>

        <nav className="mobile-navigation-links" aria-label="Mobile navigation links">
          {navigationLinks.filter((link) => link.mobile).map((link) => (
            <Link
              href={link.href}
              key={`${link.label}-${link.href}`}
              tabIndex={isOpen ? 0 : -1}
              onClick={() => closeMenu()}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
