import { Suspense } from 'react';
import type { Metadata } from 'next';
import PublicBuyerRequestForm from '@/components/PublicBuyerRequestForm';

export const metadata: Metadata = {
  title: 'Find a Gadget',
  description: 'Tell GadgetPoint what phone, accessory or gadget you want and let the team match your request against the live catalog.',
  robots: { index: true, follow: true },
};

export default function BuyerRequestPage() {
  return (
    <main className="min-h-screen bg-[#f4f6f8] text-slate-950">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <header className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5">
          <a href="https://gadgetpoint.ng" className="flex items-center gap-3" aria-label="GadgetPoint home">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#102a43] text-sm font-black tracking-tight text-white">GP</div>
            <div>
              <div className="text-sm font-black tracking-tight text-[#102a43]">GadgetPoint</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Buyer request</div>
            </div>
          </a>
          <a href="https://gadgetpoint.ng" className="ios-action secondary-button rounded-[13px] px-3 py-2 text-sm font-bold">
            Browse store
          </a>
        </header>

        <div className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12 lg:py-12">
          <section>
            <div className="inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#214e78]">
              Enugu · Nigeria-wide enquiries
            </div>
            <h1 className="mt-5 max-w-xl text-4xl font-black leading-[1.05] tracking-[-0.04em] text-[#102a43] sm:text-5xl">
              Tell us the gadget you want. We’ll match it against GadgetPoint.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
              Looking for a specific phone, charger, earbuds, smartwatch or accessory? Send one request and GadgetPoint can review your budget, location and the current live catalog.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {[
                ['1', 'Tell us what you need'],
                ['2', 'We check live matches'],
                ['3', 'GadgetPoint follows up'],
              ].map(([number, label]) => (
                <div key={number} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#102a43] text-xs font-black text-white">{number}</div>
                  <div className="mt-3 text-sm font-black text-slate-900">{label}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600 shadow-sm">
              <strong className="text-slate-900">GadgetPoint remains the store.</strong> This page only captures your enquiry and helps the team match demand to the live catalog. No payment, checkout or customer account is created here.
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7 lg:p-8">
            <div className="mb-6">
              <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Quick request</div>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-[#102a43]">What are you looking for?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Add at least one contact method so GadgetPoint can respond to your enquiry.</p>
            </div>
            <Suspense fallback={<div className="min-h-[420px] animate-pulse rounded-2xl bg-slate-100" />}>
              <PublicBuyerRequestForm />
            </Suspense>
          </section>
        </div>

        <footer className="border-t border-slate-200 py-5 text-center text-xs leading-5 text-slate-500">
          GadgetPoint buyer requests are processed inside WorkflowOS. Inventory and fulfilment remain controlled by GadgetPoint.
        </footer>
      </div>
    </main>
  );
}
