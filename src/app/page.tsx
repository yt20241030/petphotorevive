import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { RestoreStudio } from "@/components/RestoreStudio";
import { BRAND_NAME, PARENT_BRAND, PRICE_USD } from "@/lib/brand";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-amber-50">
      <header className="mx-auto w-full max-w-3xl px-6 pt-8 text-center">
        <span className="text-sm font-semibold tracking-wide text-amber-800">{BRAND_NAME}</span>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-14 px-6 py-10">
        <section className="flex flex-col items-center gap-4 text-center">
          <h1 className="max-w-lg text-4xl font-semibold leading-tight text-zinc-800 sm:text-5xl">
            Bring your pet&apos;s old photos back to life
          </h1>
          <p className="max-w-md text-lg text-zinc-600">
            Upload a faded, blurry photo of your beloved pet. Our AI restores it to a clear,
            high-resolution keepsake in seconds.
          </p>
        </section>

        <section className="w-full max-w-md">
          <BeforeAfterSlider beforeSrc="/demo/before.jpg" afterSrc="/demo/after.jpg" />
          <p className="mt-2 text-center text-xs text-zinc-400">Example restoration</p>
        </section>

        <section className="flex w-full flex-col items-center gap-3">
          <RestoreStudio />
        </section>

        <section className="flex flex-col items-center gap-1 text-center text-sm text-zinc-500">
          <p>Free preview, watermarked. Full high-resolution download is ${PRICE_USD}.</p>
          <p>We only restore pet photos — no faces, no people.</p>
        </section>
      </main>

      <footer className="border-t border-amber-200 py-6 text-center text-xs text-zinc-400">
        by {PARENT_BRAND}
      </footer>
    </div>
  );
}
