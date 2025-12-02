import { AppObject, getDomain, getLocale, getLocalized, getThumbnailUrl, Locale, SimpleApp } from '../app-utils';
import { byteSize, getCategoryName, getDeveloperUrlPath, quoteattr } from '../gen-utils';
import { minify } from 'uglify-js';

function getDeveloperFragment(developer?: string, developer_url?: string) {
  if (!developer) return '';
  return `<p>
    <span>Developer:</span>
    <a href="/developers/${getDeveloperUrlPath(developer)}.html" title="${developer}">${developer}</a> ` +
    ((!developer_url) ? '' : `(<a href="${developer_url}" title="${developer}" referrerPolicy="origin-when-cross-origin" rel="external noopener dns-prefetch">${developer_url}</a>)`) +
  `</p>`;
}

const getKaiStoreLink = (bundle_id: string) => `https://www.kaiostech.com/store/apps/?bundle_id=${bundle_id}&utm_source=kaios.app&utm_medium=app-page`;

const getKaiStoreButton = (app: AppObject) => (!(app.manifest_url || app.v3_manifest_url) || !app.bundle_id) ? '' :
  `<a href="${getKaiStoreLink(app.bundle_id)}" title="Download ${app.display || app.name} on the KaiStore" referrerPolicy="origin-when-cross-origin" rel="external noopener dns-prefetch">
    <img src="/img/KaiStore-Badge-SM.png" class="store-badge kai-badge" alt="Open in KaiStore" decoding="async" loading="lazy" draggable="false" />
  </a>`

const getJioStoreButton = (app: AppObject) => (!app.jio_manifest_url) ? '' :
  `<img src="/img/JioStore-Badge.png" title="Download ${app.display || app.name} on the JioStore" class="store-badge jio-badge" alt="Open in JioStore" decoding="async" loading="lazy" draggable="false" />`;

function getScreenshotsFragment(app: AppObject) {
  if (!app.screenshots || app.screenshots.length === 0) return '';
  return `<section class="screenshots carousel"><div class="slides">` +
    app.screenshots.map((src, i) =>
      `<img src="${src}" id="screenshot-${i + 1}" alt="${app.name} screenshot" decoding="async" loading="lazy" fetchPriority="low" referrerPolicy="no-referrer" draggable="false" width="240" height="320" />`).join('') +
      `</div><div class="carousel__nav">` +
    app.screenshots.map((_, i) =>
      `<a class="slider-nav" href="#screenshot-${i + 1}" aria-label="Go to Screenshot ${i + 1}">${i + 1}</a>`).join('') +
    `</div></section>`;
}

const getSummary = (app: AppObject) => (!(app.summary || getLocalized(app, 'subtitle'))) ? '' :
`<h3 data-locale="subtitle">${getLocalized(app, 'subtitle') || app.summary}</h3>`;

const getIcon = (app: AppObject, size = 112) => (!app.thumbnail_url) ? '' :
  `<img src="${getThumbnailUrl(app)}" alt="${app.display || getLocalized(app, 'name')}" draggable="false" referrerPolicy="no-referrer" loading="eager" fetchPriority="high" width="${size}" height="${size}" />`;

const getSimpleIcon = (app: SimpleApp, size = 52) => (!app.thumbnail_url) ? '' :
  `<img src="${getThumbnailUrl(app)}" alt="${app.display || app.name}" draggable="false" referrerPolicy="no-referrer" loading="lazy" fetchPriority="low" width="${size}" height="${size}" />`;

const getDateFragment = (release_date: number, locale: string = 'en-US') =>
  `<time datetime="${(new Date(release_date)).toISOString()}">${(new Date(release_date)).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })}</time>`;

const isValidSize = (size?: number) => !(Number.isNaN(size) || size === undefined || size === null || size <= 0);
const getSizeFragment = (size?: number) => {
  if (Number.isNaN(size) || size === undefined || size === null || size <= 0) return '';
  return `<span>${byteSize(size)}</span>`;
}

const getPrefetch = (app: AppObject) => (!app.thumbnail_url) ? '' :
  `<link rel="preconnect" href="${getDomain(app.thumbnail_url)}" crossorigin />
  <link rel="dns-prefetch" href="${getDomain(app.thumbnail_url)}" />`;

