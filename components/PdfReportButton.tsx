"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { generatePostureReport } from "@/lib/pdf/generatePostureReport";
import { cn } from "@/lib/utils";

interface PdfReportButtonProps {
  data: {
    alignment: number;
    stability: number;
    symmetry: number;
    score: number;
    riskLevel: string;
    fatigue: number;
    duration: number;
    user: string;
    sessionId: string;
  };
}

function getAiFeedback(riskLevel: string, score: number) {
  if (score >= 85 && riskLevel === "LOW") {
    return "Posture quality is strong with stable balance. Maintain current ergonomic setup and movement rhythm.";
  }
  if (riskLevel === "MODERATE") {
    return "Minor positional drift is appearing over time. Correct shoulder position and re-center your neck posture.";
  }
  if (riskLevel === "HIGH" || riskLevel === "SEVERE" || riskLevel === "CRITICAL") {
    return "Sustained misalignment is increasing strain risk. Immediate posture reset and frequent movement breaks are recommended.";
  }
  return "Session captured. Continue controlled posture with regular micro-adjustments.";
}

function getSuggestions(riskLevel: string, fatigue: number) {
  const base = [
    "Keep ears aligned over shoulders and avoid forward-head posture.",
    "Reset your seated posture every 20 minutes with 30-second mobility."
  ];
  if (riskLevel === "HIGH" || riskLevel === "SEVERE" || riskLevel === "CRITICAL") {
    return [
      "Pause now and perform a full spine neutral reset before continuing.",
      "Reduce continuous sitting blocks and include standing intervals every 30 minutes."
    ];
  }
  if (fatigue >= 70) {
    return [
      "Fatigue is elevated; lower session intensity and add short recovery breaks.",
      "Use diaphragmatic breathing for 60 seconds to reduce upper-body tension."
    ];
  }
  return base;
}

function getRiskExplanation(riskLevel: string) {
  switch (riskLevel) {
    case "LOW":
      return "Low risk indicates acceptable alignment consistency with limited strain indicators.";
    case "MODERATE":
      return "Moderate risk means posture drift was detected and can accumulate strain without correction.";
    case "HIGH":
      return "High risk reflects repeated instability and asymmetry, likely increasing discomfort exposure.";
    case "SEVERE":
      return "Severe risk indicates persistent poor mechanics with elevated short-term strain potential.";
    case "CRITICAL":
      return "Critical risk indicates very high sustained deviation that requires immediate correction.";
    default:
      return "Risk level estimated from alignment, symmetry, and stability patterns in this session.";
  }
}

export function PdfReportButton({ data }: PdfReportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const reportData = useMemo(
    () => ({
      ...data,
      aiFeedback: getAiFeedback(data.riskLevel, data.score),
      suggestions: getSuggestions(data.riskLevel, data.fatigue),
      riskExplanation: getRiskExplanation(data.riskLevel)
    }),
    [data]
  );

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      await generatePostureReport(reportData);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => {
        void handleGenerate();
      }}
      disabled={isGenerating}
      className={cn(
        "ui-interactive inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      )}
    >
      <Download className="h-4 w-4" />
      {isGenerating ? "Generating..." : "PDF Report"}
    </button>
  );
}
