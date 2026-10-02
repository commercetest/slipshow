---
dimension: 4:3
---

{slide #portfolio-slide}
> # Slipshow visual portfolio
>
> This fixture exercises **layout**, `code`, themed blocks, and runtime state.
>
> {.portfolio-grid}
> > {.theorem title="A stable theorem"}
> > For every visual change, review the cause before updating its baseline.
> >
> > {.definition title="A useful definition"}
> > A screenshot is an observation as well as an assertion.
>
> {#focus-target .block title="Focus target"}
> This box should remain centred and unclipped at every viewport size.
>
> {#revealed-later .unrevealed style="background:#fff4b8; padding:20px; border-radius:10px"}
> Revealed at the next state and used as the stable drawing target.
>
> {pause reveal=revealed-later}
>
> {pause focus=focus-target}
>
> {pause unfocus}

<style>
  .portfolio-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px;
  }
</style>
