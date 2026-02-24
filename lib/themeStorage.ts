"use client";

import { createClient } from "@/lib/supabase/client";

const BUCKET = "user-themes";

export async function uploadThemeImage(userId: string, file: File, slot: string) {
  const supabase = createClient();
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${userId}/${slot}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type || "image/png"
  });
  if (error) {
    throw new Error(error.message || "Failed to upload theme image.");
  }
  const {
    data: { publicUrl }
  } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return publicUrl;
}
