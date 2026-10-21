export function DayMark(props: {
  label: string;
  detail: string;
  completed: boolean;
  today: boolean;
  future: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      class="day-mark"
      classList={{
        "day-mark-done": props.completed,
        "day-mark-today": props.today,
        "day-mark-future": props.future,
      }}
      aria-pressed={props.completed}
      aria-current={props.today ? "date" : undefined}
      aria-label={props.detail}
      title={props.future ? "That day has not happened yet" : props.detail}
      disabled={props.future}
      onClick={() => props.onToggle()}
    >
      {props.label}
    </button>
  );
}
