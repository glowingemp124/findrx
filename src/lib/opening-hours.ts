export const WEEKDAYS = [
  ["mon", "Monday"],
  ["tue", "Tuesday"],
  ["wed", "Wednesday"],
  ["thu", "Thursday"],
  ["fri", "Friday"],
  ["sat", "Saturday"],
  ["sun", "Sunday"],
] as const;

export type Weekday = (typeof WEEKDAYS)[number][0];

/** Times are "HH:MM", 24-hour. */
export type DayHours = { open: boolean; from: string; to: string };
export type OpeningHours = Record<Weekday, DayHours>;

export const DEFAULT_HOURS: OpeningHours = {
  mon: { open: true, from: "09:00", to: "19:00" },
  tue: { open: true, from: "09:00", to: "19:00" },
  wed: { open: true, from: "09:00", to: "19:00" },
  thu: { open: true, from: "09:00", to: "19:00" },
  fri: { open: true, from: "09:00", to: "19:00" },
  sat: { open: true, from: "10:00", to: "16:00" },
  sun: { open: false, from: "10:00", to: "16:00" },
};

/** "09:30" -> "9:30 AM" */
export function formatTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

/** Every half hour of the day, for time pickers. */
export const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const value = `${String(Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`;
  return { value, label: formatTime(value) };
});

/** Days whose closing time isn't after their opening time. */
export function invalidDays(hours: OpeningHours): Weekday[] {
  return WEEKDAYS.filter(([day]) => hours[day].open && hours[day].to <= hours[day].from).map(([day]) => day);
}
