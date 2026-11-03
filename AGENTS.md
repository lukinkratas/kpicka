# Project Context

@README.md

**Target audience:** Czech people -> All text visible on frontend has to be written in czech.

**Tools:** You should have playwright-cli and Chrome DevTools mcps available for app inpection.

### Český statistický úřad (ČSÚ)

- **Attribution:** name ČSÚ as the data source, without implying that ČSÚ endorses you or your use of the data. 
csu
- **Don’t distort meaning:** use the data only in ways that don’t change or alter its meaning. 
csu
- **Link the license:** if you redistribute ČSÚ data, you must state the license terms, ideally by linking directly to the terms page.
- Don’t use ČSÚ’s logo in a way that suggests an official app.
- Don't present your custom derived metrics, forecasts or recomputed indices, as ČSÚ’s figures. Label them as custom calculations based on ČSÚ data.
- Include API url in every chart in the app.

#### API docs

- https://csu.gov.cz/zakladni-informace-pro-pouziti-api-datastatu
- https://csu.gov.cz/georeporty-api
- https://data.csu.gov.cz/api/katalog/v1/sady
- swagger UI: https://data.csu.gov.cz/api/katalog/v1/swagger-ui/index.html

#### Example attribution footer

```html
<footer>
  Zdroj dat: Český statistický úřad (ČSÚ) ·{" "}
  <a href="https://csu.gov.cz/podminky_pro_vyuzivani_a_dalsi_zverejnovani_statistickych_udaju_csu">
    Podmínky užití
  </a>
  {" "}· Tato aplikace není spojena s ČSÚ.
</footer>
```

#### Charts

- Include last valid date information in every chart in the app - current timestamp in case of prototype or cron run timestamp in case of cached data.
- Include corresponding API url in every chart in the app, so the user can click and see the results in direct link.
- Follow the [Color pallete](#color-pallete).
- Split the linechart per voted period (or prime minister) and use political party color for the corresponding part of the line.

#### Color pallete

Use this color pallete: #6E6347 (RGB:110/99/71), #192C26 (RGB: 25/44/38), #52685D (RGB: 82/104/93), #A9BCAA (RGB: 169/188/170), #d19e61 (RGB: 209/158/97)
*Note: Color pallete is `Osudy Dobrého vojáka Švejka za světové války` inspired.*

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
