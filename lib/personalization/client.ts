import { composeThemeVariables } from "@/lib/personalization/service";
import type { PersonalizationProfile } from "@/lib/personalization/types";

export function applyPersonalizationToDocument(profile: PersonalizationProfile) {
  const root = document.documentElement;
  const body = document.body;
  const variables = composeThemeVariables(profile.themeId, profile.customThemes);

  Object.entries(variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  root.dataset.pxTheme = profile.themeId;
  root.dataset.uiSkin = profile.uiSkin;
  root.dataset.aiStyle = profile.aiStyle;
  body.dataset.uiSkin = profile.uiSkin;
}
