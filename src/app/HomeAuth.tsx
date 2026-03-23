"use client";

import { useUser, useSession, useClerk, SignIn } from "@clerk/nextjs";
import { useEffect, useState } from "react";

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours} godz. ${minutes} min.`;
  if (minutes > 0) return `${minutes} min.`;
  return "mniej niż minutę";
}

function LoggedIn() {
  const { user } = useUser();
  const { session } = useSession();
  const { signOut } = useClerk();
  const [duration, setDuration] = useState("");

  useEffect(() => {
    if (!session?.createdAt) return;
    const update = () => setDuration(formatDuration(Date.now() - session.createdAt.getTime()));
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [session?.createdAt]);

  const name = user?.firstName
    ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
    : user?.emailAddresses[0]?.emailAddress ?? "Gracz";

  const email = user?.emailAddresses[0]?.emailAddress;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          {user?.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.imageUrl} alt="avatar" className="w-10 h-10 rounded-full" />
          )}
          <div>
            <p className="text-white font-semibold text-sm">Grasz jako: {name}</p>
            {email && <p className="text-zinc-500 text-xs">{email}</p>}
          </div>
        </div>

        {duration && (
          <p className="text-zinc-500 text-xs">
            Zalogowany od: <span className="text-zinc-300">{duration}</span>
          </p>
        )}
      </div>

      <a
        href="/game"
        className="w-full rounded-xl bg-white text-zinc-950 font-semibold py-3 text-center hover:bg-zinc-200 transition-colors"
      >
        Wejdź do gry
      </a>

      <button
        onClick={() => signOut()}
        className="text-zinc-600 text-xs hover:text-zinc-400 transition-colors"
      >
        Wyloguj się
      </button>
    </div>
  );
}

function LoggedOut() {
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-zinc-400 text-sm">Zaloguj się żeby grać</p>
      <SignIn routing="hash" />
    </div>
  );
}

export default function HomeAuth() {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) return <div className="h-12 rounded-xl bg-zinc-900 animate-pulse" />;
  if (isSignedIn) return <LoggedIn />;
  return <LoggedOut />;
}
