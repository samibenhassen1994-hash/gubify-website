import Link from "next/link";
import LegalFooter from "./legal-footer";
import type { LegalDocument } from "../lib/legal/legal-types";

const EMAIL_SPLIT_RE = /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi;
const EMAIL_EXACT_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

function InlineText({ text }: { text: string }) {
  const parts = text.split(EMAIL_SPLIT_RE);
  return (
    <>
      {parts.map((part, index) =>
        EMAIL_EXACT_RE.test(part) ? (
          <a key={`${part}-${index}`} href={`mailto:${part}`}>{part}</a>
        ) : (
          <span key={`${index}-${part.slice(0, 12)}`}>{part}</span>
        ),
      )}
    </>
  );
}

type LegalDocumentPageProps = {
  document: LegalDocument;
};

export default function LegalDocumentPage({ document }: LegalDocumentPageProps) {
  const mainId = `${document.slug}-main`;
  return (
    <main className="legal-page">
      <a className="skip-link" href={`#${mainId}`}>Skip to content</a>

      <header className="legal-header">
        <Link className="brand" href="/" aria-label="Gubify home">
          <span className="brand-mark" aria-hidden="true">G</span>
          <span>Gubify</span>
        </Link>
        <nav aria-label={`${document.title} page links`}>
          {document.navLinks.map(([label, href]) => (
            <Link key={href} href={href}>{label}</Link>
          ))}
        </nav>
      </header>

      <section className="legal-hero" id={mainId}>
        <span className="eyebrow">{document.eyebrow}</span>
        <h1>{document.title}</h1>
        <p>{document.description}</p>
        <div className="legal-meta">
          <span><strong>Last updated</strong> {document.lastUpdated}</span>
          <span><strong>{document.versionLabel}</strong> {document.version}</span>
        </div>
      </section>

      <div className="legal-layout">
        <aside className="legal-toc">
          <strong>On this page</strong>
          <nav aria-label={`${document.title} contents`}>
            {document.sections.map((section) => (
              <a key={section.id} href={`#${section.id}`}>
                {section.title.replace(/^\d+\.\s*/, "")}
              </a>
            ))}
          </nav>
        </aside>

        <article className="legal-content">
          {document.sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className={section.callout ? "legal-callout" : undefined}
            >
              <h2>{section.title}</h2>
              {section.blocks.map((block, index) =>
                block.type === "bullets" ? (
                  <ul key={`${section.id}-list-${index}`}>
                    {block.items.map((item) => (
                      <li key={item}><InlineText text={item} /></li>
                    ))}
                  </ul>
                ) : (
                  <p key={`${section.id}-p-${index}`}><InlineText text={block.text} /></p>
                ),
              )}
            </section>
          ))}
        </article>
      </div>

      <LegalFooter />
    </main>
  );
}
