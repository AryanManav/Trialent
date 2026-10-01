import type { Metadata } from "next";
import Link from "next/link";
import {
  ContactEmail,
  LegalDocument,
  type LegalSection,
} from "@/components/legal/legal-document";
import { LEGAL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Notice — Trialent",
  description: "What personal data Trialent collects, why, who sees it and your rights.",
};

const SECTIONS: LegalSection[] = [
  {
    heading: "Who we are",
    paragraphs: [
      <>
        Trialent (trialent.in) is operated by {LEGAL.operator},{" "}
        {LEGAL.operatorDescription} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). We decide why
        and how your personal data is processed on Trialent. You can reach us at{" "}
        <ContactEmail />.
      </>,
    ],
  },
  {
    heading: "What we collect",
    items: [
      "Account: your name, email address, password (stored only as a secure hash by our authentication provider) and whether you joined as a candidate or a company.",
      "Sign-in with Google or GitHub: your name, email, profile photo and, for GitHub, your username. We never receive your Google or GitHub password.",
      "Candidate profile: headline, bio, location, education, graduation year, skills, links (GitHub, LinkedIn, portfolio), resume link, portfolio projects, profile photo and banner.",
      "Company profile: company name, website, description, location, size, tech stack, culture and links, logo, and the team members who belong to it.",
      "Applications: your cover message, relevant experience and the status of each application, including any note the company adds to its decision.",
      "Work: repository and live links, notes and files you submit for a project or assessment, and messages in a project's clarification thread.",
      "Evaluations: the quality bands, observable facts (such as whether the deadline was met), written feedback and outcomes a company records about submitted work.",
      "Activity: the days you were active (used for your activity calendar and streak), who you follow, and your in-app notifications.",
      "Technical data: IP address, browser and request logs kept by our hosting providers to run and secure the service.",
    ],
  },
  {
    heading: "Why we use it",
    items: [
      "To create and secure your account and sign you in.",
      "To run the core service: publishing projects and roles, letting candidates apply, letting companies select, review and evaluate work, and recording outcomes.",
      "To show your profile and verified work to the companies you apply to and, if you leave it switched on, in search.",
      "To send you in-app notifications about your applications, projects and followers.",
      "To keep the service safe, investigate misuse and meet legal obligations.",
    ],
    paragraphs: [
      "We do not sell your data, show advertising or use your data to train AI models.",
    ],
  },
  {
    heading: "Who can see your data",
    items: [
      "Companies you apply to see your profile, application, email address, GitHub username and, once you're selected, your work and messages on that project.",
      "Candidates see a company's public profile, its projects and the decisions and feedback it records about their own work.",
      <>
        Other signed-in users can find your candidate profile (name, headline, bio,
        location, links, skills and the titles of your verified work) in search while
        &ldquo;Show my profile in search&rdquo; is switched on. It is on by default; you
        can switch it off at any time in{" "}
        <Link href="/candidate/settings" className="underline underline-offset-2">
          Settings
        </Link>
        .
      </>,
      "We (the operator) can access data to run, support and secure the service.",
      "Service providers that process data for us, listed below.",
      "Authorities, where Indian law requires it.",
    ],
  },
  {
    heading: "Service providers and where your data is stored",
    items: [
      "Supabase — database, file storage and authentication. Your data is stored in Tokyo, Japan.",
      "Vercel — website hosting. Pages are generated in Tokyo, Japan and delivered through Vercel's global network.",
      "Google and GitHub — only if you choose to sign in with them.",
    ],
    paragraphs: [
      "By using Trialent you consent to your data being transferred to and stored in these locations. Each provider is bound by its own data processing terms.",
    ],
  },
  {
    heading: "Cookies and local storage",
    paragraphs: [
      "We use only what the service needs to work. There are no analytics, advertising or tracking cookies.",
    ],
    items: [
      "Authentication cookies (set by Supabase) keep you signed in.",
      "trialent_oauth_intent remembers, for 10 minutes, whether you were signing up as a candidate or a company while you sign in with Google or GitHub.",
      "Your browser's local storage keeps your theme choice, your recent searches and your private requirement checklist. These never leave your device.",
    ],
  },
  {
    heading: "How long we keep data",
    items: [
      "Your account and profile are kept until you delete your account.",
      "When you delete your account (Settings → Delete account), your account, profile, applications, submissions, messages, notifications and follows are deleted. Evaluations a company recorded about you are deleted with your account.",
      <>
        Files you uploaded with a submission are not yet removed automatically when you
        delete your account. Email <ContactEmail /> and we will delete them within 30
        days.
      </>,
      "Hosting and security logs are kept by our providers for their standard periods.",
    ],
  },
  {
    heading: "Your rights",
    paragraphs: [
      "Under India's Digital Personal Data Protection Act, 2023 and the IT Act, 2000, you can:",
    ],
    items: [
      "ask what personal data we hold about you and who we have shared it with;",
      "correct or update it — most of it directly from your profile;",
      "have it erased — by deleting your account, or by asking us;",
      "withdraw your consent, which means deleting your account;",
      "nominate someone to exercise these rights if you die or become unable to;",
      <>
        raise a grievance with us (see{" "}
        <Link href="/grievance" className="underline underline-offset-2">
          Grievances
        </Link>
        ), and, once it is in operation, complain to the Data Protection Board of India.
      </>,
    ],
  },
  {
    heading: "Age",
    paragraphs: [
      "Trialent is only for people aged 18 or older. If you are under 18, please do not create an account. If we learn that an account belongs to someone under 18, we will delete it.",
    ],
  },
  {
    heading: "Security",
    paragraphs: [
      "Access to data is restricted by database rules so that each user and company can only see what they're entitled to. Passwords are hashed, and all traffic is encrypted with HTTPS. No system is perfectly secure; if a breach affects your data, we will tell you and the authorities as Indian law requires.",
    ],
  },
  {
    heading: "Changes to this notice",
    paragraphs: [
      "If we change this notice in a way that matters, we will update the date above and tell you before the change takes effect.",
    ],
  },
  {
    heading: "Contact and grievance officer",
    paragraphs: [
      <>
        Grievance officer: {LEGAL.grievanceOfficer}. Email: <ContactEmail />. We
        acknowledge complaints within 24 hours and resolve them within 15 days.
      </>,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Notice"
      intro="This notice explains what personal data Trialent collects, why we collect it, who can see it, and the choices and rights you have."
      sections={SECTIONS}
    />
  );
}
