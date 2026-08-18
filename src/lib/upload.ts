import { api, type ApiSuccess } from "./api";

export async function uploadFile(file: File, folder = "categories"): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  body.append("folder", folder);
  const { data } = await api.post<ApiSuccess<{ url: string }>>("/uploads", body, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data.url;
}
