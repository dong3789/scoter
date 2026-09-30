import { TIME_LABEL, TIME_SLOTS, type TimeSlot } from "@/domain/time";

export function TimeFields({
  servings = "1",
  timeSlot = "morning",
}: {
  servings?: string;
  timeSlot?: TimeSlot;
}) {
  return (
    <div className="pair">
      <label>
        배수
        <input name="servings" type="number" min="0.01" step="any" defaultValue={servings} required />
      </label>
      <label>
        시간
        <select name="timeSlot" defaultValue={timeSlot}>
          {TIME_SLOTS.map((slot) => (
            <option key={slot} value={slot}>
              {TIME_LABEL[slot]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
