'use client';

import { useMemo, useState } from 'react';

type Product = {
  external_product_id: string;
  sku?: string | null;
  name: string;
  stock_quantity?: number | null;
  metadata?: { branches?: Array<{ branch_id?: string; branch_name?: string; stock?: number }> } | null;
};

export default function InventoryOperationPanel({ products }: { products: Product[] }) {
  const [productId, setProductId] = useState(products[0]?.external_product_id ?? '');
  const selected = products.find((product) => product.external_product_id === productId);
  const branches = Array.isArray(selected?.metadata?.branches) ? selected!.metadata!.branches! : [];
  const [branchId, setBranchId] = useState(branches[0]?.branch_id ?? '');
  const [operation, setOperation] = useState('receive');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const selectedBranch = useMemo(() => branches.find((branch) => branch.branch_id === branchId), [branches, branchId]);

  function chooseProduct(value: string) {
    setProductId(value);
    const product = products.find((item) => item.external_product_id === value);
    const nextBranches = Array.isArray(product?.metadata?.branches) ? product!.metadata!.branches! : [];
    setBranchId(nextBranches[0]?.branch_id ?? '');
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/inventory-operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, branch_id: branchId, operation, quantity: Number(quantity), reason }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not submit inventory request');
      setMessage('Inventory change submitted for manager approval.');
      setQuantity('');
      setReason('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not submit inventory request');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm sm:p-6">
      <div>
        <div className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">New stock work</div>
        <h2 className="mt-1 text-xl font-black text-slate-950">Request inventory change</h2>
        <p className="mt-2 text-sm text-slate-500">WorkflowOS records the work. Admin changes the final stock only after approval.</p>
      </div>

      <label className="block text-sm font-bold text-slate-700">Product
        <select value={productId} onChange={(event) => chooseProduct(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
          {products.map((product) => <option key={product.external_product_id} value={product.external_product_id}>{product.name}{product.sku ? ` · ${product.sku}` : ''}</option>)}
        </select>
      </label>

      <label className="block text-sm font-bold text-slate-700">Branch
        <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
          {branches.map((branch) => <option key={branch.branch_id} value={branch.branch_id}>{branch.branch_name || branch.branch_id} · {Number(branch.stock || 0)} in stock</option>)}
        </select>
      </label>

      <label className="block text-sm font-bold text-slate-700">Operation
        <select value={operation} onChange={(event) => setOperation(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
          <option value="receive">Receive stock</option>
          <option value="damage">Damage / write-off</option>
          <option value="count">Stock count</option>
        </select>
      </label>

      <label className="block text-sm font-bold text-slate-700">{operation === 'count' ? 'Counted quantity' : 'Quantity'}
        <input min="0" max="10000" step="1" inputMode="numeric" value={quantity} onChange={(event) => setQuantity(event.target.value)} required className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />
      </label>

      {selectedBranch && <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">Admin currently reports {Number(selectedBranch.stock || 0)} units at {selectedBranch.branch_name || selectedBranch.branch_id}.</div>}

      <label className="block text-sm font-bold text-slate-700">Reason / receiving note
        <textarea value={reason} onChange={(event) => setReason(event.target.value)} required maxLength={240} rows={3} className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" placeholder="Supplier delivery, damaged during handling, physical count result…" />
      </label>

      <button disabled={busy || !products.length || !branchId} className="w-full rounded-xl bg-[#2e8b67] px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Submitting…' : 'Send for approval'}</button>
      {message && <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">{message}</div>}
    </form>
  );
}
