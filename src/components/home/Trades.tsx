// Бегущая строка ниш: показывает, что конструктор не про одну отрасль.
// Единственная бегущая строка на странице.
export function Trades({ trades }: { trades: string[] }) {
  const run = trades.flatMap((x) => [x, "/"]);
  return (
    <div className="overflow-hidden border-y border-[#121211] bg-[#121211] py-4 text-brand" aria-label={trades.join(", ")}>
      <div className="ticker flex w-max gap-6 whitespace-nowrap font-display text-xl font-bold uppercase tracking-tight md:text-2xl" aria-hidden="true">
        {[...run, ...run].map((x, i) => (
          <span key={i} className={x === "/" ? "text-white/40" : ""}>{x}</span>
        ))}
      </div>
    </div>
  );
}
