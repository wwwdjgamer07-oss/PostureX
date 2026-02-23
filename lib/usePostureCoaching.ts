"use client";

import { useEffect, useState } from "react";
import {
  generate_posture_feedback,
  get_correction_tips,
  type PostureCoachingFeedback,
  type PostureCoachingMetrics
} from "@/lib/postureCoaching";

const DEFAULT_FEEDBACK: PostureCoachingFeedback = {
  message: "Great posture",
  severity: "good",
  suggestion: "Keep this alignment"
};

export function usePostureCoaching(metrics: PostureCoachingMetrics | null) {
  const [feedback, setFeedback] = useState<PostureCoachingFeedback>(DEFAULT_FEEDBACK);
  const [tips, setTips] = useState<string[]>([]);

  useEffect(() => {
    if (!metrics) return;
    const next = generate_posture_feedback(metrics);
    setTips(get_correction_tips(metrics));
    setFeedback((previous) => {
      if (
        previous.message === next.message &&
        previous.severity === next.severity &&
        previous.suggestion === next.suggestion
      ) {
        return previous;
      }
      return next;
    });
  }, [metrics]);

  return { feedback, tips };
}
