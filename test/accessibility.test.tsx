import { render } from "@testing-library/react";
import axe from "axe-core";
import React from "react";
import { describe, it, expect } from "vitest";

import App from "../src/App";

type AxeResults = import("axe-core").AxeResults;

async function runAxe(node: HTMLElement) {
  return new Promise<AxeResults>((resolve, reject) => {
    axe.run(
      node,
      { rules: { "color-contrast": { enabled: true } } },
      (err, results) => {
        if (err) reject(err);
        else resolve(results);
      },
    );
  });
}

describe("App accessibility", () => {
  it("has no detectable a11y violations on initial render", async () => {
    const { container } = render(<App />);
    const { violations } = await runAxe(container);
    if (violations.length) {
      const details = violations
        .map(
          (v) =>
            `${v.id}: ${v.help} (impact: ${v.impact})\n  Nodes: ${v.nodes
              .map((n) => n.target.join(" "))
              .join(", ")}`,
        )
        .join("\n\n");
      throw new Error(`Accessibility violations detected:\n${details}`);
    }
    expect(violations.length).toBe(0);
  });
});
