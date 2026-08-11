'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

type Credential = {
  public_key: string;
  secret: string;
  note?: string;
};

export default function IntegrationQuickCreate({
  gadgetpointIntegrationId,
}: {
  gadgetpointIntegrationId?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [credentialBusy, setCredentialBusy] = useState(false);
  const [credentialError, setCredentialError] = useState('');
  const [credential, setCredential] = useState<Credential | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') || '').trim();
    const slug = String(fd.get('slug') || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-');
    const res = await fetch('/api/integrations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name,
        slug,
        kind: fd.get('kind'),
        base_url: fd.get('base_url') || null,
      }),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(body.error || 'Could not create integration');
      return;
    }
    e.currentTarget.reset();
    router.refresh();
  }

  async function generateCredential() {
    if (!gadgetpointIntegrationId) return;
    setCredentialBusy(true);
    setCredentialError('');
    setCredential(null);
    const res = await fetch(`/api/integrations/${gadgetpointIntegrationId}/credential`, {
      method: 'POST',
    });
    const body = await res.json();
    setCredentialBusy(false);
    if (!res.ok) {
      setCredentialError(body.error || 'Could not generate credentials');
      return;
    }
    setCredential(body);
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
  }

  return (
    <div className="space-y-5">
      {gadgetpointIntegrationId && (
        <section className="rounded-3xl border border-violet-100 bg-violet-50/70 p-5">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">
            GadgetPoint Site SSO
          </div>
          <h2 className="mt-1 text-lg font-black text-slate-950">Site bridge credentials</h2>
          <p className="mt-2 text-sm font-medium text-slate-600">
            Generate the two private values required by the GadgetPoint Site. The secret is shown only once.
          </p>

          {!credential ? (
            <button
              type="button"
              onClick={generateCredential}
              disabled={credentialBusy}
              className="primary-button mt-4 w-full"
            >
              {credentialBusy ? 'Generating…' : 'Generate GadgetPoint Site credentials'}
            </button>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-violet-100 bg-white p-3">
                <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                  WORKFLOWOS_GADGETPOINT_BRIDGE_ID
                </div>
                <div className="mt-1 break-all font-mono text-xs text-slate-900">{credential.public_key}</div>
                <button
                  type="button"
                  onClick={() => copy(credential.public_key)}
                  className="mt-2 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700"
                >
                  Copy bridge ID
                </button>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                <div className="text-[10px] font-black uppercase tracking-wide text-amber-800">
                  WORKFLOWOS_GADGETPOINT_BRIDGE_SECRET
                </div>
                <div className="mt-1 break-all font-mono text-xs text-slate-900">{credential.secret}</div>
                <button
                  type="button"
                  onClick={() => copy(credential.secret)}
                  className="mt-2 rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-amber-900"
                >
                  Copy bridge secret
                </button>
              </div>

              <p className="text-xs font-semibold text-rose-700">
                Store these only in the GadgetPoint Site secret environment variables. Do not paste them into chat.
              </p>
            </div>
          )}

          {credentialError && <div className="form-error mt-3">{credentialError}</div>}
        </section>
      )}

      <form onSubmit={submit} className="rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Connect a system</h2>
        <p className="mt-1 text-sm text-slate-500">
          Create an independent bridge. WorkflowOS receives only the operational data you choose to share.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input required name="name" className="app-input" placeholder="Integration name" />
          <input required name="slug" className="app-input" placeholder="Slug, e.g. gadgetpoint" />
          <select name="kind" className="app-input" defaultValue="website">
            <option value="commerce">Commerce</option>
            <option value="website">Website</option>
            <option value="marketplace">Marketplace</option>
            <option value="messaging">Messaging</option>
            <option value="custom">Custom</option>
          </select>
          <input name="base_url" className="app-input" placeholder="Base URL (optional)" />
          <button disabled={busy} className="primary-button md:col-span-2">
            {busy ? 'Connecting…' : 'Create bridge'}
          </button>
          {error && <div className="form-error md:col-span-2">{error}</div>}
        </div>
      </form>
    </div>
  );
}
