/**
 * The site-standard section divider: a single full-bleed hairline used to
 * separate stacked top-level components on a page. Rendered full viewport width
 * (it sits outside the centered content column), 1px, in the theme's --line
 * tone. Purely presentational. Use this between any two stacked sections so the
 * seam reads consistently everywhere; sections that already carry their own
 * border-top hairline (e.g. the CTA, the footer) don't need one in front.
 */
export default function Divider() {
  return <div className="section-divider" aria-hidden="true" />;
}
