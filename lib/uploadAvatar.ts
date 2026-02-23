import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

const AVATAR_BUCKET = "avatars";

interface UploadAvatarResult {
  publicUrl: string;
  path: string;
  userId: string;
}

interface UploadAvatarOptions {
  supabase?: SupabaseClient;
  userId?: string;
}

function isBucketMissingError(message?: string) {
  return (message || "").toLowerCase().includes("bucket not found");
}

function isRlsPolicyError(message?: string) {
  return (message || "").toLowerCase().includes("row-level security");
}

async function resolveUserId(client: SupabaseClient, userId?: string) {
  if (userId) return userId;
  const {
    data: { user },
    error
  } = await client.auth.getUser();
  if (error || !user) {
    throw new Error("Authentication required to upload avatar.");
  }
  return user.id;
}

export async function uploadAvatar(file: File, options: UploadAvatarOptions = {}): Promise<UploadAvatarResult> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  const client = options.supabase ?? createClient();
  const userId = await resolveUserId(client, options.userId);
  const path = `${userId}.png`;

  const { error: uploadError } = await client.storage.from(AVATAR_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type || "image/png"
  });

  if (uploadError) {
    if (isBucketMissingError(uploadError.message)) {
      throw new Error('Storage bucket "avatars" was not found. Create a bucket named "avatars" in Supabase Storage.');
    }
    if (isRlsPolicyError(uploadError.message)) {
      throw new Error('Avatar upload blocked by storage RLS. Ensure bucket "avatars" allows auth.uid()::text = split_part(name, \'.\', 1).');
    }
    throw new Error(uploadError.message || "Failed to upload avatar.");
  }

  const {
    data: { publicUrl }
  } = client.storage.from(AVATAR_BUCKET).getPublicUrl(path);

  if (!publicUrl) {
    throw new Error("Uploaded avatar but failed to resolve public URL.");
  }

  const { error: updateError } = await client.from("users").update({ avatar_url: publicUrl }).eq("id", userId);
  if (updateError) {
    throw new Error(updateError.message || "Failed to save avatar URL.");
  }

  return { publicUrl, path: `${AVATAR_BUCKET}/${path}`, userId };
}
