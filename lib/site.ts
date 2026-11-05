/**
 * The origin crawlers, canonicals and the sitemap must agree on. Hardcoded on
 * purpose: Vercel reports its own project domains, and after the devtoys ->
 * tools move a generated value could still name the retired one. Change it
 * together with the Vercel domain.
 */
export const SITE_ORIGIN = "https://tools.wwr.icu";
