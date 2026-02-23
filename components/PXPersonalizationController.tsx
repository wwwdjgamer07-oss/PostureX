"use client";

import { useEffect } from "react";
import { fetchPersonalizationProfile, usePersonalizationProfile } from "@/lib/personalization/profileClient";

export function PXPersonalizationController() {
  usePersonalizationProfile();

  useEffect(() => {
    void fetchPersonalizationProfile();
    return undefined;
  }, []);

  return null;
}
