"use client";
import { useActionState, useState } from "react";
import { enquiryRecipientAction } from "@/app/enquiry-actions";
import type { EditorData, EditorT } from "./Editor";

export function EnquiryRecipient({ data, t }: { data: EditorData; t: EditorT }) {
  const [state, action, pending] = useActionState(enquiryRecipientAction.bind(null, data.siteId), "");
  const e = t.enquiries;
  const [invalid, setInvalid] = useState(false);
  const error = data.locale === "ru" ? "Введите корректный адрес электронной почты." : data.locale === "es" ? "Introduce una dirección de correo válida." : "Enter a valid email address.";
  return <section className="border-b border-line p-4 text-sm">
    <h3 className="font-medium">{e.recipientTitle}</h3><p className="mt-2 leading-relaxed text-muted">{e.recipientHelp}</p>
    <form action={action} noValidate className="mt-4" onSubmit={event => {
      const input = event.currentTarget.elements.namedItem("email") as HTMLInputElement;
      const bad = !input.value.trim() || !input.validity.valid;
      setInvalid(bad);
      if (bad) { event.preventDefault(); input.focus(); }
    }}>
      <label className="block">{e.recipientLabel}<input name="email" type="email" aria-invalid={invalid} aria-describedby={invalid ? "recipient-error" : undefined} onChange={() => setInvalid(false)} required maxLength={254} defaultValue={data.enquiries.recipient ?? ""} className="mt-2 w-full rounded-xl border border-line bg-bg px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ink" /></label>
      {invalid && <p id="recipient-error" role="alert" className="mt-2 text-warn">{error}</p>}
      <button disabled={pending} className="mt-3 rounded-full border border-line px-4 py-2 font-medium disabled:opacity-50">{e.confirm}</button>
    </form>
    {data.enquiries.confirmed && <p className="mt-3 text-muted">{e.confirmed}</p>}
    {state === "error" && <p role="alert" className="mt-3 text-warn">{e.error}</p>}
  </section>;
}
