import type { Metadata } from "next";
import Link from "next/link";
import {
  ContactEmail,
  LegalDocument,
  type LegalSection,
} from "@/components/legal/legal-document";
import { LEGAL, MAX_ASSESSMENT_HOURS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Terms of Use — Trialent",
  description: "The rules for candidates and companies using Trialent.",
};

const SECTIONS: LegalSection[] = [
  {
    heading: "About these terms",
    paragraphs: [
      <>
        Trialent (trialent.in) is operated by {LEGAL.operator},{" "}
        {LEGAL.operatorDescription} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an
        account or using Trialent you agree to these terms and to our{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy Notice
        </Link>
        . If you use Trialent for a company, you confirm you may accept these terms on its
        behalf.
      </>,
    ],
  },
  {
    heading: "Who can use Trialent",
    items: [
      "You must be at least 18 years old.",
      "Trialent is intended for users in India.",
      "Give accurate information, keep your password private and tell us if you think your account has been misused. You're responsible for what happens under your account.",
    ],
  },
  {
    heading: "What Trialent is — and isn't",
    paragraphs: [
      "Trialent is a platform where companies post paid build projects and hiring roles, and candidates apply and submit work. We are not the employer of any candidate, not a recruitment agency, and not a party to any hiring decision, contract or payment between a company and a candidate. We don't guarantee that any project leads to a hire, that any candidate is suitable, or that any company will pay.",
    ],
  },
  {
    heading: "Paid build projects",
    items: [
      "The company states the fee, scope and deadlines on the brief before anyone applies, and must not change them once a candidate has been selected.",
      "The company pays the stated fee directly to the candidate after it accepts the work — within the time stated in the brief, or within 15 days of acceptance if the brief doesn't say.",
      "Trialent never receives, holds or transfers project fees. Any tax deduction at source, invoicing or other tax obligation on the fee is between the company and the candidate.",
      "A company that rejects work must give the candidate its reason in writing through Trialent.",
    ],
  },
  {
    heading: "Hiring roles and assessments",
    items: [
      `A hiring role may ask candidates to complete an unpaid assessment. The company must estimate it honestly at no more than ${MAX_ASSESSMENT_HOURS} hours, and Trialent labels it as unpaid on every listing.`,
      "An assessment exists only to evaluate candidates. It must not be a way to get real work done for free.",
    ],
  },
  {
    heading: "Who owns the work",
    items: [
      "Candidates own everything they create on Trialent until it is paid for.",
      "Paid build projects: once the company has paid the full fee, the candidate assigns to the company the copyright in the deliverables made for that project, worldwide and for the full term of copyright. The candidate may still show the project's title, description, technologies and screenshots in their portfolio, unless the brief said the project is confidential.",
      "Unpaid assessments, and work that is rejected or not paid for: the candidate keeps all rights. The company may use the work only to evaluate the candidate, must not use it in its products or business, and must delete its copies within 30 days of deciding not to hire.",
      "Candidates confirm that the work is their own, and that any third-party or open-source code they include is used under its licence and identified in the submission.",
    ],
  },
  {
    heading: "Confidentiality",
    items: [
      "Project briefs are public. Companies must not put confidential information in them.",
      "Anything shared privately in a project's thread is confidential to that company and candidate, and may only be used for that project.",
    ],
  },
  {
    heading: "Fair hiring",
    paragraphs: [
      "Companies must base decisions on the work and the criteria they published, and must not discriminate on grounds such as gender, religion, caste, disability, sexual orientation or gender identity. Decision notes and feedback must be honest and respectful.",
    ],
  },
  {
    heading: "Acceptable use",
    paragraphs: ["You must not use Trialent to:"],
    items: [
      "post false, misleading or fraudulent projects, roles, profiles or work;",
      "impersonate a person or company, or post on behalf of a company you don't represent;",
      "post content that is unlawful, defamatory, obscene, hateful, or that infringes someone else's rights;",
      "harass other users, or contact them for purposes unrelated to the project or role;",
      "upload malware, probe or attack the service, or access data you're not entitled to;",
      "scrape the service or collect other users' personal data.",
    ],
  },
  {
    heading: "Your content",
    paragraphs: [
      "You keep ownership of what you post. You give us a non-exclusive licence to host, store and display it only as needed to run Trialent, for as long as it stays on the service.",
    ],
  },
  {
    heading: "Reporting content, suspension and deletion",
    items: [
      <>
        Report anything that breaks these terms to <ContactEmail />. We will act on valid
        reports and on lawful orders from courts or government authorities.
      </>,
      "We may remove content or suspend or close accounts that break these terms or the law.",
      "You can delete your account at any time in Settings. You can't delete it while a project you're part of is still in progress.",
    ],
  },
  {
    heading: "Disclaimers and liability",
    paragraphs: [
      "Trialent is provided as it is, without warranties of any kind, and may sometimes be unavailable. To the extent the law allows, we are not liable for any indirect or consequential loss, or for anything a company or candidate does or fails to do, including payment, hiring decisions and use of work. Our total liability to you for any claim is limited to ₹5,000. Nothing in these terms limits liability that cannot be limited by law.",
    ],
  },
  {
    heading: "Changes",
    paragraphs: [
      "We may update these terms. If a change matters, we'll update the date above and tell you before it takes effect. Continuing to use Trialent after that means you accept the new terms.",
    ],
  },
  {
    heading: "Law and disputes",
    paragraphs: [
      `These terms are governed by the laws of India. The courts at ${LEGAL.courts} have exclusive jurisdiction over any dispute about them or about Trialent.`,
    ],
  },
  {
    heading: "Contact",
    paragraphs: [
      <>
        Questions and grievances: <ContactEmail />. See{" "}
        <Link href="/grievance" className="underline underline-offset-2">
          Grievances
        </Link>{" "}
        for how complaints are handled.
      </>,
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Use"
      intro="These terms apply to everyone who uses Trialent: candidates, companies and visitors. They're written to be read — please do."
      sections={SECTIONS}
    />
  );
}
