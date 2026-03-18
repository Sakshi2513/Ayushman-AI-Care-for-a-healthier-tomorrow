import React, { useState } from "react";
import { analyzeData } from "../api";

export default function Dashboard({ summaryData, setSummaryData }) {
  const [iotInput, setIotInput] = useState({
    wake_time: "07:30",
    sleep_time: "22:30",
    steps: 1200,
    activity_level: 0.8,
    meals: ["08:00", "12:30", "19:00"]
  });
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    const result = await analyzeData(iotInput);
    setSummaryData(result);
    setLoading(false);
  };

  const playAudio = () => {
    if (summaryData?.audio_path) {
      new Audio(summaryData.audio_path).play();
    }
  };

  return (
    <div className="mb-6 p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-2">Dashboard</h2>
      <button
        onClick={handleAnalyze}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        {loading ? "Analyzing..." : "Analyze IoT Data"}
      </button>

      {summaryData && (
        <div className="mt-4 p-2 border rounded">
          <p><strong>Summary:</strong> {summaryData.summary}</p>
          <p><strong>Anomalies:</strong> {summaryData.anomalies.join(", ") || "None"}</p>
          <p><strong>Confidence:</strong> {summaryData.confidence_score}%</p>
          <p><strong>Status:</strong> {summaryData.status}</p>
          <button
            onClick={playAudio}
            className="mt-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Play Audio
          </button>
        </div>
      )}
    </div>
  );
}