/* Return a JavaScript block to trigger the KaiStore/ JioStore activity on KaiOS */
const getInstallScriptBlock = (app: AppObject) => {
  return `
    function launchActivity(name, data) {
      if ('MozActivity' in window) {
        // KaiOS 2.5
        return new Promise((resolve, reject) => {
          const activity = new MozActivity({ name, data });
          activity.onsuccess = () => resolve(activity);
          activity.onerror = (e) => reject(e);
        });
      } else if ('WebActivity' in window) {
        // KaiOS 3.0
        const activity = new WebActivity(name, data);
        return activity.start();
      }

      return Promise.resolve(null);
    }

    function openApp(name, manifestUrl) {
      if (!manifestUrl && manifestUrl.length) return;

      const data = {
        url: manifestUrl,
        type: 'url',
        appName: name
      };

      return launchActivity('open-app', data)
        .catch(() => launchActivity('open-page', data))
        .catch(() => { /* noop */ });
    }

    const kaiStoreButton = document.querySelector("a[href^=\'https://www.kaiostech.com/store/\']");
    const jioStoreButton = document.querySelector('.jio-badge');

    if (kaiStoreButton) {
      kaiStoreButton.addEventListener('click', (e) => {
        if ('WebActivity' in window) { e.preventDefault(); ` +
          ((app.v3_manifest_url) ? `openApp('${app.name}', '${app.v3_manifest_url}');` : ' /* noop */ ') +
        `} else if ('MozActivity' in window) { e.preventDefault(); ` +
        ((app.manifest_url) ? `openApp('${app.name}', '${app.manifest_url}');` : '/* noop */') +
        `}
      });
    }

    if (jioStoreButton) {
      jioStoreButton.addEventListener('click', (e) => {
        if ('MozActivity' in window) { e.preventDefault(); ` +
        ((app.jio_manifest_url) ?
          `openApp('${app.name}', '${app.jio_manifest_url}');` : '') +
        `}
      });
    }
  `.trim();
}

function toLocaleObj(locales: Locale[]) {
  return locales.reduce((obj, locale) =>
    ({ ...obj, [locale.language.toLowerCase()]: locale}), { });
}

function getLocaleScriptBlock(app: AppObject) {
  if (!app.locales) return '';
  const locales = toLocaleObj(app.locales);

  return `
    function setLocale(lang, locale) {
      document.documentElement.lang  = lang;

      const toLocalize = Array.from(document.querySelectorAll('[data-locale]'));
      toLocalize.forEach((el) => {
        if (el.dataset.locale && locale[el.dataset.locale]) {
          el.textContent = locale[el.dataset.locale];
        }
      });
    }

    const locales = ${JSON.stringify(locales)};
    const lang = ((navigator.language || navigator.languages[0]) + '').toLowerCase();

    function findLocale(inLang) {
      const lang = inLang.toLowerCase();
      if (locales[lang]) return lang;
      const langOnly = lang.substring(0, 2);

      return Object.keys(locales)
        .find((langStr) => (
          lang === langStr ||
          langOnly === langStr.substring(0, 2)
        ));
    }

    if (findLocale(lang)) {
      setLocale(lang, locales[lang]);
    }
  `;
}

function getRecommendedAppList(recommendedApps: SimpleApp[] | undefined) {
  if (!recommendedApps) return '';
  return `<ol class="app-list">` +
    recommendedApps.map((app) =>
      `<li><a href="/apps/${app.id}.html" title="${app.display || app.name}">` +
      getSimpleIcon(app) +
      `<span>${app.display || app.name}</span>
      </a></li>`).join('') +
    `</ol>`;
}

function getKaiAdsDependency(app: AppObject) {
  if (!app.dependencies) return '';
  if (app.dependencies.hasOwnProperty('ads-sdk')) {
    const kaiAdsVersion = (app.dependencies as any)['ads-sdk'];
    return `<p><a href="https://kaiads.com/" referrerPolicy="origin-when-cross-origin" rel="external noopener">KaiAds</a>: v${kaiAdsVersion}</p>\n`;
  }
  return '';
}

