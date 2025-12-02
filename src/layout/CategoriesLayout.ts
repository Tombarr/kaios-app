import { CategoryPair, Device, getThumbnailUrl, SimpleApp } from '../app-utils';
import { getCategoryName } from '../gen-utils';

function getCategoryList(categories: CategoryPair[]) {
  return `<ol class="category-list">` +
    categories.map(({ category, total }) => `<li>
        <h3>
          <a href="/categories/${getCategoryName(category)}.html" title="${category}">${category} (${total})</a>
        </h3>
      </li>`).join('') +
    `</ol>`;
}

const getIcon = (app: SimpleApp) => (!app.thumbnail_url) ? '' :
  `<img src="${getThumbnailUrl(app)}" alt="${app.display || app.name}" draggable="false" referrerPolicy="no-referrer" loading="eager" fetchPriority="high" width="112" height="112" />`;

function getRecommendedAppList(recommendedApps: SimpleApp[]) {
  return `<ol class="app-list">` +
    recommendedApps.map((app) =>
      `<li><a href="/apps/${app.id}.html" title="${app.display || app.name}">` +
      getIcon(app) +
      `<span>${app.display || app.name}</span>
      </a></li>`).join('') +
    `</ol>`;
}

function getLastUpdated() {
  return (new Date()).toISOString().split('T')[0];
}

function getDeviceList(devices?: Device[]) {
  if (!devices || devices.length === 0) return '';

  return `<h3>KaiOS Devices (${devices.length})</h3>
  <ul class="device-list">` +
    devices.map(({ name, src }) =>
      `<li>
      <img src="/devices/${src}" alt="${name}" draggable="false" loading="lazy" fetchPriority="high" width="64" height="64" />
      <span>${name}</span>
      </li>`).join('') +
    `</ul>`;
}

export const CategoriesLayout = (categories: CategoryPair[], recommendedApps: SimpleApp[], recentApps: SimpleApp[], appCount: number, devices?: Device[]) => `
    <!DOCTYPE html>
    <html class="no-js" lang="en-US" prefix="og: https://ogp.me/ns#">
      <head>
        <meta charset="utf-8" />
        <title>KaiOS.app Categories</title>
        <meta name="description" content="KaiOS App Categories" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <link rel="stylesheet" href="https://cdn.simplecss.org/simple-v1.css" />
        <link rel="stylesheet" href="/site.css" />

        <script type="text/javascript" src="/search.js"></script>

        <link rel="apple-touch-icon" sizes="180x180" href="/img/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/img/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/img/favicon-16x16.png" />
        <link rel="manifest" href="/img/site.webmanifest" />
        <link rel="apple-touch-icon" href="/img/apple-touch-icon.png" />
        <link rel="shortcut icon" href="/img/favicon.png" type="image/x-icon" />
        <link rel="shortcut icon" href="/img/favicon.ico" type="image/x-icon" />

        <meta property="og:title" content="KaiOS.app Categories" />
        <meta property="og:description" content="KaiOS App Categories" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="en-US" />
        <meta property="og:site_name" content="KaiOS.app" />
      </head>
      <body>
        <h1>KaiOS Apps</h1>
        <h2>Search, discover, and download ${appCount}+ KaiOS apps on the KaiStore (Global) and JioStore (India)</h2>
        <section class="search-container">
          <label for="search">Search</label>
          <input type="search" name="search" id="search" placeholder="Search KaiOS apps" />
          <output for="search" id="suggestions" class="no-results">
            <ol></ol>
          </output>
        </section>

        <h3>Categories (${categories.length})</h3>` +
        getCategoryList(categories) +
        `<h3>Recommended Apps (${recommendedApps.length})</h3>` +
        getRecommendedAppList(recommendedApps) +
        `<h3>Recently Updated Apps (${recentApps.length})</h3>` +
        getRecommendedAppList(recentApps) +
        getDeviceList(devices) +
    `<p class="center">By <a href="https://barrasso.me" referrerPolicy="origin-when-cross-origin" rel="external noopener dns-prefetch">Tom Barrasso</a>, developer of <a href="https://podlp.com" referrerPolicy="origin-when-cross-origin" rel="external noopener dns-prefetch">PodLP</a> and author of <a href="https://kaios.dev" title="KaiOS.dev Developer Blog" referrerPolicy="origin-when-cross-origin" rel="external noopener dns-prefetch">KaiOS.dev</a>.<br /><span class="last-updated">Last updated <time>${getLastUpdated()}</time></span>.</p>
    </div>
  </body>
</html>`;
