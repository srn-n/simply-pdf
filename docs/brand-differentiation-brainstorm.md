# Making Simply PDF feel unmistakably its own

**Design brainstorm · 10 November 2026**

## Executive summary

Simply PDF already has a distinct foundation: paper-inspired themes, the Simply Made Studio mark, tactile motion, and a privacy promise that can be verified in the app. The parts that risk reading as iLovePDF are mostly the *category conventions*: a home screen dominated by a long, grouped catalogue of PDF actions, each with a colored icon tile and a short utility label, plus direct positioning as “a simpler take on iLovePDF.”

The opportunity is to make the app feel less like a collection of PDF utilities and more like **a calm, private workbench for documents**. Let the document and the user's next step lead. Keep the 13 tools easy to find, but give the home screen a stronger point of view and make the visual language specific to Simply PDF.

## What currently feels category-standard

These are not flaws in isolation; they are familiar patterns that, together, make the app easy to compare with established PDF suites:

- The home screen's primary content is a long list of tool names grouped into sections.
- Each row repeats the same colored square icon, bold action name, short description, and arrow.
- Tools are presented as peers, rather than organized around a user's document or goal.
- The README explicitly calls the app “a simpler, private take on iLovePDF,” which gives reviewers the competitor as their first mental model.
- The visual polish is strong, but the broader stationery/glass language is not yet consistently tied to a unique product interaction or story.

## Strategic direction: the private document workbench

A useful positioning thought—not proposed final marketing copy—is: **“Your PDFs, on your phone, under your control.”** The experience should feel like opening a personal work surface, choosing a document, and doing a focused job. Privacy is not a badge beside the tools; it is the reason the workbench exists.

### 1. Lead with documents and intent

Explore a home hierarchy that starts with a clear greeting or compact “Your documents” area, then offers a few task-oriented entry points such as **Combine files**, **Make a PDF**, and **Clean up a PDF**. Keep a separate “All tools” index below. This changes the first impression from “PDF tool directory” to “place where I get a document job done.”

If recent activity is empty or disabled, use a quiet first-run empty state that explains local processing and offers one obvious action: choose a file. Avoid manufacturing sample documents or implying cloud storage.

### 2. Make the paper metaphor functional

Treat a selected PDF as a physical object with visible pages, page edges, annotations, and a clear relationship between input and output. Let the existing real page previews carry more of the visual identity. Use paper stacking for merge, page shuffling for organize, a crop/selection metaphor for split, and a stamped finished sheet for completion. Keep these metaphors subtle and useful; never obscure file names, page counts, or status.

### 3. Create one signature interaction

Choose one interaction that users will associate with Simply PDF, rather than adding motion everywhere. Candidates:

- **The work mat:** a single document sheet settles onto a lightly ruled surface when opened; relevant actions appear around it.
- **The page stack:** selected files become a physical stack that can be reordered before merging.
- **The proof mark:** after a successful operation, a small, restrained “Done” mark lands on the output summary and the app shows the actual saved location.

The page stack is the strongest fit because it expresses the document-first idea and can make Merge and Organize feel especially ownable. Test it on low-end devices and with reduced motion before making it a global motif.

### 4. Give the tool index a different silhouette

The current icon rows are efficient, but highly familiar. Possible explorations:

- Replace colored icon tiles with compact monochrome line marks, reserving color for selection and state.
- Use a typographic index with numbered or named sections and more whitespace, like a well-organized manual.
- Add a short task phrase above the tool name (“Put files together” / “Merge PDF”) so the user sees intent first.
- Show the three most-used or most approachable actions as large, document-shaped prompts, then make the complete catalogue a denser searchable list.

Do not make every tool a separate floating card. A distinctive silhouette and sharper hierarchy matter more than adding more decoration.

### 5. Turn privacy into visible proof

The four promises are unusually concrete. Give them a compact, consistent home in the experience:

- A small **“On this device”** indicator near file selection and processing.
- A simple processing status that says what is happening, without suggesting upload or remote conversion.
- A result view that names the output and confirms where it was saved or how it can be shared.
- A privacy explainer that points to the actual Android permission model and local-only behavior.

Keep claims precise. The app has no INTERNET permission and processes files locally; avoid vague security language such as “military-grade” or implying that local files are encrypted unless that is actually implemented.

### 6. Make the brand voice less generic

Keep labels direct and reassuring, with occasional studio personality in moments of completion—not in every control. Replace competitor-based positioning in README/store copy with a positive description of Simply PDF itself. A few directions to explore:

- “A small, private PDF workbench.”
- “PDF jobs, handled on your phone.”
- “Open a file. Make the change. Keep the file.”

These are prompts for further writing, not approved slogans. Keep feature descriptions factual and avoid claims that imply parity with every large PDF suite.

## Visual experiments worth prototyping

| Experiment | What changes | What it tests |
|---|---|---|
| Document-first home | Recent or chosen documents lead; task shortcuts follow; full tools move below | Does the app feel like a workspace rather than a catalogue? |
| Monochrome tool index | Remove the persistent rainbow of tool tiles; use accent color for state | Does the home screen become more ownable and calmer? |
| Paper object actions | Show a document preview with contextual actions attached to its edges or footer | Does the stationery metaphor improve orientation? |
| Merge stack | Treat selected PDFs as a reorderable stack with page counts | Can a signature interaction make a common action memorable? |
| Privacy proof point | Add a small local-processing cue at the moment files are selected and handled | Does privacy feel credible without adding clutter? |

Prototype two alternatives for the home screen before committing: **A. document-first workbench** and **B. editorial tool index**. Evaluate both in the existing six themes, especially Carbon and Legal, since a treatment that only works in Paper is not a complete direction.

## Keep, reduce, reconsider

**Keep:** the six named themes, studio mark, document previews, accurate before/after details, local-only operation, the four promises, and responsive motion settings.

**Reduce:** repeated bright tool tiles, decorative glass surfaces that do not clarify hierarchy, and the long list's dominance on first open.

**Reconsider:** competitor comparisons in top-level copy; whether the five-second launch sequence is helping a returning utility user; and whether the same visual treatment is applied to every tool even when the underlying jobs differ.

## Guardrails

- Do not change the current look until a direction is selected; the repo's design rules explicitly ask to propose first.
- Keep every action honest and every file operation local. Do not imply cloud sync, storage, or upload.
- Preserve accessibility, readable contrast, large touch targets, and Still/reduced-motion behavior.
- Check the design at phone size and across all six themes.
- Avoid generic gradients, decorative glass on flat backgrounds, and motion without feedback value.
- The goal is a distinct identity, not novelty for its own sake. Familiar PDF actions can stay familiar; the experience around them should feel like Simply PDF.

## Suggested next step

Create a small visual prototype of the two home-screen directions, using the current design tokens and components where possible. Compare their first-open hierarchy, empty state, and one real workflow (Merge is a good candidate). Then choose a direction before editing the production UI.
