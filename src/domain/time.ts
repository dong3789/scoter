export const TIME_SLOTS = ["morning", "noon", "evening", "bedtime"] as const;

export type TimeSlot = (typeof TIME_SLOTS)[number];

export const TIME_LABEL: Record<TimeSlot, string> = {
  morning: "아침",
  noon: "점심",
  evening: "저녁",
  bedtime: "자기 전",
};

export const TIME_IN_SENTENCE: Record<TimeSlot, string> = {
  morning: "아침에",
  noon: "점심에",
  evening: "저녁에",
  bedtime: "자기 전에",
};

export function isTimeSlot(value: string): value is TimeSlot {
  return (TIME_SLOTS as readonly string[]).includes(value);
}
