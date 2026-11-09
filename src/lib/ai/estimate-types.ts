export type AiUsageReceipt = { requests: number; inputTokens: number; outputTokens: number; estimated: boolean; unknownRequests: number; demo: boolean };
export type AiEstimate = { id: string; expiresAt: number; action: "create" | "edit"; customerCharge?: "none" | "confirmation-required"; demo: boolean; inputLow: number; inputHigh: number; outputMax: number; requestsMax: number; includesStyle: boolean };
export class AiConsentError extends Error { constructor() { super("AI estimate needs confirmation"); } }
