<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Project architecture

- Keep route modules as page composition only; reusable UI belongs under `src/components` to prevent route-bundle coupling.
- Keep browser data hooks grouped by domain under `src/lib/data`, with shared query keys in `src/lib/query-keys.ts` to make cache invalidation predictable.
- Preserve client-side `user_id` stamping on legacy clinical tables because those columns remain required while `account_id` is supplied by the database.
- Keep authentication destination logic in `src/lib/auth-session.ts` so email, Google, and authenticated-route guards apply the same onboarding rule.
- Keep development module responses uncached in `vite.config.ts` to prevent the preview from reusing stale source modules.
- Use the shared `BrandLogo` component and semantic TeraClini tokens for every brand placement so the official asset and palette remain consistent.
- Derive package usage from linked appointments with `status = realizado`; never persist a duplicate used-session counter, so consumption has one source of truth.
- Keep the authenticated shell as the single source for responsive navigation: persistent icon-collapse on desktop and bottom navigation plus a “Mais” drawer on mobile.
- Keep pure business calculations in browser-independent modules with Vitest regression coverage so domain rules can be verified without customer data.
- Keep platform administration separate from tenant roles and therapist navigation; every cross-tenant read or write requires server-side platform-admin authorization because UI guards do not secure data.
- Store commercial billing and immutable platform audits in dedicated non-clinical tables; never expose clinical content to platform administration because business operations require data minimization.
- Enforce professional-account status in both database membership helpers and authenticated navigation; only platform-admin server functions may change account status.
- Keep help content globally readable by its declared audience, but restrict authoring to platform-admin server functions and store only non-clinical help analytics.
- Keep support conversations account-scoped and explicitly non-clinical; administrative actions may record metadata but never copy message text into audit logs.
