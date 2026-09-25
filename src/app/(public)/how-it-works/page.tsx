import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function HowItWorksPage() {
  const steps = [
    {
      num: "01",
      title: "Company Creates a Standardized Project",
      desc: "Startups define a real, job-relevant micro-project with clear acceptance criteria, required skills, and the fee stated upfront (e.g. ₹5,000).",
    },
    {
      num: "02",
      title: "Candidates Discover & Apply",
      desc: "Emerging engineers explore relevant projects matching their tech stack and apply with their profile and execution approach.",
    },
    {
      num: "03",
      title: "Candidate Selection",
      desc: "The company reviews applicants and selects the best fit. Once the work is accepted, the company pays the candidate directly — Trialent never holds the money.",
    },
    {
      num: "04",
      title: "Project Execution & Submission",
      desc: "The candidate completes the project within the designated deadline and submits their GitHub repo, live demo, and documentation.",
    },
    {
      num: "05",
      title: "Evidence-Based Evaluation & Hiring Decision",
      desc: "The engineering team reviews actual code, tests, and documentation. They record objective feedback and decide whether to interview or extend a full-time offer.",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900">
          The Trialent Evaluation Loop
        </h1>
        <p className="text-slate-600 max-w-xl mx-auto">
          How startups turn hiring uncertainty into high-confidence engineering decisions
          through real work.
        </p>
      </div>

      <div className="space-y-6">
        {steps.map((step) => (
          <Card key={step.num} className="border-slate-200">
            <CardHeader className="flex flex-row items-start gap-4 space-y-0">
              <div className="h-10 w-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center font-semibold text-indigo-700 shrink-0">
                {step.num}
              </div>
              <div>
                <CardTitle className="text-lg text-slate-900">{step.title}</CardTitle>
                <CardContent className="p-0 pt-2 text-sm text-slate-600">
                  {step.desc}
                </CardContent>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
