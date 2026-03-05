import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col">
      {/* Nav */}
      <nav className="px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
            W
          </div>
          <span className="text-white font-bold text-lg">WorkPulse</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/demo"
            className="text-slate-300 hover:text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-white/10 transition-colors">
            Demo
          </Link>
          <Link href="/login"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
            Login
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 text-center relative">
        {/* Gradient orb behind hero text */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -60%)",
            width: "80%",
            maxWidth: "700px",
            aspectRatio: "1",
            background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 60%)",
            zIndex: 0,
            pointerEvents: "none",
          }}
        />

        {/* Hero content */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-500/30 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-indigo-300 text-sm font-medium">AI-powered analytics</span>
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold text-white leading-tight max-w-3xl">
            WorkPulse
            <br />
            <span className="bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">
              AI Developer Analytics
            </span>
          </h1>

          <p className="mt-6 text-slate-400 text-lg max-w-xl leading-relaxed">
            Track GitHub contributions, measure engineering productivity, and generate AI
            insights for every developer on your team.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 mt-10">
            <Link
              href="/dashboard"
              className="px-6 py-3 text-white font-semibold rounded-xl text-base transition-all"
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                boxShadow: "0 0 20px rgba(99,102,241,0.4), 0 4px 16px rgba(99,102,241,0.3)",
              }}
            >
              View Dashboard →
            </Link>
            <Link href="/demo"
              className="px-6 py-3 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl border border-white/20 transition-colors text-base">
              Try Demo
            </Link>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3 mt-12">
            {[
              "📝 Commit tracking",
              "🔀 PR analytics",
              "🤖 Groq AI insights",
              "🏆 Developer leaderboard",
              "📊 Performance scoring",
              "🆓 100% free to deploy",
            ].map((f) => (
              <span
                key={f}
                className="text-sm text-slate-400 rounded-full px-4 py-1.5"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </main>

      <footer className="px-8 py-5 text-center text-slate-600 text-sm">
        Built with Next.js · Go · Python · Firebase
      </footer>
    </div>
  );
}
