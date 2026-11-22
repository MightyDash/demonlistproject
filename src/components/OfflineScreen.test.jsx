import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OfflineScreen } from "./OfflineScreen.jsx";

describe("OfflineScreen", () => {
  it("offers reconnect and cached-data actions", () => {
    const onReconnect = vi.fn();
    const onContinue = vi.fn();

    render(
      <OfflineScreen
        message="No live connection."
        hasCachedData
        onReconnect={onReconnect}
        onContinue={onContinue}
      />
    );

    expect(screen.getByText("No live connection.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reconnect" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue with saved data" }));
    expect(onReconnect).toHaveBeenCalledOnce();
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it("locks actions while reconnecting", () => {
    render(<OfflineScreen reconnecting hasCachedData />);
    expect(screen.getByRole("button", { name: "Reconnecting…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Continue with saved data" })).toBeDisabled();
  });
});
