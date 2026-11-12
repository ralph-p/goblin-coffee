/**
 * Placeholder Goblin Coffee mark: a coffee bean that is also a sprouting
 * seed — a nod to the "connection with nature" brand pillar.
 * Swap for real artwork once the logo is designed.
 */
export function GoblinMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* bean */}
      <ellipse cx="24" cy="30" rx="11" ry="14" />
      <path d="M24 16c-4 5-4 23 0 28" />
      {/* sprout */}
      <path d="M24 16V9" />
      <path d="M24 11c-1-4-5-6-9-5 0 4 4 6 9 5Z" />
      <path d="M24 9c1-4 5-6 9-5 0 4-4 6-9 5Z" />
    </svg>
  );
}
