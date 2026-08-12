'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type Match = {
  external_product_id?: string | null;
  name: string;
  category?: string | null;
  price?: number | null;
  available?: boolean | null;
};

type Result = {
  request_id: string;
  duplicate?: boolean;
  matches: Match[];
};

const fieldClass =
  'min-h-[48px] w-full rounded-[14px] border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#214e78] focus:ring-4 focus:ring-blue-100';

function money(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'Price on request';
  return `₦${Number(value).toLocaleString('en-NG')}`;
}

function availability(match: Match) {
  if (match.available === true) return { label: 'Available now', tone: 'bg-emerald-50 text-emerald-700' };
  if (match.available === false) return { label: 'Currently unavailable', tone: 'bg-amber-50 text-amber-700' };
  return { label: 'Availability to confirm', tone: 'bg-slate-100 text-slate-600' };
}

export default function PublicBuyerRequestForm() {
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  const attribution = useMemo(
    () => ({
      source: searchParams.get('source') || searchParams.get('utm_source') || 'direct',
      campaign: searchParams.get('campaign') || searchParams.get('utm_campaign') || 'none',
    }),
    [searchParams],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');

    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = Object.fromEntries(data.entries()) as Record<string, unknown>;
    payload.contact_consent = data.get('contact_consent') === 'yes';
    payload.attribution_source = attribution.source;
    payload.campaign = attribution.campaign;

    try {
      const response = await fetch('/api/public/buyer-request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(body.error || 'Your request could not be sent. Please try again.');
        return;
      }

      setResult({
        request_id: body.request_id || 'RECEIVED',
        duplicate: Boolean(body.duplicate),
        matches: Array.isArray(body.matches) ? body.matches : [],
      });
      form.reset();
    } catch {
      setError('Connection problem. Your request was not sent. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-lg font-black text-white">✓</div>
          <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950">
            {result.duplicate ? 'Your request is already with us' : 'Request received'}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Reference <span className="font-black text-slate-900">{result.request_id}</span>. GadgetPoint can now review your request and contact you using the details you provided.
          </p>
        </div>

        {result.matches.length > 0 && (
          <section>
            <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Possible live matches</div>
            <div className="mt-3 grid gap-3">
              {result.matches.map((match, index) => {
                const state = availability(match);
                return (
                  <div key={`${match.external_product_id || match.name}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-black text-slate-950">{match.name}</div>
                        <div className="mt-1 text-sm text-slate-500">{match.category || 'GadgetPoint product'} · {money(match.price)}</div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${state.tone}`}>{state.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className="flex flex-wrap gap-3">
          <a href="https://gadgetpoint.ng" className="ios-action primary-button min-h-[44px] rounded-[13px] px-5">
            Browse GadgetPoint
          </a>
          <button
            type="button"
            onClick={() => setResult(null)}
            className="ios-action secondary-button min-h-[44px] rounded-[13px] px-5"
          >
            Send another request
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-black text-slate-800">What phone, accessory or gadget do you need? *</span>
          <input
            name="product_query"
            required
            maxLength={140}
            placeholder="e.g. Samsung A16 128GB, iPhone 13, 45W charger"
            className={fieldClass}
            autoFocus
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold text-slate-700">Your name *</span>
          <input name="buyer_name" required maxLength={100} placeholder="Your name" className={fieldClass} autoComplete="name" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold text-slate-700">Phone / WhatsApp</span>
          <input name="phone" maxLength={40} placeholder="e.g. 0801 234 5678" className={fieldClass} autoComplete="tel" inputMode="tel" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold text-slate-700">Email</span>
          <input name="email" type="email" maxLength={160} placeholder="Optional if phone is supplied" className={fieldClass} autoComplete="email" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold text-slate-700">Maximum budget</span>
          <input name="budget_max" type="number" min="0" max="100000000" step="1" placeholder="₦" className={fieldClass} inputMode="numeric" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold text-slate-700">City</span>
          <input name="city" maxLength={80} placeholder="e.g. Enugu" className={fieldClass} autoComplete="address-level2" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold text-slate-700">State</span>
          <input name="state" maxLength={80} placeholder="e.g. Enugu" className={fieldClass} autoComplete="address-level1" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold text-slate-700">How soon do you need it?</span>
          <select name="urgency" defaultValue="normal" className={fieldClass}>
            <option value="normal">No rush</option>
            <option value="high">Within a few days</option>
            <option value="immediate">As soon as possible</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold text-slate-700">Brand</span>
          <input name="brand" maxLength={80} placeholder="Samsung, Apple, Oraimo…" className={fieldClass} />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-bold text-slate-700">Model</span>
          <input name="model" maxLength={100} placeholder="Optional" className={fieldClass} />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-bold text-slate-700">Category</span>
          <select name="category" defaultValue="" className={fieldClass}>
            <option value="">Choose if known</option>
            <option value="Phones">Phones</option>
            <option value="Charging">Charging & power</option>
            <option value="Audio">Earbuds, speakers & audio</option>
            <option value="Wearables">Smartwatches & wearables</option>
            <option value="Accessories">Cases, cables & accessories</option>
            <option value="Computing">Laptops & computing</option>
            <option value="Other">Other gadget</option>
          </select>
        </label>
      </div>

      <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <input
          name="contact_consent"
          value="yes"
          type="checkbox"
          required
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 accent-[#102a43]"
        />
        <span className="text-sm leading-6 text-slate-600">
          <strong className="text-slate-900">Yes, GadgetPoint may contact me about this request.</strong> This permission is for responding to this enquiry; it does not create a WorkflowOS account.
        </span>
      </label>

      {error && (
        <div aria-live="polite" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="ios-action primary-button min-h-[48px] rounded-[14px] px-6 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? 'Sending request…' : 'Find it for me'}
        </button>
        <span className="text-xs leading-5 text-slate-500">No payment is taken on this page.</span>
      </div>
    </form>
  );
}
