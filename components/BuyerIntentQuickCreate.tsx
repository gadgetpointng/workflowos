'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

const fieldClass = 'field min-h-[44px] rounded-[13px] border-slate-200 bg-white';

export default function BuyerIntentQuickCreate() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const body = Object.fromEntries(formData.entries());

    try {
      const response = await fetch('/api/buyer-intents', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage({ tone: 'error', text: payload.error || 'Could not capture buyer demand.' });
        return;
      }

      form.reset();
      setMessage({ tone: 'success', text: 'Buyer demand captured and matched against the live catalog.' });
      router.refresh();
    } catch {
      setMessage({ tone: 'error', text: 'Connection problem. Buyer demand was not saved.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-2 xl:col-span-2">
          <span className="text-xs font-bold text-slate-600">What does the buyer want? *</span>
          <input
            name="product_query"
            required
            placeholder="e.g. Samsung A16, 45W charger, iPhone 13"
            className={fieldClass}
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold text-slate-600">Maximum budget</span>
          <input name="budget_max" type="number" min="0" step="1" placeholder="₦" className={fieldClass} inputMode="numeric" />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold text-slate-600">Urgency</span>
          <select name="urgency" defaultValue="normal" className={fieldClass}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="immediate">Immediate</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-2">
          <span className="text-xs font-bold text-slate-600">Buyer name</span>
          <input name="buyer_name" placeholder="Optional" className={fieldClass} autoComplete="name" />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold text-slate-600">Phone / WhatsApp</span>
          <input name="phone" placeholder="Optional" className={fieldClass} autoComplete="tel" inputMode="tel" />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold text-slate-600">Email</span>
          <input name="email" type="email" placeholder="Optional" className={fieldClass} autoComplete="email" />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold text-slate-600">Contact permission</span>
          <select name="consent_status" defaultValue="unknown" className={fieldClass}>
            <option value="unknown">Not confirmed</option>
            <option value="opted_in">Yes — buyer agreed</option>
            <option value="public_signal">Public signal only</option>
            <option value="do_not_contact">No — do not contact</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-2">
          <span className="text-xs font-bold text-slate-600">City</span>
          <input name="city" placeholder="e.g. Enugu" className={fieldClass} autoComplete="address-level2" />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold text-slate-600">State</span>
          <input name="state" placeholder="e.g. Enugu" className={fieldClass} autoComplete="address-level1" />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold text-slate-600">Source</span>
          <select name="source" defaultValue="manual" className={fieldClass}>
            <option value="manual">Manual enquiry</option>
            <option value="walk_in">Walk-in</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="storefront">GadgetPoint storefront</option>
            <option value="facebook">Facebook / Instagram</option>
            <option value="facebook_marketplace">Facebook Marketplace</option>
            <option value="tiktok">TikTok</option>
            <option value="jumia">Jumia</option>
            <option value="jiji">Jiji</option>
            <option value="konga">Konga</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold text-slate-600">Category</span>
          <input name="category" placeholder="Phones, Charging, Audio…" className={fieldClass} />
        </label>

        <label className="space-y-2 md:col-span-1">
          <span className="text-xs font-bold text-slate-600">Brand</span>
          <input name="brand" placeholder="Optional" className={fieldClass} />
        </label>

        <label className="space-y-2 md:col-span-1">
          <span className="text-xs font-bold text-slate-600">Model</span>
          <input name="model" placeholder="Optional" className={fieldClass} />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
        <button
          type="submit"
          disabled={busy}
          className="ios-action primary-button min-h-[44px] rounded-[13px] px-5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? 'Capturing…' : 'Capture buyer demand'}
        </button>
        <span className="text-xs leading-5 text-slate-500">
          A sales lead can only be created later when contact permission is explicitly Yes.
        </span>
        {message && (
          <div
            aria-live="polite"
            className={`w-full rounded-xl px-3 py-2 text-sm font-semibold ${message.tone === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
          >
            {message.text}
          </div>
        )}
      </div>
    </form>
  );
}
