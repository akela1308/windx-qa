import { contentCopy, contentLabel } from "./copy";

export type ContentErrorCode = "required" | "tooLong" | "link" | "typography" | "image" | "stale" | "pending" | "unchanged" | "reviewExpired" | "invalid";

// Наружу передаём только известную причину и имя редактируемого поля,
// без внутренних исключений, содержимого файлов и чужих данных.
export class ContentEditError extends Error {
  constructor(public code: ContentErrorCode, public field?: string, public limit?: number) {
    super(code);
  }
}

export function contentErrorMessage(error: ContentEditError, locale: string) {
  const c = contentCopy(locale);
  return c.errors[error.code]
    .replace("{field}", error.field ? contentLabel(error.field, locale) : c.choose)
    .replace("{limit}", String(error.limit ?? ""));
}
