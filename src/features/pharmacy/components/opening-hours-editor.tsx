import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TIME_OPTIONS, WEEKDAYS, type DayHours, type OpeningHours, type Weekday } from "@/lib/opening-hours";
import { cn } from "@/lib/cn";

type OpeningHoursEditorProps = {
  value: OpeningHours;
  onChange: (value: OpeningHours) => void;
  /** Days to flag, e.g. closing before opening. */
  invalid?: Weekday[];
};

/** Compact week table: one line per day with an open switch and a from–to range. */
export function OpeningHoursEditor({ value, onChange, invalid = [] }: OpeningHoursEditorProps) {
  const setDay = (day: Weekday, changes: Partial<DayHours>) => onChange({ ...value, [day]: { ...value[day], ...changes } });

  const copyMondayToWeekdays = () => {
    const monday = value.mon;
    onChange({ ...value, tue: monday, wed: monday, thu: monday, fri: monday });
  };

  return (
    <div className="grid gap-2">
      <div className="divide-y divide-line rounded-[16px] ring-1 ring-line">
        {WEEKDAYS.map(([day, label]) => {
          const hours = value[day];
          const hasError = invalid.includes(day);
          return (
            <div key={day} className={cn("grid gap-x-3 gap-y-2 px-3 py-2 first:rounded-t-[16px] last:rounded-b-[16px] sm:grid-cols-[150px_1fr] sm:items-center", !hours.open && "bg-side-well")}>
              <div className="flex items-center gap-3">
                <Switch label={`${label} open`} checked={hours.open} onChange={(open) => setDay(day, { open })} />
                <span className="text-md font-semibold">{label}</span>
              </div>
              {hours.open ? (
                <div>
                  <div className="grid max-w-[360px] grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <Select compact hideLabel label={`${label} opens`} value={hours.from} options={TIME_OPTIONS} onChange={(from) => setDay(day, { from })} />
                    <span className="text-sm text-muted">to</span>
                    <Select compact hideLabel label={`${label} closes`} value={hours.to} options={TIME_OPTIONS} onChange={(to) => setDay(day, { to })} />
                  </div>
                  {hasError ? (
                    <p role="alert" className="mt-1 text-xs font-semibold text-bad">
                      Closing time must be after opening.
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted">Closed</p>
              )}
            </div>
          );
        })}
      </div>
      <button type="button" onClick={copyMondayToWeekdays} className="justify-self-start text-sm font-semibold text-accent-text hover:underline">
        Copy Monday to Tuesday–Friday
      </button>
    </div>
  );
}
