# [KaiOS.app](https://kaios.app)

[KaiOS.app](https://kaios.app) is a static directory website listing KaiOS apps available on both the KaiStore and JioStore.

- `data/` contains NodeJS code to make HTTP requests to gather app data and generate a SQLite database.
- `src/` contains TypeScript code to use the SQLite database and generate a static website (HTML, CSS, JS, etc) from it

Once the website is generated, it's uploaded to Cloudflare Pages and made available at [KaiOS.app](https://kaios.app).
