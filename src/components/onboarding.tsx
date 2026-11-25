import Link from "next/link";
import { hideOnboardingAction } from "@/app/app/actions";
import type { OnboardingStep } from "@/lib/onboarding";

/** Guide de démarrage : 5 étapes cochées automatiquement au fil de l'usage. */
export function Onboarding({ steps }: { steps: OnboardingStep[] }) {
  const done = steps.filter((s) => s.done).length;
  return (
    <section className="card onboard" aria-labelledby="t-onboard">
      <div className="onboard-head">
        <div>
          <p className="reply-k">Bien démarrer</p>
          <h2 id="t-onboard" className="text-lg font-semibold">
            {done} sur {steps.length} étapes
          </h2>
        </div>
        <form action={hideOnboardingAction}>
          <button type="submit" className="btn btn-quiet">
            Masquer
          </button>
        </form>
      </div>
      <div className="onboard-bar" aria-hidden="true">
        <span style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ol className="onboard-list">
        {steps.map((s) => (
          <li key={s.id} className={s.done ? "is-done" : ""}>
            <span className="onboard-dot" aria-hidden="true">
              {s.done ? "✓" : ""}
            </span>
            {s.done ? (
              <span className="onboard-label">{s.label}</span>
            ) : (
              <Link href={s.href} className="onboard-label">
                <strong>{s.label}</strong>
                <span>{s.hint}</span>
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
