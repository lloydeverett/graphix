# Base Styles

Classless stylesheets the Preview can be rendered with, as listed on
[cssbed.com](https://www.cssbed.com/). They're copied here, unchanged except
where noted (and without `@charset` rules), so the built site never fetches
them from elsewhere. Each file starts with its license, in a `/*!` comment
that survives minification.

| File | Version | Source | License |
| --- | --- | --- | --- |
| `awsm.css` | 3.0.7 | [npm: awsm.css](https://www.npmjs.com/package/awsm.css) | MIT |
| `bahunya.css` | 0.1.3 | [Kimeiga/bahunya](https://github.com/Kimeiga/bahunya) | MIT |
| `bamboo.css` | 1.4.0 | [npm: bamboo.css](https://www.npmjs.com/package/bamboo.css) | MIT |
| `bootstrap.css` | 5.3.8 | [npm: bootstrap](https://www.npmjs.com/package/bootstrap) | MIT |
| `holiday.css` | 0.11.6 | [npm: holiday.css](https://www.npmjs.com/package/holiday.css) | MIT |
| `marx.css` | 5.3.2 | [npm: marx-css](https://www.npmjs.com/package/marx-css) | MIT |
| `meyer.css` | 5.0.2 | [npm: reset-css](https://www.npmjs.com/package/reset-css) (Eric Meyer's reset) | Unlicense |
| `minicss.css` | 3.0.1 | [npm: mini.css](https://www.npmjs.com/package/mini.css) | MIT |
| `mvp.css` | 1.18.0 | [npm: mvp.css](https://www.npmjs.com/package/mvp.css) | MIT |
| `no-class.css` | master | [davidpaulsson/no-class](https://github.com/davidpaulsson/no-class) | MIT |
| `pico.css` | 2.1.1 | [npm: @picocss/pico](https://www.npmjs.com/package/@picocss/pico) (classless build) | MIT |
| `sakura.css`, `sakura-vader.css` | 1.5.1 | [npm: sakura.css](https://www.npmjs.com/package/sakura.css) | MIT |
| `simple.css` | 2.3.7 | [npm: simpledotcss](https://www.npmjs.com/package/simpledotcss) | MIT |
| `tacit.css` | 1.9.7 | [npm: tacit-css](https://www.npmjs.com/package/tacit-css) | MIT |
| `thebestmotherfucking.css` | as on cssbed.com | [denysvitali/thebestmotherfuckingwebsite](https://github.com/denysvitali/thebestmotherfuckingwebsite) | WTFPL or MIT |
| `tufte.css`, `et-book/` | 1.9.0 | [npm: tufte-css](https://www.npmjs.com/package/tufte-css), fonts from [edwardtufte/et-book](https://github.com/edwardtufte/et-book) | MIT; only the woff fonts are kept |
| `water.css-dark.css`, `water.css-light.css` | 2.1.1 | [npm: water.css](https://www.npmjs.com/package/water.css) | MIT |
| `writ.css` | 1.0.4 | [programble/writ](https://github.com/programble/writ) | ISC |
| `yorha.css` | 1.2.0 | [npm: yorha](https://www.npmjs.com/package/yorha) | MIT |

Left out, though cssbed.com lists them:

- **kacit**: its repository has no license.
- **stylize.css**, **vanillacss**: their sources are gone, and with them any
  license.
- **w3c-chocolate**, **w3c-traditional**: W3C copyright, and the files ask to be
  linked to rather than copied.
- **evenbettermotherfucking**: GPL-3.0.

To add one, copy it here with its license at the top, add its stylesheet to
`BASE_STYLE_SHEETS` in `src/base-style-sheets.ts`, and list it in
`src/base-style.ts`. It mustn't load
anything from another origin: no `@import` or `url()` pointing off-site.
