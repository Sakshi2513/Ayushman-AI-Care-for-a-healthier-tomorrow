import React, { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Volume2
} from "lucide-react";
import { analyzeData, audioSrc, sendFeedback } from "./api";

function severityColor(sev) {
  if (sev === "high") return "bg-rose-500/15 text-rose-200 ring-rose-500/30";
  if (sev === "medium") return "bg-amber-500/15 text-amber-200 ring-amber-500/30";
  return "bg-sky-500/15 text-sky-200 ring-sky-500/30";
}

function ConfidencePill({ value }) {
  const pct = Math.round((value ?? 0) * 100);
  const tone =
    pct >= 85
      ? "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30"
      : pct >= 70
        ? "bg-amber-500/15 text-amber-200 ring-amber-500/30"
        : "bg-rose-500/15 text-rose-200 ring-rose-500/30";
  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ring-1 ${tone}`}>
      <Sparkles className="h-4 w-4" />
      Confidence: <span className="font-semibold">{pct}%</span>
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-100">
        {value}
      </div>
      {sub ? <div className="mt-1 text-xs text-slate-400">{sub}</div> : null}
    </div>
  );
}

export default function Dashboard({ role, iot, onIotChange }) {
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [audioPlaying, setAudioPlaying] = useState(false);

  const chartData = useMemo(() => {
    const steps = Number(iot?.steps ?? 0);
    const activity = Number(iot?.activity_level ?? 0);
    const sleep = Number(iot?.sleep_hours ?? 0);
    return [
      { name: "Sleep (h)", value: sleep, target: 7.5 },
      { name: "Activity", value: activity, target: 0.55 },
      { name: "Steps", value: steps, target: 3000 }
    ];
  }, [iot]);

  async function runAnalyze() {
    setBusy(true);
    setError("");
    try {
      const r = await analyzeData({
        role,
        iot: {
          wake_time: String(iot?.wake_time ?? "07:30"),
          sleep_time: String(iot?.sleep_time ?? "22:30"),
          sleep_hours: Number(iot?.sleep_hours ?? 0),
          steps: Number(iot?.steps ?? 0),
          activity_level: Number(iot?.activity_level ?? 0),
          meals: Array.isArray(iot?.meals) ? iot.meals : []
        }
      });
      setResult(r);
    } catch (e) {
      setError(e?.message || "Analyze failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitFeedback(approve) {
    if (!result?.analysis_id) return;
    setBusy(true);
    setError("");
    try {
      const fb = await sendFeedback({
        analysisId: result.analysis_id,
        approve,
        comment: comment?.trim() || null,
        reviewerRole: role === "family" ? "family" : "caregiver"
      });
      setResult((prev) =>
        prev
          ? {
              ...prev,
              status: fb.new_status === "approved" ? "approved" : prev.status
            }
          : prev
      );
      setComment("");
    } catch (e) {
      setError(e?.message || "Feedback failed");
    } finally {
      setBusy(false);
    }
  }

  function playAudio() {
    const src = audioSrc(result?.audio_url);
    if (!src) return;
    const a = new Audio(src);
    setAudioPlaying(true);
    a.onended = () => setAudioPlaying(false);
    a.onerror = () => {
      setAudioPlaying(false);
      setError("Audio playback failed (TTS file could not be played).");
    };
    a.play().catch(() => {
      setAudioPlaying(false);
      setError("Audio playback was blocked by the browser. Click again to allow.");
    });
  }

  const anomalies = result?.anomalies ?? [];
  const status = result?.status;
  const isPending = status === "pending_review";
  const view = role === "family" ? result?.family : result?.caregiver;
  const summary = view?.daily_summary;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40">
      <div className="border-b border-slate-800 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Dashboard</h2>
            <p className="mt-1 text-sm text-slate-300">
              {role === "caregiver"
                ? "Full-detail clinical-style view, with review gating."
                : "Simplified family view; anomalies require caregiver approval."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={runAnalyze}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500/20 px-4 py-2 text-sm font-medium text-indigo-100 ring-1 ring-indigo-500/40 hover:bg-indigo-500/25 disabled:opacity-60"
            >
              <ShieldAlert className="h-4 w-4" />
              {busy ? "Analyzing…" : "Analyze today"}
            </button>
            <ConfidencePill value={result?.confidence} />
          </div>
        </div>
        {error ? (
          <div className="mt-3 rounded-xl border border-rose-900/40 bg-rose-950/30 p-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
        <StatCard
          label="Wake time"
          value={iot?.wake_time ?? "—"}
          sub={`Meals logged: ${Array.isArray(iot?.meals) ? iot.meals.length : 0}`}
        />
        <StatCard label="Sleep hours" value={iot?.sleep_hours ?? "—"} sub={`Sleep time: ${iot?.sleep_time ?? "—"}`} />
        <StatCard label="Steps" value={iot?.steps ?? "—"} sub={`Activity level: ${iot?.activity_level ?? "—"}`} />
      </div>

      <div className="grid grid-cols-1 gap-6 px-5 pb-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-200">Routine signals</h3>
            <div className="text-xs text-slate-400">Observed vs baseline</div>
          </div>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="valFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="tgtFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
                <YAxis tick={{ fill: "#cbd5e1", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "#0b1220",
                    border: "1px solid #334155",
                    borderRadius: 12,
                    color: "#e2e8f0"
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="target" name="Baseline" stroke="#94a3b8" fill="url(#tgtFill)" />
                <Area type="monotone" dataKey="value" name="Observed" stroke="#6366f1" fill="url(#valFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-200">Anomalies</h3>
            <div
              className={[
                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ring-1",
                anomalies.length
                  ? "bg-amber-500/15 text-amber-200 ring-amber-500/30"
                  : "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30"
              ].join(" ")}
            >
              {anomalies.length ? <ShieldAlert className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              {anomalies.length ? `${anomalies.length} detected` : "None"}
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {anomalies.length ? (
              anomalies.map((a, idx) => (
                <div
                  key={`${a.metric}-${idx}`}
                  className="rounded-xl border border-slate-800 bg-slate-900/40 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-slate-100">
                      {String(a.metric).replaceAll("_", " ")}
                    </div>
                    <div className={`rounded-full px-2 py-0.5 text-xs ring-1 ${severityColor(a.severity)}`}>
                      {a.severity}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-slate-300">
                    Observed <span className="font-semibold text-slate-100">{String(a.observed)}</span>{" "}
                    vs expected{" "}
                    <span className="font-semibold text-slate-100">{String(a.expected)}</span>
                    {typeof a.z_score === "number" ? (
                      <span className="text-slate-400"> • z={a.z_score}</span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">{a.explanation}</div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4 text-sm text-slate-300">
                No anomalies detected for today. This run will be auto-approved and
                used to refine learned baselines.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-medium text-slate-200">Daily summary</h3>
              {status ? (
                <span
                  className={[
                    "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ring-1",
                    isPending
                      ? "bg-amber-500/15 text-amber-200 ring-amber-500/30"
                      : "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30"
                  ].join(" ")}
                >
                  {isPending ? <ShieldAlert className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  {isPending ? "pending_review" : "approved"}
                </span>
              ) : null}
            </div>

            <div className="mt-2 rounded-2xl border border-slate-800 bg-slate-950/20 p-4 text-sm text-slate-200">
              {summary ? summary : "Run analysis to generate a summary."}
            </div>
            {role === "caregiver" && result?.caregiver?.structured?.recommendations?.length ? (
              <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/20 p-4">
                <div className="text-xs font-medium text-slate-200">Recommendations</div>
                <ul className="mt-2 list-disc pl-5 text-sm text-slate-300">
                  {result.caregiver.structured.recommendations.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col gap-2 md:w-[300px]">
            <button
              onClick={playAudio}
              disabled={!result?.audio_url || busy}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800/60 disabled:opacity-60"
            >
              <Volume2 className="h-4 w-4" />
              {audioPlaying ? "Playing…" : "Play TTS summary"}
            </button>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="text-xs font-medium text-slate-200">Feedback loop</div>
              <div className="mt-1 text-xs text-slate-400">
                Caregiver approves/rejects anomaly runs; approvals update learned baselines.
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Optional comment (context, corrections, notes)…"
                className="mt-3 h-20 w-full resize-none rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => submitFeedback(true)}
                  disabled={!result?.analysis_id || busy}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-200 ring-1 ring-emerald-500/30 hover:bg-emerald-500/20 disabled:opacity-60"
                  title="Approve and publish to family (if needed)"
                >
                  <ThumbsUp className="h-4 w-4" />
                  Approve
                </button>
                <button
                  onClick={() => submitFeedback(false)}
                  disabled={!result?.analysis_id || busy}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500/15 px-3 py-2 text-sm font-medium text-rose-200 ring-1 ring-rose-500/30 hover:bg-rose-500/20 disabled:opacity-60"
                  title="Reject (does not update learning)"
                >
                  <ThumbsDown className="h-4 w-4" />
                  Reject
                </button>
              </div>
              {role === "family" ? (
                <div className="mt-3 text-xs text-slate-500">
                  Tip: switch to caregiver view to approve pending updates.
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4 text-xs text-slate-400">
              <div className="font-medium text-slate-200">Quick anomaly scenarios</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  className="rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2 text-left hover:bg-slate-800/40"
                  onClick={() =>
                    onIotChange({
                      ...iot,
                      sleep_hours: 3.5
                    })
                  }
                >
                  <div className="text-slate-200">Low sleep</div>
                  <div>sleep_hours → 3.5</div>
                </button>
                <button
                  className="rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2 text-left hover:bg-slate-800/40"
                  onClick={() =>
                    onIotChange({
                      ...iot,
                      steps: 200
                    })
                  }
                >
                  <div className="text-slate-200">Low steps</div>
                  <div>steps → 200</div>
                </button>
                <button
                  className="rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2 text-left hover:bg-slate-800/40"
                  onClick={() =>
                    onIotChange({
                      ...iot,
                      meals: ["08:00"]
                    })
                  }
                >
                  <div className="text-slate-200">Missed meals</div>
                  <div>meals → 1 entry</div>
                </button>
                <button
                  className="rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2 text-left hover:bg-slate-800/40"
                  onClick={() =>
                    onIotChange({
                      ...iot,
                      wake_time: "13:15"
                    })
                  }
                >
                  <div className="text-slate-200">Late wake</div>
                  <div>wake_time → 13:15</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

