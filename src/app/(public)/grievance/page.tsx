import type { Metadata } from "next";
import {
  ContactEmail,
  LegalDocument,
  type LegalSection,
} from "@/components/legal/legal-document";
import { LEGAL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Grievances — Trialent",
  description: "How to report content, raise a complaint or exercise your data rights.",
};

const SECTIONS: LegalSection[] = [
  {
    heading: "Grievance officer",
    paragraphs: [
      <>
        Name: {LEGAL.grievanceOfficer}
        <br />
        Email: <ContactEmail />
      </>,
    ],
  },
  {
    heading: "What you can raise",
    items: [
      "Content on Trialent that is unlawful, misleading, abusive or infringes your rights — a project, role, profile, message, note or file.",
      "A company or candidate breaking the Terms of Use, including unpaid fees or misuse of submitted work.",
      "A request about your personal data: to see it, correct it, erase it, or learn who it was shared with.",
      "Anything else about how Trialent treats you or your data.",
    ],
  },
  {
    heading: "How to raise it",
    paragraphs: [
      <>
        Email <ContactEmail /> from the address on your account, with:
      </>,
    ],
    items: [
      "what the complaint is about, with links to the page, project or profile involved;",
      "what happened and when;",
      "what you'd like us to do.",
    ],
  },
  {
    heading: "What happens next",
    items: [
      "We acknowledge your complaint within 24 hours.",
      "We resolve it within 15 days, and tell you what we did and why.",
      "Requests to remove content that is clearly unlawful or that exposes someone's private information are handled faster.",
      "For a data request we may ask you to confirm your identity first.",
    ],
  },
];

export default function GrievancePage() {
  return (
    <LegalDocument
      title="Grievances"
      intro="If something on Trialent is wrong, harmful or unfair — or you want to exercise a right over your data — this is how to tell us and what we'll do."
      sections={SECTIONS}
    />
  );
}
