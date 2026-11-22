# One origin, many projects

Every project page under `https://zheka.github.io/` (`/<repo>/`) is the **same origin** for the
browser: scheme + host + port, the path doesn't count. So all of them share, on each device:

- **`localStorage` and `sessionStorage`**: one key space, and one quota of about 5 million
  characters for all projects together. Any project can read, overwrite or delete any key.
- **IndexedDB**: one namespace of database names, and one overall storage quota.
- **Cache Storage** (`caches`): one namespace of cache names.
- **Cookies**: path attributes don't separate projects in any way that can be relied on.
- **Eviction**: when the browser frees space it clears the whole origin, every project at once;
  `navigator.storage.persist()`, when granted, protects the whole origin.
- **Trust**: a script from any project (or from a CDN one of them loads) runs with full access
  to all the others' data.

Service workers are the exception: each is limited to its own scope (`/<repo>/`).

Moving a project to an origin of its own (a custom subdomain, or a `*.github.io` of its own) is
the real fix; until then, every project hosted here follows these rules.

## Rules

Every project hosted here must follow the required rules. The recommended ones are good
practice; nothing checks them.

### Required

1. **Name everything after the repository.** Every `localStorage` or `sessionStorage` key,
   IndexedDB database and Cache Storage cache a project creates is named `<repo>` or
   `<repo>-<anything>` (e.g. `kcal`, `kcal-exp-composer`). The repository name is also the
   project's path here, so it is already unique on this origin. Generic names (`settings`,
   `data`, `history`) are not allowed. If a project has data under older names, it moves that
   data to the new name on first load and deletes the old key.
2. **Delete only your own data.** Don't call `localStorage.clear()` or `sessionStorage.clear()`,
   and don't delete every database or cache. To remove all of a project's data, list the names
   (`Object.keys(localStorage)`, `indexedDB.databases()`, `caches.keys()`) and delete only the
   ones that are `<repo>` or start with `<repo>-`. (Tests may use `clear()`: test browsers are
   isolated.)
3. **Survive a refused `localStorage` write.** The quota is shared, so a write can fail because
   another project used up the space. When that happens, the project must not lose or corrupt
   the data it already has.
4. **Scope service workers to `/<repo>/`.** Never register one at `/`. A navigation fallback
   (e.g. Workbox's `navigateFallback`) must answer only within that scope. How the project
   handles paths under its own scope (like `/kcal/experimental/`) is up to the project.
   Workbox's default cache names include the scope, so they satisfy rule 1.
5. **No secrets in the browser that every other project here shouldn't see.** Any project can
   read API keys and tokens stored here.
6. **No cookies.**

### Recommended

- **Keep `localStorage` small.** Use it for small, essential data and use IndexedDB for anything
  that grows (photos, logs, histories, caches of fetched data). Stay under about 1 million
  characters per project, and tell the user when the data goes past that.
- **Limit what a leaked key can do.** Prefer API keys restricted to their one use.
- **Don't load third-party scripts at runtime.** They run with access to every project's data.

### Allowed

- **`navigator.storage.persist()`**: any project may ask for persistent storage. When granted,
  it protects every project on the origin.
