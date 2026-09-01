import Link from "next/link";

export default function LegalFooter() {
  return (
    <footer className="legal-footer">
      <Link className="brand footer-brand" href="/">
        <span className="brand-mark" aria-hidden="true">G</span>
        <span>Gubify</span>
      </Link>
      <nav aria-label="Legal and support links">
        <Link href="/support">Support</Link>
        <Link href="/feedback?type=bug">Report a Bug</Link>
        <Link href="/feedback?type=feature">Suggest a Feature</Link>
        <Link href="/delete-account">Delete Account</Link>
        <Link href="/privacy">Privacy Policy</Link>
        <Link href="/terms">Terms of Service</Link>
        <Link href="/fundraising">Support Gubify</Link>
      </nav>
      <span>© 2026 Gubify. All rights reserved.</span>
    </footer>
  );
}
