import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FeedbackButton } from "./FeedbackButton";

describe("FeedbackButton (UI)", () => {
  it("модалка закрыта до клика по кнопке", () => {
    render(<FeedbackButton />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("клик по «?» открывает модалку со всеми полями", () => {
    render(<FeedbackButton />);
    fireEvent.click(screen.getByTitle(/Сообщить о баге/));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Кратко суть")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Что произошло/),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument(); // тип
  });

  it("submit заблокирован при пустых полях и коротком вводе", () => {
    render(<FeedbackButton />);
    fireEvent.click(screen.getByTitle(/Сообщить о баге/));
    const submit = screen.getByRole("button", { name: "Отправить" });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("Кратко суть"), {
      target: { value: "ab" }, // < минимума
    });
    fireEvent.change(screen.getByPlaceholderText(/Что произошло/), {
      target: { value: "коротко" }, // < минимума
    });
    expect(submit).toBeDisabled();
  });

  it("submit активен при валидных заголовке и описании", () => {
    render(<FeedbackButton />);
    fireEvent.click(screen.getByTitle(/Сообщить о баге/));
    fireEvent.change(screen.getByPlaceholderText("Кратко суть"), {
      target: { value: "Нормальный заголовок" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Что произошло/), {
      target: { value: "Достаточно длинное описание проблемы." },
    });
    expect(screen.getByRole("button", { name: "Отправить" })).toBeEnabled();
  });

  it("Esc закрывает модалку", () => {
    render(<FeedbackButton />);
    fireEvent.click(screen.getByTitle(/Сообщить о баге/));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
