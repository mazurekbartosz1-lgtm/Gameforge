import HomeAuth from "./HomeAuth";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md flex flex-col gap-6">
        <h1 className="text-3xl font-bold text-white text-center tracking-tight">
          GameForge
        </h1>
        <HomeAuth />
      </div>
    </main>
  );
}
