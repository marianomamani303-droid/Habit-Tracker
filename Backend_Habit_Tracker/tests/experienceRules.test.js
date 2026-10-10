import test from "node:test";
import assert from "node:assert/strict";
import {
  daily,
  scheduled,
  dates,
  metrics,
  today,
} from "../src/utils/habitCalendar.js";
import {
  statisticsRange,
  periodStatistics,
} from "../src/utils/statisticsRules.js";
import { achievementEvidence } from "../src/utils/achievementRules.js";
import { timezoneValue, newPassword } from "../src/utils/profileValidation.js";

function habit(from = "2026-01-01", to = "2026-10-09", overrides = {}) {
  return {
    id: 1,
    versiones: [
      {
        desde: from,
        inicio: from,
        frecuencia: "diario",
        dias: "1,3,5",
        objetivo: 1,
        dias_semana: 3,
        archivado: 0,
        ...overrides,
      },
    ],
    registros: dates(from, to).map((fecha) => ({ fecha, cantidad: 1 })),
  };
}
test("calendar day follows the user timezone across midnight and DST", () => {
  const instant = new Date("2026-10-09T23:30:00Z");
  assert.equal(today("America/Argentina/Buenos_Aires", instant), "2026-10-09");
  assert.equal(today("Pacific/Kiritimati", instant), "2026-10-10");
  assert.equal(
    today("America/New_York", new Date("2026-03-08T06:30:00Z")),
    "2026-03-08",
  );
});
test("custom intervals keep their anchor and skip rest days in streaks", () => {
  const h = habit("2026-10-01", "2026-10-09", { intervalo_dias: 3 });
  assert.equal(scheduled(h.versiones[0], "2026-10-02"), false);
  assert.equal(scheduled(h.versiones[0], "2026-10-04"), true);
  assert.equal(metrics(h, "2026-10-09").rachaActual, 3);
});
test("subtasks must all be checked, scoped by their historical dates", () => {
  const h = habit("2026-10-01", "2026-10-09");
  h.subtareas = [
    { id: 1, nombre: "Paso", desde: "2026-10-05", hasta: "2026-10-08" },
  ];
  assert.equal(daily(h, "2026-10-04").completado, true);
  assert.equal(daily(h, "2026-10-05").completado, false);
  h.subtareaRegistros = [
    { subtarea_id: 1, fecha: "2026-10-05", completado: 1 },
  ];
  assert.equal(daily(h, "2026-10-05").completado, true);
  assert.equal(daily(h, "2026-10-08").completado, true);
});
test("annual statistics use full history, exclude future and include pending today", () => {
  const h = habit();
  h.registros.pop();
  const result = periodStatistics(
    [h],
    statisticsRange({ periodo: "ano", fecha: "2026-10-09" }, "2026-10-09"),
    "2026-10-09",
  );
  assert.equal(result.serie.length, 12);
  assert.equal(result.serie[0].completados, 31);
  assert.equal(result.resumenPeriodo.programados, 282);
  assert.equal(result.resumenPeriodo.completados, 281);
  assert.equal(result.serie[9].porcentaje, 89);
  assert.equal(result.serie[10].total, 0);
});
test("scheduled weekdays are the percentage denominator", () => {
  const h = habit("2026-10-05", "2026-10-09", { frecuencia: "dias" });
  h.registros = h.registros.filter((r) => r.fecha === "2026-10-05");
  const result = periodStatistics(
    [h],
    statisticsRange({ periodo: "semana", fecha: "2026-10-09" }, "2026-10-09"),
    "2026-10-09",
  );
  assert.deepEqual(result.resumenPeriodo, {
    programados: 3,
    completados: 1,
    porcentaje: 33,
  });
});
test("weekly goals are one obligation, not seven daily failures", () => {
  const h = habit("2026-10-05", "2026-10-07", { frecuencia: "semanal" });
  const result = periodStatistics(
    [h],
    statisticsRange({ periodo: "semana", fecha: "2026-10-09" }, "2026-10-09"),
    "2026-10-09",
  );
  assert.equal(result.resumenPeriodo.programados, 1);
  assert.equal(result.resumenPeriodo.porcentaje, 100);
});
test("bad ranges and timezone/password validation reject malformed inputs", () => {
  for (const query of [
    { periodo: "otro" },
    { periodo: "rango", desde: "2026-10-09", hasta: "2026-10-01" },
    { periodo: "rango", desde: "2020-01-01", hasta: "2026-01-01" },
  ])
    assert.throws(() => statisticsRange(query, "2026-10-09"));
  assert.throws(() => timezoneValue("Bad/Timezone"));
  assert.throws(() =>
    newPassword({ password: "a".repeat(73), confirmar: "a".repeat(73) }),
  );
});
test("achievements use full data and skip unplanned weekdays", () => {
  const h = habit("2026-10-01", "2026-10-09");
  const evidence = achievementEvidence([h], "2026-10-09");
  assert.equal(evidence.progreso.racha7, 9);
  assert.equal(evidence.totalCompletados, 9);
  assert.equal(
    achievementEvidence([habit()], "2026-10-09").progreso.total100,
    282,
  );
  const weekly = habit("2026-09-01", "2026-10-09", { frecuencia: "semanal" });
  assert.equal(achievementEvidence([weekly], "2026-10-09").progreso.racha7, 0);
});
test("perfect week requires a full closed scheduled week", () => {
  assert.equal(
    achievementEvidence(
      [habit("2026-10-05", "2026-10-11", { frecuencia: "dias" })],
      "2026-10-12",
    ).progreso.perfecta,
    1,
  );
  assert.equal(
    achievementEvidence([habit("2026-10-05", "2026-10-11")], "2026-10-11")
      .progreso.perfecta,
    0,
  );
  assert.equal(
    achievementEvidence([habit("2026-10-05", "2026-10-11")], "2026-10-12")
      .progreso.perfecta,
    1,
  );
  assert.equal(
    achievementEvidence([habit("2026-10-06", "2026-10-11")], "2026-10-12")
      .progreso.perfecta,
    0,
  );
});
