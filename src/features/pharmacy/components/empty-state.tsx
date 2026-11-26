import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";

export function EmptyState({ icon, title, children }: { icon: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="rise-in grid place-items-center gap-2 rounded-[20px] border border-dashed border-line-strong px-6 py-14 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-side-well text-muted">
        <Icon name={icon} />
      </span>
      <p className="text-lg font-semibold">{title}</p>
      {children ? <p className="max-w-[420px] text-md text-muted">{children}</p> : null}
    </div>
  );
}
