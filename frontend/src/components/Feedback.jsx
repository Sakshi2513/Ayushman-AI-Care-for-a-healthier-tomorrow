import React, { useState } from "react";
import { sendFeedback } from "../api";

export default function Feedback({ summaryData }) {
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState("");

  const handleFeedback = async (approve) => {
    if (!summaryData) return;
    await sendFeedback({
      analysis_id: summaryData.analysis_id,
      approve,
      comment
    });
    setStatus("Feedback submitted!");
  };

  return (
    <div className="mb-6 p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-2">Feedback</h2>
      <textarea
        className="w-full border rounded p-2 mb-2"
        placeholder="Add comment..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <div>
        <button
          onClick={() => handleFeedback(true)}
          className="px-4 py-2 bg-green-600 text-white rounded mr-2 hover:bg-green-700"
        >
          Approve
        </button>
        <button
          onClick={() => handleFeedback(false)}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reject
        </button>
      </div>
      {status && <p className="mt-2 text-green-600">{status}</p>}
    </div>
  );
}