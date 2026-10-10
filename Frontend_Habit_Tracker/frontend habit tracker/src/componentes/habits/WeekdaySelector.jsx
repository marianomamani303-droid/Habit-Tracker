const weekdayNames = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export default function WeekdaySelector({ selectedDays, onChange }) {
  function toggleDay(day, checked) {
    onChange(
      checked
        ? [...selectedDays, day]
        : selectedDays.filter((selected) => selected !== day),
    );
  }
  return (
    <fieldset>
      <legend>Días programados</legend>
      <div className="habit-weekdays">
        {weekdayNames.map((name, index) => (
          <label key={name}>
            <input
              type="checkbox"
              checked={selectedDays.includes(index + 1)}
              onChange={(event) => toggleDay(index + 1, event.target.checked)}
            />
            {name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
