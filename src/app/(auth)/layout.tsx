import Link from "next/link";
import type { ReactNode } from "react";
import { APP_NAME } from "@/lib/config";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <Link href="/" className="brand mb-8 justify-center">
        {APP_NAME}
      </Link>
      <div className="card space-y-5">{children}</div>
    </main>
  );
}
