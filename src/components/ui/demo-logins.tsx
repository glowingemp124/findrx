import { useState } from "react";
import { Select } from "@/components/ui/select";

export type DemoLogin = { name: string; email: string; password: string };
export type DemoLoginGroup = { label: string; logins: DemoLogin[] };

const rowClass = "flex min-w-0 items-center gap-2 rounded-full bg-side-well p-1 pr-1.5";
const chipClass = "shrink-0 rounded-full bg-card px-2.5 py-1 text-xs font-semibold text-ink-2";

/** A single account fills on click; a group fills as soon as an account is picked. */
function GroupRow({ group, onPick }: { group: DemoLoginGroup; onPick: (login: DemoLogin) => void }) {
  const [email, setEmail] = useState<string | null>(null);
  const [only] = group.logins;
  if (!only) return null;

  if (group.logins.length === 1) {
    return (
      <button
        type="button"
        onClick={() => onPick(only)}
        title={`Fill ${only.email}`}
        className={`${rowClass} h-10 cursor-pointer text-left transition-colors hover:bg-accent-soft focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none`}
      >
        <span className={chipClass}>{group.label}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{only.name}</span>
        <span className="shrink-0 truncate text-sm text-muted">{only.email}</span>
      </button>
    );
  }

  return (
    <div className={rowClass}>
      <span className={chipClass}>{group.label}</span>
      <Select
        compact
        hideLabel
        label={`${group.label} account`}
        placeholder={`Choose a ${group.label.toLowerCase()} account`}
        value={email}
        options={group.logins.map((item) => ({ value: item.email, label: item.name }))}
        onChange={(next) => {
          setEmail(next);
          const login = group.logins.find((item) => item.email === next);
          if (login) onPick(login);
        }}
        className="min-w-0 flex-1 [&_button]:h-8"
      />
    </div>
  );
}

/** Demo accounts that fill the sign-in form. Mock only; remove with the seeds. */
export function DemoLogins({ groups, onPick }: { groups: DemoLoginGroup[]; onPick: (login: DemoLogin) => void }) {
  return (
    <div className="grid gap-1.5">
      <p className="text-xs font-semibold text-muted">Demo accounts · pick one to fill the form</p>
      {groups.map((group) => (
        <GroupRow key={group.label} group={group} onPick={onPick} />
      ))}
    </div>
  );
}
