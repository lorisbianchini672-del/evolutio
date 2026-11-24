type Params = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Affiche le message de succès (?ok=) ou d'erreur (?erreur=) laissé par une action. */
export function Notice({ params }: { params: Params }) {
  const ok = first(params.ok);
  const error = first(params.erreur);
  if (!ok && !error) return null;
  return (
    <div className={error ? "notice-error" : "notice-ok"} role={error ? "alert" : "status"}>
      {error ?? ok}
    </div>
  );
}
