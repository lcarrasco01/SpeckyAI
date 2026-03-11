export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-speckyai-indigoSoft/20 via-speckyai-background to-cyan-100/40 px-4">
      <div className="max-w-2xl rounded-3xl border border-white/60 bg-white/80 p-8 shadow-xl backdrop-blur">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-speckyai-indigoSoft to-speckyai-indigo text-white text-xl leading-none">
            ✦
          </div>
          <div className="text-2xl font-semibold tracking-tight text-slate-900">
            <span>Specky</span>
            <span className="text-speckyai-indigo">AI</span>
          </div>
        </div>
        <h1 className="mb-3 text-3xl font-semibold tracking-tight text-slate-900">
          Ambient meeting notes, on autopilot.
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-slate-600">
          Drop your phone near a meeting, let SpeckyAI listen, and get a
          real-time transcript, structured notes, and a polished PDF ready to
          send when the conversation wraps.
        </p>
        <div className="flex flex-wrap gap-3">
          <button className="inline-flex items-center justify-center rounded-full bg-speckyai-indigo px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-speckyai-indigoSoft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-speckyai-indigo focus-visible:ring-offset-2 focus-visible:ring-offset-speckyai-background">
            Go to dashboard
          </button>
          <button className="inline-flex items-center justify-center rounded-full border border-speckyai-indigo/40 bg-white px-5 py-2.5 text-sm font-medium text-speckyai-indigo shadow-sm transition hover:bg-speckyai-indigo/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-speckyai-indigo focus-visible:ring-offset-2 focus-visible:ring-offset-speckyai-background">
            Learn more
          </button>
        </div>
      </div>
    </main>
  );
}
