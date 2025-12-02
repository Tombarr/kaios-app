# KaiOS.app

Static site generator taking a SQLite `.db` as input. Hosted on Cloudflare pages at KaiOS.app.

- `layout/` contains HTML layouts inside TypeScript strings. A proper template language would be better.
- `gen/` is the directory that minified, generated HTML pages are written to
- `search.js` includes the code to use [Fuse.js](https://www.fusejs.io/) for client-side search
