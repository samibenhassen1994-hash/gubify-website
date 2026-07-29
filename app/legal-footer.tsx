import Link from "next/link";

export default function LegalFooter() {
  return (
    <footer className="legal-footer">
      <Link className="brand footer-brand" href="/">
        <span className="brand-mark" aria-hidden="true">G</span>
        <span>Gubify</span>
      </Link>
      <nav aria-label="Legal and support links">
        <Link href="/privacy">Privacy Policy</Link>
        <Link href="/support">Support</Link>
      </nav>
      <span>© 2026 Gubify. All rights reserved.</span>
    </footer>
  );
}
