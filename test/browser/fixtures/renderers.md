---
dimension: 4:3
---

{slide}
> # Embedded renderer portfolio
>
> {.renderer-grid}
> > ## Mathematics
> >
> > $$\sum_{k=1}^{n} k = \frac{n(n+1)}{2}$$
> >
> > ## Highlighted OCaml
> >
> > ```ocaml
> > let square x = x * x
> > ```
>
> > ## Mermaid
> >
> > ``` =mermaid
> > graph LR;
> >   Source-->Compiler;
> >   Compiler-->Browser;
> > ```

<style>
  .renderer-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 50px;
  }
</style>
