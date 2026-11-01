# Project Context

@README.md

**Target audience:** Czech people -> All text visible on frontend has to be written in czech.

**Infrastructure as code:** Infrastructure is defined in `infra/` director and is managed by terraform

**MCPs:** You should have Playwright and Chrome DevTools mcps available in order to check your own work.

### Český statistický úřad (ČSÚ)

- **Attribution:** name ČSÚ as the data source, without implying that ČSÚ endorses you or your use of the data. 
csu
- **Don’t distort meaning:** use the data only in ways that don’t change or alter its meaning. 
csu
- **Link the license:** if you redistribute ČSÚ data, you must state the license terms, ideally by linking directly to the terms page.
- Don’t use ČSÚ’s logo in a way that suggests an official app.
- Don't present your custom derived metrics, forecasts or recomputed indices, as ČSÚ’s figures. Label them as custom calculations based on ČSÚ data.
- Include API url in every chart in the app.

#### Target architecture

- Cache the data in our infra rather than proxying every user request to the ČSÚ API. This protects from outages and keeps a polite API consumer.
- Prototype will be done with proxy API calls.

 ┌──────────┐  cron/daily   ┌─────────────┐      ┌──────────┐
 │ ČSÚ API  │ ───────────▶  │ ETL (Python)│ ───▶ │ DB /     │
 │ DataStat │ CSV/JSON-STAT └─────────────┘      │ S3 cache │
 └──────────┘                                    └─────┬────┘
                                                       │
                                              ┌────────▼──────────┐
                                              │ Dashboard (React) │
                                              │ footer: "Zdroj:   │
                                              │ ČSÚ" + link       │
                                              └───────────────────┘

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

### Charts

- Include last valid date information in every chart in the app - current timestamp in case of prototype or cron run timestamp in case of cached data.
- Include corresponding API url in every chart in the app, so the user can click and see the results in direct link.
- Include picture of prime ministers above the chart with dashed vertical line marking the periods they were voted in.
- For the images of prime miniters, use images on cs.wikipedia.org.
   - For example `Andrej Babis`: use image `https://cs.wikipedia.org/wiki/Andrej_Babi%C5%A1#/media/Soubor:Andrej_Babi%C5%A1_2025_(cropped).jpg` stored on `https://cs.wikipedia.org/wiki/Andrej_Babi%C5%A1`.
   - For example `Petr Fiala`: use `https://upload.wikimedia.org/wikipedia/commons/0/05/Czechia_PM_Petr_Fiala_2025_portrait.jpg` stored on `https://cs.wikipedia.org/wiki/Petr_Fiala`. If there are no pictures
   - etc.
   - Use only main images from CZ wikipedia.
   - You can extend this list of images in this file with other prime ministers.
   - If you do not find the prime minister in CZ wikipedia, report to the prompter and do nothing.
- Follow the [Color pallete](#color-pallete).

                    (BS)
      (PN)      (JR) :              (AB)            (PF)            (AB)
 19 % |            : :               :               :               :
      |            : :               :               : **            :
      |            : :               :               : **  ◄ 18,0 %  :
      |            : :               :               : ***  (9/2022) :
      |            : :               :               : * *           :
 14 % |            : :               :               :** **          :
      |            : :               :               :*   *          :
      |            : :               :               :*   *          :
      |            : :               :               :*   *          :
      |            : :               :               **   **         :
  9 % |            : :               :               *     *         :
      |            : :               :               *     **        :
      |            : :               :               *      *        :
      |            : :               :              **      *        :
      |            : :               :              *:      **       :
  4 % |      **    : :               :       **    **:       *       :
      |     *****  : :               :  ************ :       * ***** :
      |******   **** :░░░░░░░░░░*********        **  :       ***   *****
      |            ***░░░░░░░░░**    :               :               : *
      |            : ***********░░░░░:               :               :
 -1 % |            : :               :               :               :
      +-----------------------------------------------------------------
         '   '   '   '   '   '   '   '   '   '   '   '   '   '   '   '
        11  12  13  14  15  16  17  18  19  20  21  22  23  24  25  26

### Color pallete

Use this color pallete:

| R/G/B | Hex |
| --- | --- |
| 110/99/71 | #6E6347 |
| 25/44/38 | #192C26 |
| 82/104/93 | #52685D |
| 169/188/170 | #A9BCAA |

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
