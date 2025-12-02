import { getThumbnailUrl, SimpleApp } from '../app-utils';

const getIcon = (app: SimpleApp) =>
  (!app.thumbnail_url) ? '' : `<img src="${getThumbnailUrl(app)}" alt="${app.display}" draggable="false" referrerPolicy="no-referrer" loading="lazy" decoding="async" height="52" width="52" />`;

function getAppList(apps: SimpleApp[]) {
  return `<ol class="category-apps">` +
    apps.map((app) =>
      `<li><a href="/apps/${app.id}.html" title="${app.display || app.name}">` +
      getIcon(app) +
      `<span>${app.display || app.name}</span>` +
      `</a></li>`).join('') +
    `</ol>`;
}

export const CategoryLayout = (category: string, apps: SimpleApp[]) => `
    <!DOCTYPE html>
    <html class="no-js" lang="en-US" prefix="og: https://ogp.me/ns#">
      <head>
        <meta charset="utf-8" />
        <title>KaiOS.app ${category} Apps</title>
        <meta name="description" content="KaiOS ${category} Apps" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <link rel="apple-touch-icon" sizes="180x180" href="/img/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/img/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/img/favicon-16x16.png" />
        <link rel="manifest" href="/img/site.webmanifest" />
        <link rel="apple-touch-icon" href="/img/apple-touch-icon.png" />
        <link rel="shortcut icon" href="/img/favicon.png" type="image/x-icon" />
        <link rel="shortcut icon" href="/img/favicon.ico" type="image/x-icon" />

        <meta property="og:title" content="KaiOS.app ${category} Apps" />
        <meta property="og:description" content="KaiOS ${category} Apps" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="en-US" />
        <meta property="og:site_name" content="KaiOS.app" />

        <link rel="stylesheet" href="https://cdn.simplecss.org/simple-v1.css" />
        <link rel="stylesheet" href="/site.css" />
      </head>
      <body>
        <p><a href="/" title="KaiOS.app Homepage">KaiOS.app</a></p>
        <h1>KaiOS ${category} Apps (${apps.length})</h1>` +
        getAppList(apps) +
    `<script type="text/javascript">
      //<![CDATA[
      (function() {
        document.body.classList.remove('no-js');
        Array.from(document.images).forEach((img) => { img.onerror = () => img.parentNode.removeChild(img) });
      })();
      //]]>
    </script>
    </body>
  </html>`;
