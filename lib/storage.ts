import { uploadAvatar as uploadAvatarFile } from "@/lib/uploadAvatar";

export async function uploadAvatar(userId: string, file: File) {
  const { publicUrl } = await uploadAvatarFile(file, { userId });
  return publicUrl;
}
