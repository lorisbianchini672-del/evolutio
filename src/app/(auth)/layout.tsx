import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/logo-mark";
import { APP_NAME } from "@/lib/config";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="appx">
      <div className="appx-glow" aria-hidden="true" />
      <main className="appx-solo">
        <Link href="/" className="appx-solo-logo" aria-label={`${APP_NAME}, accueil`}>
          <LogoMark size={48} />
        </Link>
        <div className="card space-y-5">{children}</div>
      </main>
    </div>
  );
}
