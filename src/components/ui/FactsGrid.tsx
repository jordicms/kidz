import type { Fact } from '../../data/types';

export default function FactsGrid({ facts }: { facts: Fact[] }) {
  return (
    <div className="facts-grid">
      {facts.map((f) => (
        <div className="fact-card" key={f.label}>
          <span className="fact-icon">{f.icon}</span>
          <div className="fact-label">{f.label}</div>
          <div className="fact-value">{f.value}</div>
        </div>
      ))}
    </div>
  );
}
