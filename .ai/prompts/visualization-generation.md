# Visualization Generation Prompt Template

**Goal:** Replace a wall of text with a Mermaid diagram.

**Required Inputs:**
- The target Markdown file.
- The concept that needs visualization.

**Workflow:**
1. Read `.ai/visualization-guide.md` to select the correct chart type (`flowchart`, `sequenceDiagram`, `stateDiagram`).
2. Generate the Mermaid diagram syntax. **CRITICAL:** Do not use spaces in node IDs unless wrapped in brackets.
3. Replace the text block in the Markdown file with the diagram.
4. Test the diagram rendering in the browser.

**Acceptance Criteria:**
- Passes Visualization Quality Gate (`.ai/quality-gates.md`).
- Diagram successfully renders in the UI without syntax errors.

**Expected Output:**
Updated Markdown file with embedded Mermaid code block.
