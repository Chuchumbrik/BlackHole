import { describe, it, expect } from "vitest";
import {
  JOURNAL_CATEGORY_COLOR,
  JOURNAL_CATEGORY_LABEL,
  loreIntro,
  loreOnAchievement,
  loreOnLifeBorn,
  loreOnPrestige,
  loreOnRocheTear,
  loreOnSupernova,
} from "./journal";

describe("journal: процедурные строки", () => {
  it("все билдеры дают непустой текст и валидную категорию", () => {
    const lines = [
      loreIntro(),
      loreOnPrestige(3),
      loreOnRocheTear("Кербин"),
      loreOnSupernova(),
      loreOnLifeBorn("Гайя"),
      loreOnAchievement("Первая масса"),
    ];
    for (const l of lines) {
      expect(l.text.length).toBeGreaterThan(0);
      expect(JOURNAL_CATEGORY_COLOR[l.category]).toBeTruthy();
      expect(JOURNAL_CATEGORY_LABEL[l.category]).toBeTruthy();
    }
  });
  it("подставляет имя планеты/номер сжатия в текст", () => {
    expect(loreOnRocheTear("Тифон").text).toContain("Тифон");
    expect(loreOnPrestige(7).text).toContain("7");
    expect(loreOnAchievement("Карлик").text).toContain("Карлик");
  });
  it("категории риска/вехи/открытия на своих местах", () => {
    expect(loreOnRocheTear("X").category).toBe("risk");
    expect(loreOnPrestige(1).category).toBe("milestone");
    expect(loreOnSupernova().category).toBe("discovery");
  });
});
