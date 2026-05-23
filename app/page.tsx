import type { Metadata } from "next";
import { BarChart3, FileSearch2, GitCompareArrows, Map } from "lucide-react";
import URLInput from "@/components/URLInput";
import { BorderBeam } from "@/components/magicui/border-beam";

export const metadata: Metadata = {
  title: "Home",
  description: "Analyze news URLs with claim mapping and manipulation scoring.",
};

const features = [
  {
    label: "Evidence Board",
    desc: "Claims visualised as an interactive node graph",
    icon: Map,
  },
  {
    label: "Manipulation Score",
    desc: "5-dimension bias and manipulation rating",
    icon: BarChart3,
  },
  {
    label: "Source Compare",
    desc: "Find contradictions between two outlets",
    icon: GitCompareArrows,
  },
];

export default function Home() {
  return (
    <main className="flex min-h-[calc(100vh-57px)] flex-col items-center justify-center px-4 py-20">
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent-subtle bg-accent-subtle px-4 py-1.5">
        <FileSearch2 size={14} className="text-accent" />
        <span className="font-mono text-xs font-medium uppercase tracking-widest text-accent-dim">
          AI Media Analysis
        </span>
      </div>

      <h1 className="mb-6 max-w-3xl text-center font-display text-5xl font-bold leading-[1.05] tracking-tight text-text-primary sm:text-6xl md:text-7xl">
        See what the article is{" "}
        <span className="italic text-accent">really</span> saying.
      </h1>

      <p className="mb-12 max-w-xl text-center font-sans text-lg font-light leading-relaxed text-text-secondary">
        Paste any news URL. TruthLayer separates facts from opinions, spots
        logical fallacies, and scores manipulation through an interactive
        evidence board.
      </p>

      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-xl shadow-black/10">
        <BorderBeam
          size={300}
          duration={12}
          colorFrom="var(--accent)"
          colorTo="transparent"
        />
        <URLInput />
      </div>

      <div className="mt-16 grid w-full max-w-2xl grid-cols-1 gap-8 sm:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.label} className="text-center">
            <div className="mb-2 inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-accent">
              <feature.icon size={14} />
              {feature.label}
            </div>
            <p className="text-xs leading-relaxed text-text-tertiary">
              {feature.desc}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
