
# Team Contract: shared functions

Every team must use these exact names. Changing a name, input, or output
needs P2 and P1 approval and an update to this file first.

| Function | Owner | Inputs | Returns | Reviewed by |
|---|---|---|---|---|
| `createCat(container)` | C1 | the HTML element to draw the cat in | a cat object with `say(text)`, `idle()`, `spell(ok)` | C1 ☐ |
| `createBox(container)` | C3 | the HTML element to draw the box in | a box object with `setState(name)` (`"new"`, `"repo"`, ...) | C3 ☐ |
| `createCommandBox(container, onSubmit)` | C3 | the HTML element, and a function called with the typed command | nothing | C3 ☐ |
| `checkCommand(typed, lesson)` | C3 | the typed text, and the current lesson from `lessons.json` | `{ ok: true/false, message: "..." }` | C3 ☐ |
| `createScenes(container)` | S2 | the HTML element for the scenes | a scenes object with `goTo(name)` | S2 ☐ |

## Rules
- Each function lives in its team's folder (`cat/`, `box/`, `scenes/`).
- Text shown to learners comes from `data/lessons.json`, never written in the code.
- Questions about a function go to its owner. Changes go through P2.
