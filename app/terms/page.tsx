import type { Metadata } from "next";
import Link from "next/link";
import LegalFooter from "../legal-footer";

export const metadata: Metadata = { title: "Gubify Terms of Service", description: "Terms for using the Gubify website, pre-registration, beta and feedback services.", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return <main className="legal-page"><a className="skip-link" href="#terms-main">Skip to content</a>
    <header className="legal-header"><Link className="brand" href="/"><span className="brand-mark" aria-hidden="true">G</span><span>Gubify</span></Link><nav><Link href="/support">Support</Link><Link href="/privacy">Privacy Policy</Link></nav></header>
    <section className="legal-hero" id="terms-main"><span className="eyebrow">Website terms</span><h1>Gubify Website Terms of Service</h1><p>These terms explain the basic rules for using the Gubify website, pre-registration and beta feedback services.</p><div className="legal-meta"><span><strong>Last updated</strong> August 2, 2026</span></div></section>
    <article className="legal-content legal-content-standalone">
      <section><h2>1. Using this website</h2><p>You may use the Gubify website for lawful, personal and informational purposes. Do not misuse the site, interfere with its operation, attempt unauthorised access or submit unlawful, harmful or deceptive content.</p></section>
      <section><h2>2. Pre-registration and beta</h2><p>Pre-registration records interest and may provide a launch notification. It is not a purchase, reservation, guarantee of access or promise of a release date. Beta features, eligibility, availability and timing may change.</p></section>
      <section><h2>3. Feedback submissions</h2><p>You retain ownership of ideas and original material you submit. By sending feedback, you give Gubify permission to review, analyse and use it to evaluate, develop or improve the product.</p><p>Submission does not guarantee implementation, compensation, exclusivity, attribution or an individual response.</p></section>
      <section><h2>4. Intellectual property</h2><p>The Gubify name, branding, website design and original site content remain protected by applicable intellectual-property rules. These terms do not transfer ownership or grant permission to reproduce them beyond ordinary website use.</p></section>
      <section><h2>5. Availability and changes</h2><p>The website and beta-related services may be changed, interrupted or withdrawn. Gubify does not guarantee continuous availability, error-free operation or that every proposed feature will be released.</p></section>
      <section><h2>6. Reasonable limitations</h2><p>The site is provided on an as-available basis. To the extent permitted by applicable law, Gubify is not responsible for indirect losses caused by reliance on beta plans, temporary interruptions or circumstances outside reasonable control. Nothing here excludes rights or liability that cannot lawfully be excluded.</p></section>
      <section><h2>7. Changes to these terms</h2><p>These terms may be updated as the website and beta evolve. The current version and update date will be published on this page.</p></section>
      <section><h2>8. Contact</h2><p>Questions about these terms may be sent to <a href="mailto:legal@gubify.com">legal@gubify.com</a>.</p></section>
    </article><LegalFooter /></main>;
}
