import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { HeroStudio } from "@/components/HeroStudio";
import { BRAND_NAME, PARENT_BRAND, PRICE_USD } from "@/lib/brand";

const STEPS = [
  { n: "1", title: "Upload", text: "Add an old photo of your pet — faded, scratched or grainy." },
  { n: "2", title: "Free preview", text: "See the restored photo side by side with the original." },
  { n: "3", title: `Download HD ($${PRICE_USD})`, text: "Love it? Unlock the clean high-resolution version." },
];

const CASES = [
  { key: "faded", label: "Faded & yellowed", before: "/demo/case-faded-before.jpg", after: "/demo/case-faded-after.jpg" },
  { key: "bw", label: "Black & white", before: "/demo/case-bw-before.jpg", after: "/demo/case-bw-after.jpg" },
  { key: "damaged", label: "Scratched & damaged", before: "/demo/case-damaged-before.jpg", after: "/demo/case-damaged-after.jpg" },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-amber-50">
      <header className="mx-auto w-full max-w-4xl px-6 pt-10 text-center">
        <span className="text-sm font-semibold tracking-widest text-amber-800">{BRAND_NAME}</span>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-20 px-6 py-12">
        <HeroStudio />

        {/* Three steps */}
        <section className="flex flex-col items-center gap-8">
          <div className="grid w-full gap-6 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n} className="rounded-2xl bg-white/70 p-6 text-center">
                <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-amber-800 text-sm font-semibold text-white">
                  {step.n}
                </span>
                <h3 className="mt-3 font-semibold text-zinc-700">{step.title}</h3>
                <p className="mt-1 text-sm text-zinc-500">{step.text}</p>
              </div>
            ))}
          </div>
          <p className="text-base font-medium text-amber-900">You only pay if you love the result.</p>
        </section>

        {/* Cases */}
        <section className="flex flex-col items-center gap-8">
          <h2 className="text-2xl font-semibold text-zinc-800">Every kind of old photo</h2>
          <div className="grid w-full gap-6 sm:grid-cols-3">
            {CASES.map((c) => (
              <figure key={c.key} className="flex flex-col gap-2">
                <BeforeAfterSlider beforeSrc={c.before} afterSrc={c.after} />
                <figcaption className="text-center text-sm text-zinc-500">{c.label}</figcaption>
              </figure>
            ))}
          </div>
          <p className="text-xs text-zinc-400">
            Our AI reconstructs fine details — always preview before you pay.
          </p>
        </section>

        {/* Pricing */}
        <section className="flex justify-center">
          <div className="w-full max-w-md rounded-2xl bg-white/80 p-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-800">Simple pricing</p>
            <p className="mt-2 text-5xl font-semibold text-zinc-800">${PRICE_USD}</p>
            <p className="text-sm text-zinc-500">per photo</p>
            <ul className="mx-auto mt-5 max-w-xs space-y-2 text-left text-sm text-zinc-600">
              <li className="flex items-start gap-2"><span aria-hidden className="text-emerald-600">✓</span> High-resolution restored photo</li>
              <li className="flex items-start gap-2"><span aria-hidden className="text-emerald-600">✓</span> No watermark</li>
              <li className="flex items-start gap-2"><span aria-hidden className="text-emerald-600">✓</span> Yours to download and keep</li>
            </ul>
            <p className="mt-5 text-xs text-zinc-400">Free watermarked preview first — no account needed.</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-amber-200 py-6 text-center text-xs text-zinc-400">
        by {PARENT_BRAND}
      </footer>
    </div>
  );
}
