import { requireApiUser } from "@/lib/api";
import { apiError, apiOk } from "@/lib/api/response";
import { z } from "zod";

const ThemeSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  mode: z.enum(["dark", "light"]),
  colors: z.record(z.string(), z.string()).default({}),
  background_image: z.string().trim().url().optional().or(z.literal("")).or(z.null()),
  card_image: z.string().trim().url().optional().or(z.literal("")).or(z.null()),
  header_image: z.string().trim().url().optional().or(z.literal("")).or(z.null()),
  accent_image: z.string().trim().url().optional().or(z.literal("")).or(z.null()),
  avatar_image: z.string().trim().url().optional().or(z.literal("")).or(z.null()),
  is_active: z.boolean().default(false)
});

export async function GET() {
  const { error, supabase, user } = await requireApiUser();
  if (error || !user) return error;

  const { data, error: fetchError } = await supabase
    .from("user_themes")
    .select("id,user_id,name,mode,colors,background_image,card_image,header_image,accent_image,avatar_image,is_active,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (fetchError) return apiError(fetchError.message || "Failed to fetch themes.", 500, "FETCH_FAILED");

  return apiOk({ themes: data ?? [] });
}

export async function POST(request: Request) {
  const { error, supabase, user } = await requireApiUser();
  if (error || !user) return error;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiError("Invalid JSON.", 400, "INVALID_JSON");
  }

  const parsed = ThemeSchema.safeParse(payload);
  if (!parsed.success) {
    return apiError("Invalid theme payload.", 400, "INVALID_PAYLOAD", parsed.error.flatten());
  }
  const body = parsed.data;

  if (body.is_active) {
    await supabase.from("user_themes").update({ is_active: false }).eq("user_id", user.id);
  }

  const row = {
    user_id: user.id,
    name: body.name,
    mode: body.mode,
    colors: body.colors,
    background_image: body.background_image || null,
    card_image: body.card_image || null,
    header_image: body.header_image || null,
    accent_image: body.accent_image || null,
    avatar_image: body.avatar_image || null,
    is_active: body.is_active
  };

  if (body.id) {
    const { data, error: updateError } = await supabase
      .from("user_themes")
      .update(row)
      .eq("id", body.id)
      .eq("user_id", user.id)
      .select("*")
      .single();
    if (updateError) return apiError(updateError.message || "Failed to update theme.", 500, "UPDATE_FAILED");
    return apiOk({ theme: data });
  }

  const { data, error: insertError } = await supabase.from("user_themes").insert(row).select("*").single();
  if (insertError) return apiError(insertError.message || "Failed to create theme.", 500, "CREATE_FAILED");
  return apiOk({ theme: data });
}
