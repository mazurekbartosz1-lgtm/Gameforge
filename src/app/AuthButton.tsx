"use client";
import { useUser, useClerk } from "@clerk/nextjs";

export default function AuthButton() {
  const { isLoaded, isSignedIn } = useUser();
  const { openSignIn, signOut } = useClerk();

  if (!isLoaded) return null;

  if (isSignedIn) {
    return (
      <button
        onClick={() => signOut()}
        className="rounded-lg bg-zinc-800 text-zinc-200 text-sm font-medium px-4 py-2 hover:bg-zinc-700 transition-colors"
      >
        Wyloguj się
      </button>
    );
  }

  return (
    <button
      onClick={() => openSignIn()}
      className="rounded-lg bg-zinc-800 text-zinc-200 text-sm font-medium px-4 py-2 hover:bg-zinc-700 transition-colors"
    >
      Zaloguj się
    </button>
  );
}
