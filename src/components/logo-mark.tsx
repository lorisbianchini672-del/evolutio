/** Monogramme « e. » d'Evolutio : laque noire, trait crème, point ambre. */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x=".5" y=".5" width="31" height="31" rx="9.5" fill="#0d0d10" stroke="rgba(255,255,255,.12)" />
      <path
        d="M7.6 15.6H23.4A7.8 7.8 0 1 0 21.1 21.3"
        fill="none"
        stroke="#f3f0ea"
        strokeWidth="2.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24.6" cy="24.4" r="1.9" fill="#e3a964" />
    </svg>
  );
}
