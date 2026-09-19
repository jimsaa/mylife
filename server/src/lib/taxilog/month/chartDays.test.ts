import assert from "node:assert/strict";
import { test } from "node:test";
import {
  barHeightPercent,
  buildMonthChartDays,
  buildWeekChartDays,
  maxGrossIncome,
  resolveSelectedChartDate,
} from "./chartDays";

test("monthly chart includes every calendar day and uses gross income only", () => {
  const days = buildMonthChartDays(2026, 9, [
    { date: "2026-09-01", grossIncome: "56700" },
    { date: "2026-09-17", grossIncome: "2200" },
    { date: "2026-09-19", grossIncome: "3300" },
  ]);

  assert.equal(days.length, 30);
  assert.equal(days[0]?.date, "2026-09-01");
  assert.equal(days[0]?.weekdayShortSv, "Tis");
  assert.equal(days[13]?.date, "2026-09-14");
  assert.equal(days[13]?.weekdayShortSv, "Mån");
  assert.equal(days[18]?.grossIncome, "3300");
  assert.equal(days[18]?.weekdayShortSv, "Lör");
  assert.equal(days[1]?.grossIncome, "0");
  assert.equal(maxGrossIncome(days), 56700);
  assert.equal(barHeightPercent("0", 56700), 0);
  assert.equal(barHeightPercent("3300", 56700), 6);
  assert.equal(barHeightPercent("56700", 56700), 100);
});

test("chart bars ignore tips and net income", () => {
  const days = buildMonthChartDays(2026, 9, [{ date: "2026-09-19", grossIncome: "3300" }]);
  const selected = days.find((day) => day.date === "2026-09-19");
  assert.equal(selected?.grossIncome, "3300");
  assert.notEqual(selected?.grossIncome, "3102");
  assert.notEqual(selected?.grossIncome, "150");
});

test("Uber-style week chart shows Monday to Sunday around the selected day", () => {
  const monthDays = buildMonthChartDays(2026, 9, [
    { date: "2026-09-01", grossIncome: "56700" },
    { date: "2026-09-17", grossIncome: "2200" },
    { date: "2026-09-19", grossIncome: "3300" },
  ]);
  const week = buildWeekChartDays("2026-09-19", monthDays);

  assert.equal(week.length, 7);
  assert.equal(week[0]?.date, "2026-09-14");
  assert.equal(week[0]?.weekdayShortSv, "Mån");
  assert.equal(week[6]?.date, "2026-09-20");
  assert.equal(week[6]?.weekdayShortSv, "Sön");
  assert.equal(week[5]?.date, "2026-09-19");
  assert.equal(week[5]?.grossIncome, "3300");
  assert.equal(maxGrossIncome(week), 3300);
  assert.equal(barHeightPercent("3300", 3300), 100);
  assert.ok(barHeightPercent("2200", 3300) > 60);
});

test("selected chart date stays inside the visible month", () => {
  assert.equal(
    resolveSelectedChartDate({
      year: 2026,
      month: 9,
      requestedDate: "2026-09-19",
      today: "2026-09-19",
    }),
    "2026-09-19",
  );
  assert.equal(
    resolveSelectedChartDate({
      year: 2026,
      month: 8,
      requestedDate: "2026-09-19",
      today: "2026-09-19",
    }),
    null,
  );
  assert.equal(
    resolveSelectedChartDate({
      year: 2026,
      month: 9,
      today: "2026-09-19",
    }),
    "2026-09-19",
  );
});
