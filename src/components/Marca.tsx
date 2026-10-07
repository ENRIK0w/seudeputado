/** Marca: um semicírculo de cadeiras (o plenário) em pontos. */
export function Marca({ className = "" }: { className?: string }) {
  const pontos: [number, number][] = [];
  const fileiras = [
    { r: 10, n: 7 },
    { r: 6.2, n: 5 },
  ];
  for (const { r, n } of fileiras)
    for (let i = 0; i < n; i++) {
      const a = Math.PI - (i / (n - 1)) * Math.PI;
      pontos.push([12 + r * Math.cos(a), 15 - r * Math.sin(a)]);
    }
  return (
    <svg viewBox="0 0 24 17" className={className} aria-hidden>
      {pontos.map(([x, y], i) => (
        <circle key={i} cx={x.toFixed(2)} cy={y.toFixed(2)} r="1.35" fill="currentColor" opacity={i === 3 ? 1 : 0.55} />
      ))}
      <circle cx="12" cy="15" r="1.35" fill="var(--accent)" />
    </svg>
  );
}
