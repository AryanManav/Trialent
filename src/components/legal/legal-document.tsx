import Link from "next/link";
import { LEGAL, LEGAL_LINKS } from "@/lib/constants";

export interface LegalSection {
  heading: string;
  paragraphs?: React.ReactNode[];
  items?: React.ReactNode[];
}

/** The contact address as a link, for use inside legal copy. */
export function ContactEmail() {
  return (
    <a
      href={`mailto:${LEGAL.contactEmail}`}
      className="font-medium text-brand-700 underline underline-offset-2"
    >
      {LEGAL.contactEmail}
    </a>
  );
}

/** One legal page: title, date, numbered sections and links to the others. */
export function LegalDocument({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: React.ReactNode;
  sections: LegalSection[];
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="space-y-3 border-b border-line pb-8">
        <h1 className="text-3xl font-semibold text-ink-900">{title}</h1>
        <p className="text-sm text-ink-500">Last updated {LEGAL.lastUpdated}</p>
        <div className="text-base leading-7 text-ink-700">{intro}</div>
      </header>

      <div className="space-y-10 pt-8">
        {sections.map((section, index) => (
          <section key={section.heading} aria-labelledby={`section-${index + 1}`}>
            <h2
              id={`section-${index + 1}`}
              className="text-lg font-semibold text-ink-900"
            >
              {index + 1}. {section.heading}
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-6 text-ink-700">
              {section.paragraphs?.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
              {section.items && (
                <ul className="list-disc space-y-2 pl-5">
                  {section.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ))}
      </div>

      <nav
        aria-label="Legal documents"
        className="mt-12 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-6 text-sm"
      >
        {LEGAL_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-ink-500 hover:text-ink-900"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </article>
  );
}
