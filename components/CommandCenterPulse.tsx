import Link from 'next/link';

type PulseItem = {
  label: string;
  value: string | number;
  href: string;
  tone?: 'cyan' | 'violet' | 'emerald' | 'orange';
};

const tones = {
  cyan: { bar: 'bg-[#2563a9]', text: 'text-[#2563a9]', soft: 'bg-[#edf3f8]' },
  violet: { bar: 'bg-[#52738f]', text: 'text-[#52738f]', soft: 'bg-[#f1f5f8]' },
  emerald: { bar: 'bg-[#157347]', text: 'text-[#157347]', soft: 'bg-[#edf7f2]' },
  orange: { bar: 'bg-[#946200]', text: 'text-[#946200]', soft: 'bg-[#fff5dc]' },
} as const;

export default function CommandCenterPulse({ items }: { items: PulseItem[] }) {
  return (
    <section className="rounded-[16px] border border-[#dfe5eb] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.11em] text-[#52738f]">Management overview</div>
          <h2 className="mt-1 text-lg font-bold text-[#172b3a]">Operating pulse</h2>
        </div>
        <Link href="/activity" className="text-xs font-semibold text-[#5f6f7f] hover:text-[#172b3a]">
          Activity →
        </Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item, index) => {
          const tone = item.tone ?? (['cyan', 'violet', 'emerald', 'orange'] as const)[index % 4];
          const style = tones[tone];
          return (
            <Link
              key={item.label}
              href={item.href}
              className="group relative overflow-hidden rounded-xl border border-[#e2e7ec] bg-[#fafbfc] p-4 transition hover:border-[#c8d2db] hover:bg-white"
            >
              <div className={`absolute inset-y-0 left-0 w-[3px] ${style.bar}`} />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-2xl font-bold tabular-nums tracking-[-0.025em] text-[#172b3a]">{item.value}</div>
                  <div className="mt-1 text-xs font-semibold text-[#657686] group-hover:text-[#32485b]">{item.label}</div>
                </div>
                <span className={`mt-1 h-2 w-2 rounded-full ${style.bar}`} />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
