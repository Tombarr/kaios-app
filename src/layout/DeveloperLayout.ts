import { AppObject, getThumbnailUrl } from '../app-utils';

const getIcon = (app: AppObject) => (!app.thumbnail_url) ? '' :
  `<img src="${getThumbnailUrl(app)}" alt="${app.display || app.name}" draggable="false" referrerPolicy="no-referrer" loading="eager" fetchPriority="high" width="112" height="112" />`;

function getAppList(apps: AppObject[]) {
  return `<ol class="app-list">` +
    apps.map((app) =>
      `<li><a href="/apps/${app.id}.html" title="${app.display || app.name}">` +
      getIcon(app) +
      `<span>${app.display || app.name}</span>
      </a></li>`).join('') +
    `</ol>`;
}

export const DeveloperLayout = (apps: AppObject[]) => `
    <!DOCTYPE html>
    <html class="no-js" lang="en-US" prefix="og: https://ogp.me/ns#">
      <head>
        <meta charset="utf-8" />
        <title>KaiOS.app | ${apps.length} KaiOS apps by ${apps[0].developer}</title>
        <meta name="description" content="${apps.length} KaiOS apps by developer ${apps[0].developer}" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <link rel="stylesheet" href="https://cdn.simplecss.org/simple-v1.css" />
        <link rel="stylesheet" href="/site.css" />

        <link rel="apple-touch-icon" sizes="180x180" href="/img/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/img/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/img/favicon-16x16.png" />
        <link rel="manifest" href="/img/site.webmanifest" />
        <link rel="apple-touch-icon" href="/img/apple-touch-icon.png" />
        <link rel="shortcut icon" href="/img/favicon.png" type="image/x-icon" />
        <link rel="shortcut icon" href="/img/favicon.ico" type="image/x-icon" />

        <meta property="og:title" content="KaiOS.app | ${apps.length} KaiOS apps by ${apps[0].developer}" />
        <meta property="og:description" content="${apps.length} KaiOS apps by developer ${apps[0].developer}" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="en-US" />
        <meta property="og:site_name" content="KaiOS.app" />
      </head>
      <body>
        <p><a href="/" title="KaiOS.app Homepage">KaiOS.app</a></p>
        <h1>${apps.length} KaiOS apps by
          <a href="${apps[0].developer_url || '#'}" referrerPolicy="origin-when-cross-origin" rel="external noopener dns-prefetch">${apps[0].developer}</a>
        </h1>` +
        getAppList(apps) +
  `</body>
</html>`;
