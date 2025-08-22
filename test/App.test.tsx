import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import App from "../src/App";

describe("App", () => {
  it("renders heading and placeholder", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /the poradas wedding videos/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /placeholder/i }),
    ).toBeInTheDocument();
  });
});
