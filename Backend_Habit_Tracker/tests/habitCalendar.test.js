import assert from "node:assert/strict";
import test from "node:test";
import {
  addDays,
  daily,
  metrics,
  periods,
  today,
  weekday,
} from "../src/utils/habitCalendar.js";
import {
  dateValue,
  idValue,
  quantityValue,
  validateHabit,
} from "../src/utils/habitValidation.js";

function habit(frequency = "diario", overrides = {}, records = []) {
  return {
    versiones: [
      {
        desde: "2026-10-01",
        inicio: "2026-10-01",
        frecuencia: frequency,
        dias: "1,3,5",
        dias_semana: 3,
        objetivo: 1,
        unidad: "",
        archivado: 0,
        ...overrides,
      },
    ],
    registros: records.map((date) => ({ fecha: date, cantidad: 1 })),
  };
}

test("calendar arithmetic handles leap years and ISO weekdays", () => {
  assert.equal(addDays("2024-02-28", 1), "2024-02-29");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(weekday("2026-10-05"), 1);
  assert.equal(weekday("2026-10-04"), 7);
  assert.match(today(), /^\d{4}-\d{2}-\d{2}$/);
});

test("invalid dates, identifiers and decimal quantities are rejected", () => {
  for (const value of ["2026-02-30", "2026-13-01", "abc", null, "1999-01-01"])
    assert.throws(() => dateValue(value));
  for (const value of ["-1", "1 OR 1", "0", "1.5", "4294967296"])
    assert.throws(() => idValue(value));
  for (const value of [-1, "1", Infinity, 0.0001, 1000001])
    assert.throws(() => quantityValue(value));
  assert.equal(quantityValue(0), 0);
  assert.equal(quantityValue(2.125), 2.125);
});

test("specific weekdays preserve streaks on unplanned days", () => {
  const scheduledHabit = habit(
    "dias",
    { desde: "2026-10-05", inicio: "2026-10-05" },
    ["2026-10-05", "2026-10-07"],
  );
  assert.equal(daily(scheduledHabit, "2026-10-06").programado, false);
  assert.equal(metrics(scheduledHabit, "2026-10-08").rachaActual, 2);
  assert.equal(metrics(scheduledHabit, "2026-10-10").rachaActual, 0);
  assert.equal(metrics(scheduledHabit, "2026-10-10").mejorRacha, 2);
});

test("open current day does not break the previous streak", () => {
  const dailyHabit = habit("diario", {}, ["2026-10-01", "2026-10-02"]);
  assert.equal(metrics(dailyHabit, "2026-10-03").rachaActual, 2);
  assert.equal(metrics(dailyHabit, "2026-10-04").rachaActual, 0);
});

test("weekly streak counts weeks and does not penalize an open week", () => {
  const weeklyHabit = habit(
    "semanal",
    { desde: "2026-09-28", inicio: "2026-09-28" },
    ["2026-09-28", "2026-09-30", "2026-10-02"],
  );
  assert.equal(metrics(weeklyHabit, "2026-10-08").rachaActual, 1);
  assert.equal(metrics(weeklyHabit, "2026-10-08").porcentaje, 100);
  assert.equal(metrics(weeklyHabit, "2026-10-12").rachaActual, 0);
  assert.equal(metrics(weeklyHabit, "2026-10-12").porcentaje, 50);
});

test("weekly target is capped for an initial partial week", () => {
  const weeklyHabit = habit(
    "semanal",
    { desde: "2026-10-04", inicio: "2026-10-04", dias_semana: 5 },
    ["2026-10-04"],
  );
  assert.equal(periods(weeklyHabit, "2026-10-04")[0].objetivo, 1);
  assert.equal(metrics(weeklyHabit, "2026-10-04").rachaActual, 1);
});

test("future records cannot affect a historical cutoff", () => {
  const weeklyHabit = habit(
    "semanal",
    { desde: "2026-10-05", inicio: "2026-10-05" },
    ["2026-10-06", "2026-10-07", "2026-10-08"],
  );
  assert.equal(periods(weeklyHabit, "2026-10-06")[0].realizado, 1);
});

test("versioned targets preserve historical completion", () => {
  const versionedHabit = habit("diario", {}, ["2026-10-01"]);
  versionedHabit.versiones.push({
    ...versionedHabit.versiones[0],
    desde: "2026-10-02",
    objetivo: 20,
  });
  assert.equal(daily(versionedHabit, "2026-10-01").completado, true);
  assert.equal(daily(versionedHabit, "2026-10-02").objetivo, 20);
});

test("archived days are excluded; restoration resumes the schedule", () => {
  const archivedHabit = habit("diario", {}, ["2026-10-01"]);
  archivedHabit.versiones.push({
    ...archivedHabit.versiones[0],
    desde: "2026-10-02",
    archivado: 1,
  });
  archivedHabit.versiones.push({
    ...archivedHabit.versiones[0],
    desde: "2026-10-05",
    archivado: 0,
  });
  assert.equal(daily(archivedHabit, "2026-10-03").programado, false);
  assert.equal(metrics(archivedHabit, "2026-10-05").rachaActual, 1);
});

test("no evaluable periods returns null rather than an invented percentage", () => {
  assert.equal(metrics(habit("diario"), "2026-10-01").porcentaje, null);
  assert.equal(
    metrics(
      habit("diario", { desde: "2026-11-01", inicio: "2026-11-01" }),
      "2026-10-01",
    ).rachaActual,
    0,
  );
});

test("habit fields enforce valid frequency, weekdays and limits", () => {
  const definition = {
    nombre: "Leer",
    frecuencia: "dias",
    inicio: today(),
    dias: [1, 3, 5],
    objetivo: 20,
  };
  assert.equal(validateHabit(definition).dias, "1,3,5");
  for (const override of [
    { dias: [] },
    { dias: [1, 1] },
    { frecuencia: "otro" },
    { objetivo: 0 },
    { dias_semana: 8 },
    { nombre: " " },
  ]) {
    assert.throws(() => validateHabit({ ...definition, ...override }));
  }
});
