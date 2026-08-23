import Link from "next/link";
import { notFound } from "next/navigation";
import { RACES } from "@/lib/races";
import RaceViewer from "@/components/RaceViewer";

export function generateStaticParams() {
  return RACES.map((r) => ({ slug: r.slug }));
}

export default async function RacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const race = RACES.find((r) => r.slug === slug);
  if (!race) notFound();

  return (
    <div className="flex-1 flex flex-col">
      <header className="px-4 pt-6 pb-2 max-w-[1600px] mx-auto w-full">
        <Link
          href="/"
          className="text-[10px] font-pixel-heading text-[#4c6fff] hover:underline"
        >
          ◀ ALL RACES
        </Link>
        <h1 className="font-pixel-heading text-lg sm:text-xl text-white mt-3 leading-relaxed">
          {race.name}
        </h1>
        <p className="text-[#8fa2c8] text-base mt-1">{race.subtitle}</p>
      </header>
      <RaceViewer slug={race.slug} />
    </div>
  );
}
