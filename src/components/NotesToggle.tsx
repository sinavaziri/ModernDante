'use client';

interface NotesToggleProps {
  on: boolean;
  onChange: (on: boolean) => void;
}

/** Turns the canto's annotations on or off */
export default function NotesToggle({ on, onChange }: NotesToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      title={on ? 'Hide the annotations (A)' : 'Show the annotations (A)'}
      className="group inline-flex items-center gap-3 rounded-full py-1 pl-1 pr-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        aria-hidden="true"
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${
          on ? 'border-transparent bg-brand' : 'border-border bg-muted'
        }`}
      >
        <span
          className={`h-3.5 w-3.5 rounded-full shadow-sm transition-transform motion-reduce:transition-none ${
            on ? 'translate-x-[18px] bg-primary-foreground' : 'translate-x-[3px] bg-muted-foreground'
          }`}
        />
      </span>
      Annotations
    </button>
  );
}
