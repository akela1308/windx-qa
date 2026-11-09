import { z } from "zod";
import { defineComposition, type RenderCtx } from "../registry";
import { text } from "../parts";

const props = z.object({ title: text.max(100), intro: z.string().max(400).optional(), submitLabel: text.max(40) });
type Props = z.infer<typeof props>;
const css = `.eq .eq-head{max-width:42rem;margin-bottom:1.75rem}.eq h2{font-family:var(--f-display);font-weight:var(--d-weight);font-style:var(--d-style);letter-spacing:var(--d-track);font-size:clamp(1.7rem,3vw,3rem);line-height:1.1}.eq .eq-head p{margin-top:.75rem;max-width:52ch}.eq form{max-width:48rem}.eq fieldset{border:0;padding:0;margin:0;min-width:0}.eq label{display:block;font-size:.9rem}.eq input,.eq textarea{display:block;width:100%;min-width:0;margin-top:.45rem;padding:.8rem .9rem;border:1px solid var(--line);border-radius:var(--radius);background:var(--surface);color:var(--ink);font:inherit;font-size:1rem}.eq input:focus-visible,.eq textarea:focus-visible{outline:2px solid var(--ink);outline-offset:2px}.eq textarea{resize:vertical;min-height:8rem}.eq .eq-fields{display:grid;grid-template-columns:1fr 1fr;gap:1rem}.eq .eq-message{grid-column:1/-1}.eq button{margin-top:1rem;min-height:44px;padding:.8rem 1.3rem;border:1px solid var(--ink);border-radius:var(--radius);background:var(--accent);color:var(--accent-ink);font:inherit;font-weight:600;cursor:pointer}.eq button:disabled{opacity:.55;cursor:default}.eq .eq-note,.eq .eq-status{font-size:.85rem;line-height:1.5;margin-top:.8rem;max-width:60ch;overflow-wrap:anywhere}.eq .eq-status:empty{display:none}.eq .eq-trap{position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden}.eq-inline .eq-fields{grid-template-columns:1fr 1.4fr auto;align-items:end}.eq-inline button{margin:0}.eq [disabled] input,.eq [disabled] textarea{opacity:.65}@media(max-width:640px){.eq .eq-fields,.eq-inline .eq-fields{grid-template-columns:1fr}.eq .eq-message{grid-column:auto}.eq-inline button{width:100%}}`;

function Form(p: Props, ctx: RenderCtx, compact: boolean) {
  const runtime = ctx.enquiry, enabled = !!runtime?.recipientReady;
  const index = ctx.sectionIndex ?? ctx.index;
  const prefix = `enquiry-${index}`;
  return <section className={`sec eq${compact ? " eq-inline" : ""}`}><div className="wrap">
    <header className="eq-head"><h2>{p.title}</h2>{p.intro && <p>{p.intro}</p>}</header>
    <form method="post" action={runtime?.action} data-windx-enquiry={enabled ? "live" : "preview"}>
      <input type="hidden" name="token" value={runtime?.token(index) ?? ""} />
      <input type="hidden" name="submission" value="native" />
      <div className="eq-trap" aria-hidden="true"><label>Leave this field empty<input name="extra_reference" tabIndex={-1} autoComplete="off" /></label></div>
      <fieldset disabled={!enabled} aria-describedby={`${prefix}-note`}>
        <div className="eq-fields">
          {!compact && <label htmlFor={`${prefix}-name`}>Your name<input id={`${prefix}-name`} name="name" required maxLength={100} autoComplete="name" /></label>}
          <label htmlFor={`${prefix}-contact`}>Email or phone<input id={`${prefix}-contact`} name="contact" required maxLength={254} autoComplete="off" /></label>
          <label className={compact ? "" : "eq-message"} htmlFor={`${prefix}-message`}>{compact ? "Your enquiry" : "Message"}{compact ? <input id={`${prefix}-message`} name="message" required maxLength={4000} /> : <textarea id={`${prefix}-message`} name="message" required maxLength={4000} rows={4} />}</label>
          {compact && <button type="submit">{p.submitLabel}</button>}
        </div>
        {!compact && <button type="submit">{p.submitLabel}</button>}
      </fieldset>
      <p id={`${prefix}-note`} className="eq-note">{enabled ? `${compact ? "Your contact details and message" : "Your name, contact details and message"} are stored in a private inbox for the site owner to respond to your enquiry.` : "Preview only. The form will accept enquiries after publishing and confirming its recipient."}</p>
      <p className="eq-status" role="status" aria-live="polite" />
    </form>
  </div></section>;
}

export const enquiry = {
  "contact.form": defineComposition({ description: "Форма заявки: имя, email или телефон, сообщение. Это запрос владельцу, не подтверждённая запись или покупка. Получатель подтверждается отдельно в кабинете.", props, css, render: (p, ctx) => Form(p, ctx, false) }),
  "contact.form-inline": defineComposition({ description: "Компактная строка запроса в конце страницы: контакт и короткое сообщение. На телефоне поля идут друг под другом. Не обещает бронирование или немедленный ответ.", props, css, render: (p, ctx) => Form(p, ctx, true) }),
};
