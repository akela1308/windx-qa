export type NotificationStatus = { status: "queued" | "sent" | "failed" | "cancelled" | "off"; attempts: number; firstAttemptAt?: number; nextAttemptAt?: number; sentAt?: string };
export type Enquiry = { id: string; createdAt: string; name: string; contact: string; message: string; version: number; section: number; notification?: NotificationStatus };
export class EnquiryError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
