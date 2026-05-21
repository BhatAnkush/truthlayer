import URLInput from "@/components/URLInput";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-950 text-gray-100">
      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <div className="mb-3 inline-flex items-center rounded-full border border-gray-700 bg-gray-900 px-3 py-1 text-xs text-gray-400">
          Powered by Groq · Llama 3.3 70B
        </div>
        <h1 className="mb-4 max-w-2xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
          See what the article is really saying
        </h1>
        <p className="mb-10 max-w-xl text-base text-gray-400">
          TruthLayer uses AI to dissect any news article — separating facts from
          opinions, spotting logical fallacies, and measuring manipulation.
        </p>
        <URLInput />
      </main>

      {/* Features */}
      <section className="border-t border-gray-800 px-4 py-20">
        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
          <FeatureCard
            title="Evidence Board"
            description="Every claim laid out as an interactive graph. See how arguments connect, contradict, and depend on each other."
            icon="🗺️"
          />
          <FeatureCard
            title="Manipulation Score"
            description="Five dimensions — fear language, urgency bait, false equivalence, missing sources, and emotional appeals."
            icon="📊"
          />
          <FeatureCard
            title="Shareable Analysis"
            description="Every analysis gets a permanent public URL. Share with anyone — no account needed."
            icon="🔗"
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <div className="mb-3 text-2xl">{icon}</div>
      <h3 className="mb-2 text-sm font-semibold text-gray-100">{title}</h3>
      <p className="text-sm leading-relaxed text-gray-500">{description}</p>
    </div>
  );
}
