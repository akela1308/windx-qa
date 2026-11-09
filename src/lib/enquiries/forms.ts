import type { SiteDoc } from "@/lib/design";
export const isEnquiryForm = (key: string) => key === "contact.form" || key === "contact.form-inline";
export const hasEnquiryForm = (doc: SiteDoc) => doc.sections.some((section) => isEnquiryForm(section.composition));
