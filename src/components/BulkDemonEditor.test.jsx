import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BulkDemonEditor } from "./BulkDemonEditor.jsx";

const demons = [{
  id: "10565740",
  placement: "#1 •",
  name: "Bloodbath",
  creator: "Riot & more",
  difficulty: "Extreme Demon",
  date: "18/03/2026",
  attempts: 20226,
  status: "COMPLETED",
  device: "PC",
  twoPlayerMode: "standard",
  progressPercent: 0
}];

describe("BulkDemonEditor", () => {
  it("supports device edits with undo, redo and one bulk save", async () => {
    const onSave = vi.fn().mockResolvedValue({ success: true });
    render(<BulkDemonEditor demons={demons} saving={false} onSave={onSave} onClose={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: /Bloodbath/ }));
    const device = screen.getByLabelText("Device");
    fireEvent.change(device, { target: { value: "Laptop" } });
    expect(screen.getByText("1 changed")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Undo/ }));
    expect(device).toHaveValue("PC");
    expect(screen.getByText("0 changed")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Redo/ }));
    expect(device).toHaveValue("Laptop");

    fireEvent.click(screen.getByRole("button", { name: /Save all changes/ }));
    expect(onSave).toHaveBeenCalledWith([{ levelId: "10565740", device: "Laptop" }]);
  });
});
