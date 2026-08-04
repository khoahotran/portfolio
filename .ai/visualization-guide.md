# Visualization Guide

Staff-level engineering requires clear communication of complex architectures. This portfolio heavily relies on visualizations to replace walls of text. 

## 1. Core Rule: Visuals First
**Always ask:** *Can this idea be communicated more effectively with a diagram, table, timeline, or visual element instead of plain text?*
If the answer is yes, build a visualization.

## 2. Mermaid Diagram Standards
We use Mermaid.js embedded in Markdown files for maintainable, version-controlled architecture diagrams.

### When to use what:
- **`flowchart`:** Use for high-level system context and data flow (C4 Level 1/Level 2).
- **`sequenceDiagram`:** Use for API interactions, Saga patterns, or OAuth flows.
- **`stateDiagram`:** Use for representing aggregate states or job queues (e.g., Waiting -> Active -> Completed).
- **`erDiagram`:** Use for database schemas (rarely needed, but useful for EventStore design).

### Mermaid Syntax Rules
- **Themes:** The React app handles theming (Neutral/Clean). Do not embed complex color themes directly in the markdown unless explicitly highlighting a specific node (e.g., marking a node red for failure).
- **Spacing:** Avoid spaces in Node IDs (use `subgraph My_Subgraph [My Subgraph]` instead of `subgraph My Subgraph`).
- **Complexity:** Do not make the diagram too large; break it down into smaller, focused diagrams if necessary.

## 3. Interactive React Laboratories (`/experiments`)
When a simple diagram is insufficient—especially when demonstrating performance, scale, or algorithms over time—we build Interactive Labs in React (`src/pages/experiments/`).

### When to build a Lab:
- **Benchmarking:** Comparing the throughput of two tools (e.g., Redis vs BullMQ).
- **Simulations:** Demonstrating retry strategies with jitter, or token bucket rate limiters.
- **State Visualizers:** Allowing the user to click through a Saga state machine.

### Lab Implementation Rules:
- **No external heavy charting libs:** Use `lucide-react` for icons and native SVG + CSS for visualizations (bar charts, line graphs, animated nodes).
- **Stateful:** Use React `useState` to let the user change parameters (e.g., Number of Workers, Payload Size) and watch the visualization react.
- **Integration:** Always create an accompanying `.md` file in `content/experiments/` that includes an `<a href="/experiments/my-lab">` button, so the lab shows up in the content lists and search index.
