"use client";
import { geographyCopy } from "@/lib/requirements/geography";
import { useState } from "react";
import { saveRequirementsInputsAction } from "@/app/requirements-actions";
import {
  emptyRequirementsInputs,
  type RequirementsCheckState,
  type RequirementsInputs,
} from "@/lib/requirements/types";
import {
  requirementsChoices,
  requirementsQuestions,
  type RequirementsQuestion,
} from "@/lib/requirements/questions";
import {
  requirementsCopy,
  requirementsQuestionCopy,
} from "@/lib/requirements/copy";

export function RequirementsQuestions({
  siteId,
  locale,
  state,
  onSaved,
  onClose,
  initialQuestion,
}: {
  siteId: string;
  locale: string;
  state: RequirementsCheckState;
  onSaved: (state: RequirementsCheckState) => void;
  onClose: () => void;
  initialQuestion?: RequirementsQuestion;
}) {
  const t = requirementsCopy(locale);
  const [inputs, setInputs] = useState<RequirementsInputs>(
    state.profile?.inputs ?? emptyRequirementsInputs(),
  );
  const [index, setIndex] = useState(() =>
      Math.max(
        0,
        requirementsQuestions(
          state.profile?.inputs ?? emptyRequirementsInputs(),
          state.form,
          state.code,
        ).indexOf(initialQuestion!),
      ),
    ),
    [busy, setBusy] = useState(false),
    [blocked, setBlocked] = useState(false),
    [error, setError] = useState("");
  const keys = requirementsQuestions(inputs, state.form, state.code),
    position = Math.min(index, keys.length - 1),
    key = keys[position];
  const [title, why] = requirementsQuestionCopy(locale, key),
    choices = requirementsChoices[key];
  const max = key === "number" ? 40 : key === "country" ? 100 : 600;
  async function save() {
    setBusy(true);
    setError("");
    try {
      const result = await saveRequirementsInputsAction(
        siteId,
        inputs,
        state.profile?.revision ?? null,
      );
      if (!result.ok) {
        if (result.stale) {
          setBlocked(true);
          if (result.state) onSaved(result.state);
        }
        setError(
          result.stale ? t.conflict : result.limited ? t.rate : t.failed,
        );
        return;
      }
      onSaved(result.state);
      if (result.state.profile) setInputs(result.state.profile.inputs);
      if (position === keys.length - 1) onClose();
      else setIndex(position + 1);
    } catch {
      setError(t.failed);
    } finally {
      setBusy(false);
    }
  }
  const set = (value: string) => setInputs((old) => ({ ...old, [key]: value, ...(key === "country" && value !== old.country ? { market: "unknown" as const } : {}) }));
  return (
    <section
      className="mt-4 rounded-xl border border-line p-3"
      aria-label={t.questions}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">
          {t.question} {position + 1} / {keys.length}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className="text-xs underline underline-offset-4"
        >
          {t.close}
        </button>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <label
          htmlFor="requirements-answer"
          className="mt-4 block font-semibold"
        >
          {title}
        </label>
        <p
          id="requirements-why"
          className="mt-2 text-sm leading-relaxed text-muted"
        >
          {why}
        </p>
        {key === "country" && state.locationHint && <p className="mt-2 text-sm">{geographyCopy(locale).suggestion} <strong>{state.locationHint.country}</strong> ({state.locationHint.evidence})</p>}
        {choices ? (
          <select
            id="requirements-answer"
            aria-describedby="requirements-why"
            value={inputs[key]}
            disabled={busy}
            onChange={(event) => set(event.target.value)}
            className="mt-3 min-h-11 w-full min-w-0 rounded-lg border border-line bg-panel p-2 text-sm"
          >
            {choices.map((choice) => (
              <option key={choice} value={choice}>
                {t[choice as keyof typeof t]}
              </option>
            ))}
          </select>
        ) : (
          <>
            <textarea
              key={key}
              id="requirements-answer"
              aria-describedby="requirements-why"
              value={inputs[key]}
              disabled={busy}
              maxLength={max}
              rows={4}
              onChange={(event) => set(event.target.value)}
              className="mt-3 w-full rounded-lg border border-line bg-panel p-2 text-sm"
            />
            <p className="mt-1 text-xs text-muted">
              {t.max}: {max}
            </p>
          </>
        )}
        <p className="mt-3 text-xs leading-relaxed text-muted">{t.skip}</p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-warn">
            {error}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy || position === 0}
            onClick={() => {
              setIndex(position - 1);
              setError("");
            }}
            className="rounded-full border border-line px-3 py-2 text-sm disabled:opacity-50"
          >
            {t.back}
          </button>
          <button
            disabled={busy || blocked}
            className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-bg disabled:opacity-50"
          >
            {busy ? "…" : position === keys.length - 1 ? t.done : t.next}
          </button>
        </div>
      </form>
    </section>
  );
}
