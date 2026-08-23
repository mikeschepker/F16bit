import { RACES } from "@/lib/races";
import RaceCalendar from "@/components/RaceCalendar";

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

      <RaceCalendar races={RACES} />
    </div>
  );
}
