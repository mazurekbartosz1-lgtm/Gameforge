import AuthButton from "./AuthButton";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            GameForge <span className="text-zinc-400 font-normal text-xl">— test generatora</span>
          </h1>
          <AuthButton />
        </div>

        <div className="flex flex-col gap-3">
          <label htmlFor="description" className="text-zinc-300 text-sm font-medium">
            Opisz swoją grę
          </label>
          <textarea
            id="description"
            rows={6}
            placeholder="np. Platformówka 2D w stylu retro, gracz steruje rycerzem który zbiera monety i unika potworów..."
            className="w-full rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder-zinc-500 p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zinc-500"
          />
        </div>

        <button className="w-full rounded-xl bg-white text-zinc-950 font-semibold py-3 hover:bg-zinc-200 transition-colors">
          Generuj grę
        </button>
      </div>
    </main>
  );
}
