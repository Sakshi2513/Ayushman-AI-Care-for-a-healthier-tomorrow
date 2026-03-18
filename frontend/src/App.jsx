import React, { useMemo, useState } from "react";
import Dashboard from "./Dashboard.jsx";
import sample from "../../data/sample_iot.json";

export default function App() {
  const [role, setRole] = useState("caregiver");
  const [iot, setIot] = useState(sample);

  const pretty = useMemo(() => JSON.stringify(iot, null, 2), [iot]);

  return (
    <div className="min-h-full bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
              Prototype • Human-in-the-loop • Gemini-simulated • TTS
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              AI Care Assistant
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Upload or tweak daily IoT routine data, detect anomalies, generate an
              explainable summary, and route anomalies through caregiver review
              before family sees the update.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-slate-400">Viewing as</label>
            <div className="inline-flex rounded-xl border border-slate-800 bg-slate-900/60 p-1">
              {["caregiver", "family"].map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={[
                    "rounded-lg px-3 py-1.5 text-sm capitalize transition",
                    role === r
                      ? "bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/40"
                      : "text-slate-300 hover:bg-slate-800/60"
                  ].join(" ")}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Dashboard role={role} iot={iot} onIotChange={setIot} />
          </div>

          <aside className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-slate-200">IoT JSON</h2>
              <button
                className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800/70"
                onClick={() => setIot(sample)}
                title="Reset to bundled sample data"
              >
                Reset sample
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Edit fields below for demo scenarios (e.g., reduce sleep, steps, or
              meals) and re-run analysis.
            </p>
            <textarea
              className="mt-3 h-[520px] w-full resize-none rounded-xl border border-slate-800 bg-slate-950/40 p-3 font-mono text-xs text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/40"
              value={pretty}
              onChange={(e) => {
                try {
                  setIot(JSON.parse(e.target.value));
                } catch {
                  // keep editing; Dashboard analyze will validate server-side
                }
              }}
              spellCheck={false}
            />
            <div className="mt-3 text-xs text-slate-400">
              Required keys:{" "}
              <span className="text-slate-300">
                wake_time, sleep_time, sleep_hours, steps, activity_level, meals
              </span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}