export const AppLayout = (app: AppObject) => `
    <!DOCTYPE html>
    <html class="no-js" lang="${app.default_locale}" prefix="og: https://ogp.me/ns#">
      <head>
        <meta charset="utf-8" />
        <title>KaiOS.app | ${app.display || getLocalized(app, 'name')}</title>
        <meta name="description" content="${getLocalized(app, 'description') || app.summary}" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <link rel="apple-touch-icon" sizes="180x180" href="/img/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/img/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/img/favicon-16x16.png" />
        <link rel="manifest" href="/img/site.webmanifest" />
        <link rel="apple-touch-icon" href="/img/apple-touch-icon.png" />
        <link rel="shortcut icon" href="/img/favicon.png" type="image/x-icon" />
        <link rel="shortcut icon" href="/img/favicon.ico" type="image/x-icon" />

        <meta property="og:title" content="KaiOS.app | ${app.display || getLocalized(app, 'name')}" />
        <meta property="og:description" content="${getLocalized(app, 'description') || app.summary}" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="${getLocale(app)}" />
        <meta property="og:site_name" content="KaiOS.app" />
        <meta property="og:image" content="${app.thumbnail_url}" />

        <link rel="stylesheet" href="https://cdn.simplecss.org/simple-v1.css" />
        <link rel="stylesheet" href="/site.css" />

        <link rel="icon" href="${app.thumbnail_url}" sizes="any" />
        <link rel="apple-touch-icon" href="${app.thumbnail_url}" />
        <meta name="application-name" content="${app.display || getLocalized(app, 'name')}" />
        ${getPrefetch(app)}

        <link rel="manifest" type="application/x-web-app-manifest+json" href="${app.manifest_url}" />
        ` + ((app.jio_manifest_url) ? `<link rel="manifest" type="application/x-web-app-manifest+json" href="${app.jio_manifest_url}" />` : '') +
        ((app.v3_manifest_url) ? `<link rel="manifest" type="application/manifest+json" href="${app.v3_manifest_url}" />` : '') + `
        <link rel="manifest" type="application/manifest+json" href='data:application/manifest+json,${quoteattr(JSON.stringify({
          name: getLocalized(app, 'name'),
          short_name: app.short_name,
          theme_color: app.theme,
          related_applications: (app.bundle_id) ? [{
            "platform": "play",
            "url": "https://play.google.com/store/apps/details?id=" + app.bundle_id,
            "id": app.bundle_id
          }] : [],
          icons: [{
            "src": app.thumbnail_url,
            "sizes": "any"
          }]
        }))}' />

        <meta name="theme-color" content="${app.theme}" />
      </head>
      <body>
        <p><a href="/" title="KaiOS.app Homepage">KaiOS.app</a></p>
        <h1 class="app-header">` +
          getIcon(app) +
          `<span data-locale="name">${app.display || getLocalized(app, 'name')}</span>
        </h1>
        <h3><a href="/categories/${getCategoryName(app.category)}.html" title="${app.category}">${app.category}</a></h3>
        ${getSummary(app)}
        <p data-locale="description">${getLocalized(app, 'description')}</p>` +
        getScreenshotsFragment(app) +
        `<section class="app-badges">` +
        getKaiStoreButton(app) +
        getJioStoreButton(app) +
        `</section>` +
        getDeveloperFragment(app.developer, app.developer_url) +
        ((isValidSize(app.size)) ? `<p><u>Size</u>: ${getSizeFragment(app.size)}</p>` : '') +
        `<p><u>Version</u>: ${app.version}</p>
        <p><u>Published</u>: ${getDateFragment(app.release_date, getLocale(app))}</p>
        ` + getKaiAdsDependency(app) +
        ((app.recommendations && app.recommendations.length) ? `<h3>Recommended Apps</h3>` : '') +
        getRecommendedAppList(app.recommendations) +
        `<script type="text/javascript">
        //<![CDATA[
        ` + minify(`
        (function() {
          document.body.classList.remove('no-js');
          Array.from(document.images).forEach((img) => { img.onerror = () => img.parentNode.removeChild(img) });\n` +
          getInstallScriptBlock(app) +
          getLocaleScriptBlock(app) +
        `})();`).code +
        `//]]>
      </script>
      </body>
    </html>`;
