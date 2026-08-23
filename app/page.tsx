import Link from "next/link";
import { RACES } from "@/lib/races";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center px-4 py-12 gap-10">
      <header className="text-center flex flex-col gap-3 items-center">
        <h1 className="font-pixel-heading text-2xl sm:text-3xl text-white leading-relaxed [text-shadow:3px_3px_0_#4c6fff]">
          F16bit
        </h1>
        <p className="max-w-md text-[#8fa2c8] text-lg">
          Real Formula 1 race data, redrawn as a 16-bit arcade broadcast. Pick a
          race and watch it unfold, pixel by pixel.
        </p>
      </header>

      <div className="w-full max-w-2xl flex flex-col gap-4">
        {RACES.map((race) => (
          <Link
            key={race.slug}
            href={`/race/${race.slug}`}
            className="group block rounded-lg border-4 border-[#2a3554] bg-[#0c1220] p-5 shadow-[0_0_0_2px_#000] hover:border-[#4c6fff] transition-colors"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-[10px] uppercase tracking-widest text-[#4c6fff]">
                  {race.round} &middot; {race.year}
                </span>
                <span className="font-pixel-heading text-sm text-white leading-relaxed">
                  {race.name}
                </span>
                <span className="text-[#8fa2c8] text-base truncate">
                  {race.subtitle}
                </span>
              </div>
              <span className="shrink-0 font-pixel-heading text-[10px] text-[#4c6fff] group-hover:translate-x-1 transition-transform">
                WATCH ▶
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
