import { api } from "../lib/api";
import { mapProjectDocument, type ProjectDocument, type ProjectDocumentDto } from "../types/project";

/** Upload a document to attach to a project afterwards (document_ids). */
export async function uploadProjectDocument(file: File, title: string): Promise<ProjectDocument> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", title);
  // Let the browser set the multipart boundary (the shared client defaults to JSON)
  const { data } = await api.post<ProjectDocumentDto>("/project-documents", formData, { headers: { "Content-Type": undefined } });
  return mapProjectDocument(data);
}

/**
 * Download through the API (the request carries the sign-in token: documents have no public link),
 * then hand the file to the browser.
 */
export async function downloadProjectDocument(doc: ProjectDocument): Promise<void> {
  const { data } = await api.get<Blob>(`/project-documents/${doc.id}`, { responseType: "blob" });
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = doc.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** "2,4 Mo" / "350 Ko" */
export function formatFileSize(bytes: number, locale: string): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toLocaleString(locale, { maximumFractionDigits: 1 })} ${locale.startsWith("fr") ? "Mo" : "MB"}`;
  return `${Math.max(1, Math.round(bytes / 1024))} ${locale.startsWith("fr") ? "Ko" : "KB"}`;
}
