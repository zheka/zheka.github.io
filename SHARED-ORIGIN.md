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

Rules 1, 2 and 4–6 are requirements; the size limits in rule 3 are recommendations.

1. **Name everything after the repository.** Every `localStorage` key, IndexedDB database and
   Cache Storage cache a project creates is its repository name, or starts with it and a
   hyphen: `<repo>` or `<repo>-<anything>` (e.g. `kcal`, `kcal-exp-composer`). The repository
   name is also the project's path here, so it is unique on this origin, and no other
   coordination is needed. No generic names (`settings`, `data`, `history`). Names from before
   this rule are renamed by the project (moved on first load), not left behind.
2. **Never touch what isn't yours.** No `localStorage.clear()`, `sessionStorage.clear()`, or
   deleting every database or cache. To remove all of a project's data, list the names
   (`Object.keys(localStorage)`, `indexedDB.databases()`, `caches.keys()`) and delete only those
   that are the repository name or start with `<repo>-`. (`clear()` in tests is fine: test
   browsers are isolated.)
3. **Keep `localStorage` small.** Its quota (about 5 million characters) is shared by all
   projects, and the browser enforces only that total. Required: handle a refused write
   (another project may have used the space) without losing what the project has.
   Recommended, not enforced: use `localStorage` for a project's own small, essential data and
   IndexedDB for anything that grows (photos, logs, histories, caches of fetched data); stay
   under about 1 million characters per project, and show the user when the data passes that.
4. **Scope service workers to the project's path.** Never register one at `/`. A navigation
   fallback (e.g. Workbox's `navigateFallback`) answers only within the project's scope; paths
   inside it (like `/kcal/experimental/`) are the project's own business. Caches named by
   Workbox's defaults include the scope, which satisfies rule 1.
5. **No secrets you wouldn't share with every project here.** API keys and tokens kept in the
   browser are readable by all of them; prefer keys limited to the one use, and don't load
   third-party scripts at runtime.
6. **No cookies.**
7. **Asking for persistent storage** (`navigator.storage.persist()`) is fine for any project: it
   protects all of them.
