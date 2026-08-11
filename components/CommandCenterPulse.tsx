import Link from 'next/link';

type PulseItem = {
  label: string;
  value: string | number;
  href: string;
  tone?: 'cyan' | 'violet' | 'emerald' | 'orange';
};

const tones = {
  cyan: 'from-cyan-500 to-blue-500',
  violet: 'from-violet-500 to-fuchsia-500',
  emerald: 'from-emerald-400 to-teal-500',
  orange: 'from-orange-400 to-rose-500',
} as const;

export default function CommandCenterPulse({ items }: { items: PulseItem[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.17em] text-cyan-600">Command center</div>
          <h2 className="mt-1 text-lg font-black text-slate-950">Owner pulse</h2>
        </div>
        <Link href="/activity" className="text-xs font-bold text-slate-500 hover:text-slate-950">
          Activity →
        </Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item, index) => {
          const tone = item.tone ?? (['cyan', 'violet', 'emerald', 'orange'] as const)[index % 4];
          return (
            <Link
              key={item.label}
              href={item.href}
              className="group rounded-xl border border-slate-100 bg-slate-50/70 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
            >
              <div className={`h-1.5 w-10 rounded-full bg-gradient-to-r ${tones[tone]}`} />
              <div className="mt-4 text-3xl font-black tracking-tight text-slate-950">{item.value}</div>
              <div className="mt-1 text-xs font-bold text-slate-500 group-hover:text-slate-900">{item.label}</div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
