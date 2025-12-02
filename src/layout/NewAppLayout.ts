import { AppObject, getDomain, getLocale, getLocalized, getThumbnailUrl, Locale, SimpleApp } from '../app-utils';
import { byteSize, getCategoryName, getDeveloperUrlPath, quoteattr, getFormattedWebsite, getLastUpdated, capitalizeFirstLetter } from '../gen-utils';
import { minify } from 'uglify-js';

function getDeveloperFragment(developer?: string, developer_url?: string) {
  if (!developer) return '';
  return `<p>
    <span><u>Developer</u>:</span>
    <a href="/developers/${getDeveloperUrlPath(developer)}.html" title="${developer}">${developer}</a> ` +
    ((!developer_url) ? '' : `(<a href="${developer_url}" title="${developer}" referrerPolicy="origin-when-cross-origin" rel="external noopener dns-prefetch">${getFormattedWebsite(developer_url)}</a>)`) +
  `</p>`;
}

const getKaiStoreLink = (bundle_id: string) => `https://www.kaiostech.com/store/apps/?bundle_id=${bundle_id}&utm_source=kaios.app&utm_medium=app-page`;

const getKaiStoreButton = (app: AppObject) => (!(app.manifest_url || app.v3_manifest_url) || !app.bundle_id) ? '' :
  `<a href="${getKaiStoreLink(app.bundle_id)}" title="Download ${app.display || app.name} on the KaiStore" referrerPolicy="origin-when-cross-origin" rel="external noopener dns-prefetch" class="appStoreLink">
    <img src="/img/KaiStore-Badge-SM.png" class="store-badge kai-badge appStore white-border" alt="Open in KaiStore" decoding="async" loading="lazy" draggable="false" />
  </a>`

const getBadgeCount = (app: AppObject) =>
    ((app.jio_manifest_url) ? 1 : 0) + ((app.manifest_url || app.v3_manifest_url) ? 1 : 0);

const getJioStoreButton = (app: AppObject) => (!app.jio_manifest_url) ? '' :
  `<img src="/img/JioStore-Badge.png" title="Download ${app.display || app.name} on the JioStore" class="store-badge jio-badge appStore white-border" alt="Open in JioStore" decoding="async" loading="lazy" draggable="false" />`;

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

function getScreenshotFilter(app: AppObject) {
    if (!app.screenshots || app.screenshots.length === 0) return '';
    return `<filter id="screenshot_filter" height="100%" width="100%" filterUnits="objectBoundingBox" x="0" y="0">
            <feImage xlink:href="${app.screenshots[0]}" />
        </filter>`;
}

function getScreenshotScript(app: AppObject) {
    if (!app.screenshots || app.screenshots.length === 0) return '';
    return `<script type="text/javascript">
    (function() {
        const screenshots = ["${app.screenshots.join('", "')} "];
        const SCREENSHOT_ITERVAL = 8000; // 8 seconds
        let screenshotIndex = 0;
        let screenshotFilter = document.getElementById('screenshot_filter');

        function setScreenshot(src) {
            screenshotFilter.children[0].setAttribute('href', src);
        }

        function getNextIndex(currentIndex) {
            let nextIndex = currentIndex;
            nextIndex += 1;
            if (nextIndex === screenshots.length) {
                nextIndex = 0;
            }
            return nextIndex;
        }

        function preloadNextImage() {
            let nextIndex = getNextIndex(screenshotIndex);
            let img = new Image();
            img.src = screenshots[screenshotIndex];
        }

        setInterval(function() {
            screenshotIndex = getNextIndex(screenshotIndex);
            setScreenshot(screenshots[screenshotIndex]);
            requestAnimationFrame(preloadNextImage);
        }, SCREENSHOT_ITERVAL);

        requestAnimationFrame(preloadNextImage);
    })();
    </script>`;
}

const getSummary = (app: AppObject) => (!(app.summary || getLocalized(app, 'subtitle'))) ? '' :
`<h3 data-locale="subtitle" class="appDescription">${getLocalized(app, 'subtitle') || app.summary}</h3>`;

const getIcon = (app: AppObject, size = 112) => (!app.thumbnail_url) ? '' :
  `<img src="${getThumbnailUrl(app)}" alt="${app.display || getLocalized(app, 'name')}" draggable="false" referrerPolicy="no-referrer" loading="eager" fetchPriority="high" width="${size}" height="${size}" class="appIconLarge" />`;

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
    recommendedApps.slice(0, 8).map((app) =>
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
    return `<p><u><a href="https://kaiads.com/" referrerPolicy="origin-when-cross-origin" rel="external noopener">KaiAds</a></u>: v${kaiAdsVersion}</p>\n`;
  }
  return '';
}

function getKaiosPlatforms(app: AppObject) {
    const versions = [];
    if (app.manifest_url || app.jio_manifest_url) {
        versions.push('KaiOS 2.5');
    }
    if (app.v3_manifest_url) {
        versions.push('KaiOS 3.0');
    }
    return `<p><u>Platforms</u>: ${versions.join(', ')}</p>\n`;
}

export const AppLayout = (app: AppObject) => `
<!DOCTYPE html>
<html lang="en-us">

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

    <link rel="stylesheet" href="/main.css" type="text/css" />

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

<body class="no-js">
<div class="imageWrapper">
<div class="headerBackground">
    <div class="container">
        <header>
            <div class="logo">
                <div class="appIconShadow white-border">
                    <a href="https://kaios.app/" title="KaiOS.app">
                        <svg width="0" height="0">
                            <defs>
                                <clipPath id="shape">
                                    <path id="shape" class="cls-1"
                                        d="M6181.23,233.709v-1.792c0-.5-0.02-1-0.02-1.523a24.257,24.257,0,0,0-.28-3.3,11.207,11.207,0,0,0-1.04-3.132,10.683,10.683,0,0,0-1.95-2.679,10.384,10.384,0,0,0-2.68-1.943,10.806,10.806,0,0,0-3.13-1.038,19.588,19.588,0,0,0-3.3-.285c-0.5-.017-1-0.017-1.52-0.017h-22.39c-0.51,0-1.01.017-1.53,0.017a24.041,24.041,0,0,0-3.3.285,11.009,11.009,0,0,0-3.13,1.038,10.491,10.491,0,0,0-4.62,4.622,10.893,10.893,0,0,0-1.04,3.132,19.2,19.2,0,0,0-.28,3.3c-0.02.5-.02,1-0.02,1.523v22.392c0,0.5.02,1,.02,1.524a24.257,24.257,0,0,0,.28,3.3,10.9,10.9,0,0,0,1.04,3.132,10.491,10.491,0,0,0,4.62,4.622,11.04,11.04,0,0,0,3.13,1.038,19.891,19.891,0,0,0,3.3.285c0.51,0.017,1.01.017,1.53,0.017h22.39c0.5,0,1-.017,1.52-0.017a24.221,24.221,0,0,0,3.3-.285,10.836,10.836,0,0,0,3.13-1.038,10.408,10.408,0,0,0,2.68-1.943,10.683,10.683,0,0,0,1.95-2.679,11.217,11.217,0,0,0,1.04-3.132,20.257,20.257,0,0,0,.28-3.3c0.02-.5.02-1,0.02-1.524v-20.6h0Z"
                                        transform="translate(-6131 -218)" />
                                </clipPath>
                            </defs>
                        </svg>
                        <img class="headerIcon" src="/img/kaios-logo.png" alt="KaiOS Icon" decoding="async" loading="lazy" draggable="false" />
                    </a>
                    <div class="divider"></div>
                </div>
                <p class="headerName">
                    <a href="https://kaios.app/" title="KaiOS.app">KaiOS.app</a>
                </p>
            </div>
            <nav class="scroll">
                <ul>
                    <li><a href="/categories/${getCategoryName(app.category)}.html" title="${app.category}">${app.category}</a></li>
                </ul>
            </nav>
        </header>
        <div class="preview-container">

            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 0 0" style="position: absolute;">
                <clipPath id="screenMask" clipPathUnits="objectBoundingBox" transform="scale(0.00257, 0.00119)">
                    <path d="M6490.24,1234.36H6216.28c-2.57,0-10.55-.07-12.07-0.07a87.524,87.524,0,0,1-12-1.03,40.051,40.051,0,0,1-11.4-3.79,38.315,38.315,0,0,1-16.82-16.84,39.948,39.948,0,0,1-3.78-11.42,72.257,72.257,0,0,1-1.04-12.02c-0.06-1.83-.06-5.56-0.06-5.56V452.125h0s0.06-11.391.06-12.086a87.9,87.9,0,0,1,1.04-12.025,39.843,39.843,0,0,1,3.78-11.413,38.283,38.283,0,0,1,16.82-16.847,39.762,39.762,0,0,1,11.4-3.785,71.909,71.909,0,0,1,12-1.037c16.99-.567,36.32-0.061,34.51-0.061,5.02,0,6.5,3.439,6.63,6.962a35.611,35.611,0,0,0,1.2,8.156,21.326,21.326,0,0,0,19.18,15.592c2.28,0.192,6.78.355,6.78,0.355H6433.7s4.5-.059,6.79-0.251a21.348,21.348,0,0,0,19.18-15.591,35.582,35.582,0,0,0,1.19-8.154c0.13-3.523,1.61-6.962,6.64-6.962-1.81,0,17.52-.5,34.5.061a71.923,71.923,0,0,1,12.01,1.038,39.832,39.832,0,0,1,11.4,3.784,38.283,38.283,0,0,1,16.82,16.844,40.153,40.153,0,0,1,3.78,11.413,87.844,87.844,0,0,1,1.03,12.023c0,0.695.06,12.084,0.06,12.084h0V1183.64s0,3.72-.06,5.55a72.366,72.366,0,0,1-1.03,12.03,40.2,40.2,0,0,1-3.78,11.41,38.315,38.315,0,0,1-16.82,16.84,40.155,40.155,0,0,1-11.4,3.79,87.669,87.669,0,0,1-12.01,1.03c-1.52,0-9.5.07-12.07,0.07" transform="translate(-6159.12 -394.656)"/>
                </clipPath>
            </svg>

            <svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" width="10.3in" height="18.9in" id="jiophone-preview" class="white-border"
                style="shape-rendering:geometricPrecision; text-rendering:geometricPrecision; image-rendering:optimizeQuality; fill-rule:evenodd; clip-rule:evenodd"
                viewBox="0 0 10300 18900" xmlns:xlink="http://www.w3.org/1999/xlink">
            <defs>
                <style type="text/css">
                /* <![CDATA[ */
                .str0 {stroke:#373435;stroke-width:6.94488}
                .str9 {stroke:#FEFEFE;stroke-width:13.8898}
                .str2 {stroke:#373435;stroke-width:27.7795}
                .str1 {stroke:#201E1E;stroke-width:27.7795}
                .str8 {stroke:#FEFEFE;stroke-width:27.7795}
                .str7 {stroke:#168B3C;stroke-width:27.7795}
                .str4 {stroke:#201E1E;stroke-width:41.6654}
                .str6 {stroke:#FFFFFF;stroke-width:9.94488}
                .str3 {stroke:#D52B2B;stroke-width:41.6654}
                .str5 {stroke:#201E1E;stroke-width:55.5551}
                .fil44 {fill:none}
                .fil46 {fill:#020202}
                .fil50 {fill:#168B3C}
                .fil45 {fill:#2E2E2E}
                .fil51 {fill:#D52B2B}
                .fil47 {fill:#282829}
                .fil43 {fill:#282929}
                .fil42 {fill:#2C2C2C}
                .fil41 {fill:#2D2D2D}
                .fil40 {fill:#2F2F2F}
                .fil39 {fill:#303030}
                .fil38 {fill:#313131}
                .fil37 {fill:#323233}
                .fil36 {fill:#343434}
                .fil35 {fill:#353636}
                .fil34 {fill:#363737}
                .fil0 {fill:#373435}
                .fil1 {fill:#383737}
                .fil33 {fill:#383838}
                .fil32 {fill:#393A3A}
                .fil2 {fill:#3A393A}
                .fil31 {fill:#3B3B3B}
                .fil3 {fill:#3C3B3C}
                .fil30 {fill:#3C3D3D}
                .fil29 {fill:#3D3E3E}
                .fil4 {fill:#3E3D3E}
                .fil28 {fill:#3F4040}
                .fil5 {fill:#403F40}
                .fil27 {fill:#404141}
                .fil6 {fill:#424142}
                .fil26 {fill:#424242}
                .fil25 {fill:#434444}
                .fil7 {fill:#444344}
                .fil8 {fill:#454445}
                .fil24 {fill:#454645}
                .fil9 {fill:#464546}
                .fil23 {fill:#464747}
                .fil10 {fill:#474647}
                .fil22 {fill:#474747}
                .fil11 {fill:#484748}
                .fil21 {fill:#484847}
                .fil20 {fill:#494848}
                .fil12 {fill:#494849}
                .fil19 {fill:#4A4948}
                .fil13 {fill:#4A4949}
                .fil14 {fill:#4A494A}
                .fil18 {fill:#4B4949}
                .fil15 {fill:#4B494A}
                .fil16 {fill:#4B4A4A}
                .fil17 {fill:#4C4A4A}
                .fil48 {fill:#FEFEFE}
                .fil53 {fill:#FEFEFE;fill-rule:nonzero}
                .fil49 {fill:url(#id3)}
                .fil54 {fill:url(#id4)}
                .fil52 {fill:url(#id5)}
                .fil55 {fill:url(#id6)}
                /* ]]> */
                </style>
                ` + getScreenshotFilter(app) + `
                <clipPath id="id0">
                <path
                    d="M2186 220l6516 0c319,0 579,261 579,579l0 17192c0,319 -261,579 -579,579l-6516 0c-319,0 -579,-261 -579,-579l0 -17192c0,-319 261,-579 579,-579z" />
                </clipPath>
                <mask id="id1">
                <linearGradient id="id2" gradientUnits="userSpaceOnUse" x1="1276.51" y1="5303.28" x2="7039.31" y2="6296.86">
                    <stop offset="0" style="stop-opacity:1; stop-color:white" />
                    <stop offset="1" style="stop-opacity:0; stop-color:white" />
                </linearGradient>
                <rect style="fill:url(#id2)" x="1907" y="523" width="4501" height="10554" />
                </mask>
                <linearGradient id="id3" gradientUnits="userSpaceOnUse" x1="3136.13" y1="11520.6" x2="3136.13" y2="12266.4">
                    <stop offset="0" style="stop-color:#373435" />
                    <stop offset="0.509804" style="stop-color:#474747" />
                    <stop offset="0.521569" style="stop-color:#373535" />
                    <stop offset="1" style="stop-color:#262626" />
                </linearGradient>
                <linearGradient id="id4" gradientUnits="userSpaceOnUse" x1="5670.11" y1="10870" x2="5327.37" y2="9784.67">
                    <stop offset="0" style="stop-color:#FBFBFB" />
                    <stop offset="0.521569" style="stop-color:#929292" />
                    <stop offset="0.529412" style="stop-color:darkgray" />
                    <stop offset="1" style="stop-color:#E1E1E1" />
                </linearGradient>
                <linearGradient id="id5" gradientUnits="userSpaceOnUse" x1="4488.61" y1="11938.8" x2="6422.86" y2="13178.7">
                    <stop offset="0" style="stop-color:#313131" />
                    <stop offset="1" style="stop-color:#303030" />
                </linearGradient>
                <radialGradient id="id6" gradientUnits="userSpaceOnUse" cx="4218.55" cy="1409.56" r="54.685" fx="4218.55"
                fy="1409.56">
                    <stop offset="0" style="stop-color:#3E4095" />
                    <stop offset="0.509804" style="stop-color:#373536" />
                    <stop offset="1" style="stop-color:#373435" />
                </radialGradient>
            </defs>
            <g>
                <g>
                <g style="clip-path:url(#id0)">
                    <polygon class="fil0"
                    points="14619,220 14619,18571 -3731,18571 -3731,220 14619,220 14252,587 14252,18204 -3364,18204 -3364,587 14252,587 " />
                    <polygon id="1" class="fil1"
                    points="14436,404 14436,18387 -3548,18387 -3548,404 14436,404 14069,771 14069,18020 -3181,18020 -3181,771 14069,771 " />
                    <polygon id="12" class="fil2"
                    points="14252,587 14252,18204 -3364,18204 -3364,587 14252,587 13885,954 13885,17837 -2997,17837 -2997,954 13885,954 " />
                    <polygon id="123" class="fil3"
                    points="14069,771 14069,18020 -3181,18020 -3181,771 14069,771 13702,1138 13702,17653 -2814,17653 -2814,1138 13702,1138 " />
                    <polygon id="1234" class="fil4"
                    points="13885,954 13885,17837 -2997,17837 -2997,954 13885,954 13518,1321 13518,17470 -2630,17470 -2630,1321 13518,1321 " />
                    <polygon id="12345" class="fil5"
                    points="13702,1138 13702,17653 -2814,17653 -2814,1138 13702,1138 13335,1505 13335,17286 -2447,17286 -2447,1505 13335,1505 " />
                    <polygon id="123456" class="fil6"
                    points="13518,1321 13518,17470 -2630,17470 -2630,1321 13518,1321 13151,1688 13151,17103 -2263,17103 -2263,1688 13151,1688 " />
                    <polygon id="1234567" class="fil7"
                    points="13335,1505 13335,17286 -2447,17286 -2447,1505 13335,1505 12968,1872 12968,16919 -2080,16919 -2080,1872 12968,1872 " />
                    <polygon id="12345678" class="fil8"
                    points="13151,1688 13151,17103 -2263,17103 -2263,1688 13151,1688 12784,2055 12784,16736 -1896,16736 -1896,2055 12784,2055 " />
                    <polygon id="123456789" class="fil9"
                    points="12968,1872 12968,16919 -2080,16919 -2080,1872 12968,1872 12601,2239 12601,16552 -1713,16552 -1713,2239 12601,2239 " />
                    <polygon id="12345678910" class="fil10"
                    points="12784,2055 12784,16736 -1896,16736 -1896,2055 12784,2055 12417,2422 12417,16369 -1529,16369 -1529,2422 12417,2422 " />
                    <polygon id="1234567891011" class="fil11"
                    points="12601,2239 12601,16552 -1713,16552 -1713,2239 12601,2239 12234,2606 12234,16185 -1346,16185 -1346,2606 12234,2606 " />
                    <polygon id="123456789101112" class="fil12"
                    points="12417,2422 12417,16369 -1529,16369 -1529,2422 12417,2422 12050,2789 12050,16002 -1162,16002 -1162,2789 12050,2789 " />
                    <polygon id="12345678910111213" class="fil13"
                    points="12234,2606 12234,16185 -1346,16185 -1346,2606 12234,2606 11867,2973 11867,15818 -979,15818 -979,2973 11867,2973 " />
                    <polygon id="1234567891011121314" class="fil13"
                    points="12050,2789 12050,16002 -1162,16002 -1162,2789 12050,2789 11683,3156 11683,15635 -795,15635 -795,3156 11683,3156 " />
                    <polygon id="123456789101112131415" class="fil14"
                    points="11867,2973 11867,15818 -979,15818 -979,2973 11867,2973 11500,3340 11500,15451 -612,15451 -612,3340 11500,3340 " />
                    <polygon id="12345678910111213141516" class="fil15"
                    points="11683,3156 11683,15635 -795,15635 -795,3156 11683,3156 11316,3523 11316,15268 -428,15268 -428,3523 11316,3523 " />
                    <polygon id="1234567891011121314151617" class="fil16"
                    points="11500,3340 11500,15451 -612,15451 -612,3340 11500,3340 11133,3707 11133,15084 -245,15084 -245,3707 11133,3707 " />
                    <polygon id="123456789101112131415161718" class="fil16"
                    points="11316,3523 11316,15268 -428,15268 -428,3523 11316,3523 10949,3890 10949,14901 -61,14901 -61,3890 10949,3890 " />
                    <polygon id="12345678910111213141516171819" class="fil17"
                    points="11133,3707 11133,15084 -245,15084 -245,3707 11133,3707 10766,4074 10766,14717 122,14717 122,4074 10766,4074 " />
                    <polygon id="1234567891011121314151617181920" class="fil16"
                    points="10949,3890 10949,14901 -61,14901 -61,3890 10949,3890 10582,4257 10582,14534 306,14534 306,4257 10582,4257 " />
                    <polygon id="123456789101112131415161718192021" class="fil18"
                    points="10766,4074 10766,14717 122,14717 122,4074 10766,4074 10399,4441 10399,14350 489,14350 489,4441 10399,4441 " />
                    <polygon id="12345678910111213141516171819202122" class="fil18"
                    points="10582,4257 10582,14534 306,14534 306,4257 10582,4257 10215,4624 10215,14167 673,14167 673,4624 10215,4624 " />
                    <polygon id="1234567891011121314151617181920212223" class="fil13"
                    points="10399,4441 10399,14350 489,14350 489,4441 10399,4441 10032,4808 10032,13983 856,13983 856,4808 10032,4808 " />
                    <polygon id="123456789101112131415161718192021222324" class="fil13"
                    points="10215,4624 10215,14167 673,14167 673,4624 10215,4624 9848,4992 9848,13800 1040,13800 1040,4992 9848,4992 " />
                    <polygon id="12345678910111213141516171819202122232425" class="fil19"
                    points="10032,4808 10032,13983 856,13983 856,4808 10032,4808 9665,5175 9665,13616 1223,13616 1223,5175 9665,5175 " />
                    <polygon id="1234567891011121314151617181920212223242526" class="fil20"
                    points="9848,4992 9848,13800 1040,13800 1040,4992 9848,4992 9481,5359 9481,13433 1407,13433 1407,5359 9481,5359 " />
                    <polygon id="123456789101112131415161718192021222324252627" class="fil21"
                    points="9665,5175 9665,13616 1223,13616 1223,5175 9665,5175 9298,5542 9298,13249 1590,13249 1590,5542 9298,5542 " />
                    <polygon id="12345678910111213141516171819202122232425262728" class="fil22"
                    points="9481,5359 9481,13433 1407,13433 1407,5359 9481,5359 9114,5726 9114,13066 1774,13066 1774,5726 9114,5726 " />
                    <polygon id="1234567891011121314151617181920212223242526272829" class="fil23"
                    points="9298,5542 9298,13249 1590,13249 1590,5542 9298,5542 8931,5909 8931,12882 1957,12882 1957,5909 8931,5909 " />
                    <polygon id="123456789101112131415161718192021222324252627282930" class="fil24"
                    points="9114,5726 9114,13066 1774,13066 1774,5726 9114,5726 8747,6093 8747,12699 2141,12699 2141,6093 8747,6093 " />
                    <polygon id="12345678910111213141516171819202122232425262728293031" class="fil25"
                    points="8931,5909 8931,12882 1957,12882 1957,5909 8931,5909 8564,6276 8564,12515 2324,12515 2324,6276 8564,6276 " />
                    <polygon id="1234567891011121314151617181920212223242526272829303132" class="fil26"
                    points="8747,6093 8747,12699 2141,12699 2141,6093 8747,6093 8380,6460 8380,12332 2508,12332 2508,6460 8380,6460 " />
                    <polygon id="123456789101112131415161718192021222324252627282930313233" class="fil27"
                    points="8564,6276 8564,12515 2324,12515 2324,6276 8564,6276 8197,6643 8197,12148 2691,12148 2691,6643 8197,6643 " />
                    <polygon id="12345678910111213141516171819202122232425262728293031323334" class="fil28"
                    points="8380,6460 8380,12332 2508,12332 2508,6460 8380,6460 8013,6827 8013,11965 2875,11965 2875,6827 8013,6827 " />
                    <polygon id="1234567891011121314151617181920212223242526272829303132333435" class="fil29"
                    points="8197,6643 8197,12148 2691,12148 2691,6643 8197,6643 7830,7010 7830,11781 3058,11781 3058,7010 7830,7010 " />
                    <polygon id="123456789101112131415161718192021222324252627282930313233343536" class="fil30"
                    points="8013,6827 8013,11965 2875,11965 2875,6827 8013,6827 7646,7194 7646,11598 3242,11598 3242,7194 7646,7194 " />
                    <polygon id="12345678910111213141516171819202122232425262728293031323334353637" class="fil31"
                    points="7830,7010 7830,11781 3058,11781 3058,7010 7830,7010 7463,7377 7463,11414 3425,11414 3425,7377 7463,7377 " />
                    <polygon id="1234567891011121314151617181920212223242526272829303132333435363738" class="fil32"
                    points="7646,7194 7646,11598 3242,11598 3242,7194 7646,7194 7279,7561 7279,11231 3609,11231 3609,7561 7279,7561 " />
                    <polygon id="123456789101112131415161718192021222324252627282930313233343536373839" class="fil33"
                    points="7463,7377 7463,11414 3425,11414 3425,7377 7463,7377 7096,7744 7096,11047 3792,11047 3792,7744 7096,7744 " />
                    <polygon id="12345678910111213141516171819202122232425262728293031323334353637383940" class="fil34"
                    points="7279,7561 7279,11231 3609,11231 3609,7561 7279,7561 6912,7928 6912,10864 3976,10864 3976,7928 6912,7928 " />
                    <polygon id="1234567891011121314151617181920212223242526272829303132333435363738394041" class="fil35"
                    points="7096,7744 7096,11047 3792,11047 3792,7744 7096,7744 6729,8111 6729,10680 4159,10680 4159,8111 6729,8111 " />
                    <polygon id="123456789101112131415161718192021222324252627282930313233343536373839404142" class="fil36"
                    points="6912,7928 6912,10864 3976,10864 3976,7928 6912,7928 6545,8295 6545,10497 4343,10497 4343,8295 6545,8295 " />
                    <polygon id="12345678910111213141516171819202122232425262728293031323334353637383940414243" class="fil37"
                    points="6729,8111 6729,10680 4159,10680 4159,8111 6729,8111 6362,8478 6362,10313 4526,10313 4526,8478 6362,8478 " />
                    <polygon id="1234567891011121314151617181920212223242526272829303132333435363738394041424344" class="fil38"
                    points="6545,8295 6545,10497 4343,10497 4343,8295 6545,8295 6178,8662 6178,10130 4710,10130 4710,8662 6178,8662 " />
                    <polygon id="123456789101112131415161718192021222324252627282930313233343536373839404142434445" class="fil39"
                    points="6362,8478 6362,10313 4526,10313 4526,8478 6362,8478 5995,8845 5995,9946 4893,9946 4893,8845 5995,8845 " />
                    <polygon id="12345678910111213141516171819202122232425262728293031323334353637383940414243444546" class="fil40"
                    points="6178,8662 6178,10130 4710,10130 4710,8662 6178,8662 5811,9029 5811,9763 5077,9763 5077,9029 5811,9029 " />
                    <polygon id="1234567891011121314151617181920212223242526272829303132333435363738394041424344454647"
                    class="fil41"
                    points="5995,8845 5995,9946 4893,9946 4893,8845 5995,8845 5627,9212 5627,9579 5260,9579 5260,9212 5627,9212 " />
                    <polygon id="123456789101112131415161718192021222324252627282930313233343536373839404142434445464748"
                    class="fil42"
                    points="5811,9029 5811,9763 5077,9763 5077,9029 5811,9029 5444,9396 5444,9396 5444,9396 5444,9396 5444,9396 " />
                    <polygon id="12345678910111213141516171819202122232425262728293031323334353637383940414243444546474849"
                    class="fil43" points="5628,9212 5628,9579 5260,9579 5260,9212 5628,9212 " />
                </g>
                <path class="fil44 str6"
                    d="M2186 220l6516 0c319,0 579,261 579,579l0 17192c0,319 -261,579 -579,579l-6516 0c-319,0 -579,-261 -579,-579l0 -17192c0,-319 261,-579 579,-579z" />
                </g>
                <rect class="fil45 str0" x="1856" y="445" width="7172" height="17818" rx="319" ry="319" />
                <path class="fil46 str0"
                d="M1911 11074l7074 0 0 -9460 0 -82 0 -587c0,-229 -94,-417 -417,-417l-6240 0c-336,0 -417,188 -417,417l0 670 0 0 0 9460z" />

                <!-- Screen Rectangle -->
                <rect class="fil47 str0" x="2647" y="2271" width="5517" height="7313" style="filter:url(#screenshot_filter)" />

                <path class="fil48" style="mask:url(#id1);opacity:0.85;"
                d="M1911 11074l3698 0 796 -10547 -4077 0c0,0 -406,-8 -412,322 -5,329 -5,10225 -5,10225z" />
                <rect class="fil49 str1" x="2115" y="11521" width="2042" height="746" rx="145" ry="145" />
                <rect class="fil49 str1" x="2101" y="12853" width="2042" height="746" rx="145" ry="145" />
                <rect class="fil49 str1" x="6764" y="12853" width="2042" height="746" rx="145" ry="145" />
                <rect class="fil49 str1" x="6727" y="11521" width="2042" height="746" rx="145" ry="145" />
                <rect class="fil49 str1" x="2115" y="14105" width="2042" height="746" rx="145" ry="145" />
                <rect class="fil49 str1" x="4425" y="14120" width="2042" height="746" rx="145" ry="145" />
                <rect class="fil44 str2" x="6756" y="14113" width="2042" height="746" rx="145" ry="145" />
                <rect class="fil49 str1" x="4439" y="15068" width="2042" height="746" rx="145" ry="145" />
                <rect class="fil49 str1" x="6756" y="14113" width="2042" height="746" rx="145" ry="145" />
                <rect class="fil49 str1" x="2122" y="15068" width="2042" height="746" rx="145" ry="145" />
                <rect class="fil49 str1" x="6764" y="15061" width="2042" height="746" rx="145" ry="145" />
                <rect class="fil49 str1" x="2115" y="16039" width="2042" height="746" rx="145" ry="145" />
                <rect class="fil49 str1" x="4432" y="16031" width="2042" height="746" rx="145" ry="145" />
                <rect class="fil49 str1" x="6756" y="16024" width="2042" height="746" rx="145" ry="145" />
                <rect class="fil49 str1" x="2101" y="16987" width="2042" height="746" rx="145" ry="145" />
                <rect class="fil49 str1" x="4425" y="16994" width="2042" height="746" rx="145" ry="145" />
                <rect class="fil49 str1" x="6778" y="16987" width="2042" height="746" rx="145" ry="145" />
                <ellipse class="fil44 str0" cx="4906" cy="18001" rx="76" ry="87" />
                <rect class="fil48" x="3180" y="11825" width="529" height="116" />
                <rect class="fil48" x="7133" y="11832" width="529" height="94" />
                <path class="fil50"
                d="M2986 13325l206 -25c0,0 -25,-94 25,-105 51,-11 304,-25 348,25 43,51 7,87 7,87l192 18c0,0 94,-105 -40,-185 -134,-80 -561,-80 -630,-33 -69,47 -152,76 -109,217z" />
                <path class="fil51"
                d="M7120 13253l192 -14c0,0 -47,-127 98,-130 145,-4 290,4 311,43 22,40 -4,69 -4,69l188 33c0,0 98,-98 -40,-170 -138,-72 -471,-58 -554,-47 -83,11 -250,33 -192,217z" />
                <ellipse class="fil44 str3" cx="7535" cy="13293" rx="114" ry="109" />
                <ellipse class="fil51" cx="7535" cy="13293" rx="36" ry="34" />
                <rect class="fil52 str4" x="4333" y="11433" width="2244" height="2252" rx="702" ry="702" />
                <rect class="fil44 str5" x="4688" y="11766" width="1571" height="1593" rx="369" ry="369" />
                <path class="fil44 str6"
                d="M5219 12513c20,154 130,237 239,244 6,0 12,0 18,0 106,-2 206,-79 217,-237m-226 237l0 151m-161 0l340 0m-185 -753l0 0c62,0 112,51 112,112l0 252 0 13c0,62 -51,112 -112,112l0 0c-62,0 -112,-51 -112,-112l0 -16 0 -248c0,-62 51,-112 112,-112z" />
                <path class="fil53"
                d="M8093 11763l0 0 19 0 19 0 0 0 0 200c0,27 -7,48 -21,63 -14,15 -33,22 -59,22 -26,0 -46,-7 -60,-21 -14,-14 -21,-33 -19,-57l0 -19 35 0 0 19c0,15 4,26 11,34 7,8 18,12 31,12 14,0 24,-5 32,-14 8,-10 12,-23 12,-39l0 0 0 -200z" />
                <path id="1" class="fil53"
                d="M8185 12041l0 -202 0 0 17 0 17 0 0 0 0 202 0 0 -17 0 -17 0zm0 -278l35 0 0 39 -35 0 0 -39z" />
                <path id="12" class="fil53"
                d="M8352 12046c-28,0 -51,-10 -68,-30 -17,-20 -26,-45 -26,-77 0,-32 9,-58 26,-78 17,-20 40,-30 68,-30 28,0 51,10 68,30 17,20 26,46 26,78 0,32 -9,58 -26,77 -17,20 -40,30 -68,30zm0 -29c18,0 32,-7 43,-21 11,-14 16,-33 16,-57 0,-24 -5,-43 -16,-57 -11,-14 -25,-21 -43,-21 -18,0 -32,7 -43,21 -11,14 -16,33 -16,57 0,24 5,43 16,57 11,14 25,21 43,21z" />
                <path class="fil44 str7"
                d="M2451 13123l0 170 91 -83 -91 -87zm145 -14l138 0c28,0 51,23 51,51l0 130c0,28 -23,51 -51,51l-138 0c-28,0 -51,-23 -51,-51l0 -130c0,-28 23,-51 51,-51z" />
                <path class="fil53"
                d="M2752 14622l0 -272 0 0 -90 0 0 -38c26,1 48,-5 64,-17 17,-12 29,-31 37,-56l39 0 0 0 0 384 0 0 -25 0 -26 0z" />
                <polygon class="fil53" points="3134,14573 3177,14573 3177,14616 3134,14616 " />
                <path id="1" class="fil53"
                d="M3248 14594l0 -22 21 0 21 0 0 36c0,21 -3,36 -10,46 -6,10 -17,17 -33,21l0 0 0 -19 0 0c8,-1 14,-6 17,-14 3,-6 4,-15 5,-27l-1 0 -21 0 0 -22z" />
                <path id="12" class="fil53"
                d="M3441 14350c-18,0 -32,5 -41,15 -9,10 -15,26 -17,48l0 0 -35 0 0 0c1,-30 10,-54 26,-70 16,-16 38,-25 66,-25 25,0 46,7 62,22 16,15 24,34 24,57 0,14 -3,27 -10,39 -7,12 -18,25 -34,40 -10,9 -18,19 -22,29 -4,10 -6,22 -6,36l-35 0c-1,-20 2,-36 8,-50 6,-14 16,-27 31,-40 11,-9 18,-18 23,-26 5,-8 7,-17 7,-26 0,-14 -4,-26 -13,-35 -8,-9 -20,-13 -35,-13zm-23 225l40 0 0 41 -40 0 0 -41z" />
                <path class="fil53"
                d="M5232 14361c0,28 -7,51 -22,69 -14,18 -41,38 -81,60 -43,24 -72,45 -88,65 -6,8 -12,18 -16,28l0 0 206 0 0 46 -260 0 0 0c0,-40 10,-73 30,-98 20,-25 57,-53 112,-83 27,-15 45,-28 54,-41 10,-12 15,-28 15,-47 0,-20 -7,-37 -22,-50 -14,-13 -33,-19 -55,-19 -24,0 -42,8 -56,24 -14,16 -21,39 -22,68l0 0 -46 0 0 0c-1,-42 10,-75 34,-99 23,-24 55,-36 96,-36 35,0 64,10 87,31 22,21 34,48 34,80z" />
                <path class="fil53"
                d="M5297 14626l77 -204 16 0 16 0 73 204 0 0 -15 0 -15 0 0 0 -21 -59 0 0 -81 0 0 0 -21 59 0 0 -14 0 -14 0zm91 -174l-33 90 0 0 64 0 0 0 -31 -90 0 0z" />
                <path id="1" class="fil53"
                d="M5503 14626l0 -204 0 0 14 0 0 0 76 0c17,0 31,4 42,13 11,9 16,21 16,35 0,17 -6,30 -19,40 -3,2 -6,4 -9,6l0 0c7,2 13,5 18,9 13,10 20,23 20,40 0,19 -6,34 -19,44 -13,11 -31,16 -54,16l-70 0 0 0 -14 0zm28 -180l0 63 0 0 49 0c15,0 26,-3 33,-8 7,-5 10,-14 10,-26 0,-10 -3,-18 -10,-22 -6,-5 -16,-7 -30,-7l-53 0zm0 86l0 71 0 0 56 0c16,0 27,-3 35,-9 7,-6 11,-16 11,-29 0,-11 -4,-20 -11,-25 -8,-5 -20,-8 -36,-8l-54 0z" />
                <path id="12" class="fil53"
                d="M5865 14551l0 0c-4,25 -13,45 -29,59 -16,14 -36,21 -60,21 -28,0 -50,-10 -67,-29 -17,-19 -25,-45 -25,-78 0,-33 9,-59 26,-78 17,-19 41,-29 70,-29 23,0 42,6 57,18 15,12 24,28 27,49l0 0 -27 0 0 0c-3,-13 -9,-24 -19,-31 -10,-7 -23,-11 -38,-11 -20,0 -37,8 -49,23 -12,15 -18,35 -18,61 0,27 6,48 17,62 11,14 27,21 49,21 16,0 29,-5 39,-15 10,-10 17,-24 21,-41l0 0 27 0z" />
                <path class="fil53"
                d="M7564 14341c0,-18 -7,-33 -21,-44 -14,-11 -31,-17 -53,-17 -23,0 -40,7 -52,21 -12,14 -19,35 -20,62l0 0 -46 0 0 0c0,-40 10,-71 31,-93 21,-22 51,-33 89,-33 36,0 65,9 88,27 22,18 33,42 33,72 0,29 -11,53 -33,72 -4,4 -9,7 -14,9l0 0c9,4 17,9 24,15 24,19 36,44 36,76 0,36 -12,65 -37,88 -25,23 -57,34 -95,34 -43,0 -75,-10 -97,-31 -22,-21 -34,-52 -36,-94l0 0 50 0 0 0c3,30 11,51 24,64 13,13 33,19 60,19 23,0 43,-7 58,-20 15,-13 23,-31 23,-52 0,-22 -7,-40 -22,-53 -12,-11 -28,-18 -48,-19 -9,-1 -18,-1 -26,-1 -8,0 -13,0 -16,1l0 -42c4,1 10,1 18,1 8,0 16,-1 24,-2 15,-2 28,-7 37,-15 13,-11 19,-25 19,-44z" />
                <path class="fil53"
                d="M7678 14603l0 -197 0 0 13 0 0 0 68 0c25,0 45,9 60,27 15,18 22,42 22,72 0,30 -8,54 -23,72 -15,18 -36,27 -61,27l-65 0 0 0 -13 0zm27 -23l0 0 49 0c19,0 34,-7 44,-20 10,-13 16,-32 16,-56 0,-24 -5,-43 -15,-56 -10,-13 -24,-20 -43,-20l-51 0 0 0 0 151z" />
                <polygon id="1" class="fil53"
                points="7877,14603 7877,14603 7877,14407 7877,14407 8021,14407 8021,14407 8021,14418 8021,14430 8021,14430 7904,14430 7904,14430 7904,14490 7904,14490 8011,14490 8011,14502 8011,14514 8011,14514 7904,14514 7904,14514 7904,14580 7904,14580 8023,14580 8023,14580 8023,14591 8023,14603 8023,14603 " />
                <polygon id="12" class="fil53"
                points="8060,14603 8060,14407 8060,14407 8196,14407 8196,14407 8196,14418 8196,14430 8196,14430 8087,14430 8087,14430 8087,14490 8087,14490 8183,14490 8183,14502 8183,14514 8183,14514 8087,14514 8087,14514 8087,14603 8073,14603 " />
                <path class="fil53"
                d="M2819 15559l-165 0 0 -22 0 -22 173 -240 19 0 19 0 0 244 0 0 53 0 0 40 -53 0 0 0 0 89 -47 0 0 -89zm0 -40l0 0 0 -170 0 0 0 0 -119 166 -3 4 0 0 122 0z" />
                <path class="fil53"
                d="M3111 15649c-31,0 -55,-11 -74,-32 -19,-21 -28,-49 -28,-84 0,-35 10,-63 29,-84 19,-21 45,-32 76,-32 24,0 45,7 62,20 17,14 27,31 30,52l0 0 -29 0 0 0c-3,-15 -10,-26 -21,-34 -11,-8 -26,-12 -44,-12 -21,0 -39,8 -52,25 -13,17 -20,38 -20,65 0,29 6,51 19,67 13,16 31,24 54,24 23,0 41,-8 55,-25 2,-3 4,-5 6,-8 2,-4 4,-9 6,-16 2,-7 2,-14 2,-20l0 -3 0 0 -69 0 0 -25 96 0 0 117 -19 0 -7 -28 0 0 -2 2c-18,21 -42,32 -71,32z" />
                <polygon id="1" class="fil53"
                points="3256,15643 3256,15422 3256,15422 3271,15422 3286,15422 3286,15422 3286,15513 3286,15513 3401,15513 3401,15513 3401,15422 3401,15422 3416,15422 3431,15422 3431,15422 3431,15643 3431,15643 3416,15643 3401,15643 3401,15643 3401,15539 3401,15539 3286,15539 3286,15539 3286,15643 3286,15643 3271,15643 " />
                <polygon id="12" class="fil53"
                points="3482,15643 3482,15422 3482,15422 3497,15422 3512,15422 3512,15422 3512,15643 3512,15643 3497,15643 " />
                <path class="fil53"
                d="M5264 15527c0,41 -13,74 -38,99 -25,26 -58,39 -98,39 -40,0 -71,-10 -95,-30 -24,-20 -37,-47 -40,-82l0 0 51 0 0 0c3,22 12,39 27,51 15,12 35,18 60,18 24,0 43,-8 58,-25 15,-17 23,-38 23,-64 0,-28 -8,-49 -24,-66 -16,-16 -37,-24 -64,-24 -15,0 -29,3 -42,10 -14,7 -24,16 -31,27l-42 -3 29 -211 0 0 205 0 0 48 -168 0 0 0 -17 108 0 0 2 -1c22,-15 45,-23 69,-23 42,0 75,12 99,35 24,23 37,54 37,93z" />
                <path class="fil53"
                d="M5294 15585l24 -3c1,15 3,26 9,31 5,6 12,8 21,8 7,0 12,-1 17,-5 5,-3 8,-7 10,-12 2,-5 3,-14 3,-25l0 -138 26 0 0 136c0,17 -2,30 -6,39 -4,9 -10,16 -19,21 -9,5 -19,7 -31,7 -18,0 -31,-5 -40,-15 -9,-10 -14,-25 -13,-45z" />
                <polygon id="1" class="fil53"
                points="5445,15642 5445,15442 5472,15442 5472,15541 5571,15442 5607,15442 5523,15523 5610,15642 5576,15642 5505,15541 5472,15573 5472,15642 " />
                <polygon id="12" class="fil53" points="5631,15642 5631,15442 5658,15442 5658,15618 5756,15618 5756,15642 " />
                <path class="fil53"
                d="M5397 15269l0 0c-1,-10 -5,-17 -12,-23 -7,-5 -16,-8 -28,-8 -12,0 -21,2 -27,7 -6,5 -9,11 -9,20 0,6 2,11 6,13 4,3 12,6 25,9l27 6c15,3 25,9 31,15 6,7 9,16 9,29 0,14 -5,25 -16,34 -11,8 -25,12 -44,12 -20,0 -36,-5 -48,-14 -11,-9 -17,-22 -17,-39l0 -1 0 0 19 0 0 0c0,11 4,20 12,26 8,6 19,9 33,9 13,0 23,-2 30,-7 7,-4 10,-11 10,-20 0,-8 -2,-13 -7,-17 -4,-4 -13,-7 -27,-10l-27 -6c-14,-3 -24,-8 -29,-14 -6,-6 -9,-14 -9,-24 0,-15 5,-27 15,-36 10,-9 24,-13 41,-13 18,0 32,4 42,13 10,9 16,21 17,36l0 0 -19 0z" />
                <path id="1" class="fil53"
                d="M5515 15384c-23,0 -41,-8 -55,-23 -14,-15 -21,-35 -21,-60 0,-25 7,-45 21,-60 14,-15 32,-23 55,-23 23,0 41,8 55,23 14,15 21,35 21,60 0,25 -7,44 -21,60 -14,15 -32,23 -55,23zm0 -19c16,0 29,-6 39,-18 10,-12 15,-27 15,-46 0,-19 -5,-34 -15,-46 -10,-12 -23,-18 -39,-18 -16,0 -29,6 -39,18 -10,12 -15,27 -15,46 0,19 5,34 15,46 10,12 23,18 39,18z" />
                <path id="12" class="fil53"
                d="M5711 15269l0 0c-1,-10 -5,-17 -12,-23 -7,-5 -16,-8 -28,-8 -12,0 -21,2 -27,7 -6,5 -9,11 -9,20 0,6 2,11 6,13 4,3 12,6 25,9l27 6c15,3 25,9 31,15 6,7 9,16 9,29 0,14 -5,25 -16,34 -11,8 -25,12 -44,12 -20,0 -36,-5 -48,-14 -11,-9 -17,-22 -17,-39l0 -1 0 0 19 0 0 0c0,11 4,20 12,26 8,6 19,9 33,9 13,0 23,-2 30,-7 7,-4 10,-11 10,-20 0,-8 -2,-13 -7,-17 -4,-4 -13,-7 -27,-10l-27 -6c-14,-3 -24,-8 -29,-14 -6,-6 -9,-14 -9,-24 0,-15 5,-27 15,-36 10,-9 24,-13 41,-13 18,0 32,4 42,13 10,9 16,21 17,36l0 0 -19 0z" />
                <path class="fil53"
                d="M7495 15277c32,0 58,9 77,26 19,17 29,41 31,72l0 0 -45 0 0 0c-2,-18 -8,-32 -19,-42 -11,-10 -25,-15 -43,-15 -28,0 -50,13 -65,41 -13,23 -21,55 -22,94l0 0c23,-29 51,-43 87,-43 34,0 62,11 83,33 21,22 32,52 32,88 0,36 -11,66 -34,88 -23,22 -53,33 -90,33 -40,0 -71,-15 -92,-46 -22,-31 -32,-75 -32,-132 0,-63 12,-112 35,-146 23,-34 56,-51 99,-51zm-81 254c0,24 7,43 21,58 14,15 31,22 53,22 22,0 39,-7 53,-22 14,-15 21,-34 21,-58 0,-23 -7,-43 -21,-58 -14,-15 -31,-22 -53,-22 -22,0 -39,8 -53,23 -14,15 -21,34 -21,57z" />
                <polygon class="fil53"
                points="7681,15634 7681,15634 7670,15634 7658,15634 7658,15634 7658,15464 7658,15464 7675,15464 7691,15464 7691,15464 7740,15609 7740,15609 7740,15609 7789,15464 7789,15464 7805,15464 7822,15464 7822,15464 7822,15634 7822,15634 7811,15634 7800,15634 7800,15634 7800,15490 7800,15490 7751,15634 7740,15634 7729,15634 7681,15490 7681,15490 " />
                <polygon id="1" class="fil53"
                points="7880,15634 7880,15634 7868,15634 7857,15634 7857,15634 7857,15464 7857,15464 7871,15464 7885,15464 7885,15464 7971,15602 7971,15602 7971,15602 7971,15464 7971,15464 7982,15464 7993,15464 7993,15464 7993,15634 7980,15634 7968,15634 7880,15495 7880,15495 7880,15495 " />
                <path id="12" class="fil53"
                d="M8103 15639c-25,0 -45,-8 -60,-25 -15,-17 -23,-38 -23,-65 0,-27 8,-49 23,-65 15,-17 35,-25 60,-25 25,0 45,8 60,25 15,17 23,38 23,65 0,27 -8,49 -23,65 -15,17 -35,25 -60,25zm0 -20c18,0 32,-6 43,-19 11,-13 16,-30 16,-50 0,-21 -5,-38 -16,-50 -11,-13 -25,-19 -43,-19 -18,0 -32,6 -43,19 -11,13 -16,30 -16,50 0,21 5,38 16,50 11,13 25,19 43,19z" />
                <path class="fil53"
                d="M2709 16584c12,-62 31,-119 56,-172 25,-51 57,-99 97,-145l0 0 -206 0 0 -45 256 0 0 21 0 21c-40,48 -73,98 -98,150 -25,53 -42,110 -53,171l-52 0z" />
                <path class="fil53"
                d="M2975 16594l0 -185 0 0 12 0 0 0 68 0c18,0 32,5 42,14 10,9 15,21 15,37 0,18 -5,31 -15,41 -10,10 -24,15 -42,15 -24,0 -42,0 -56,0l0 0 0 78 0 0 -12 0 -13 0zm25 -99l0 0 50 0c13,0 23,-3 29,-8 6,-5 9,-14 9,-26 0,-10 -3,-18 -9,-23 -6,-5 -16,-7 -29,-7l-50 0 0 0 0 64z" />
                <path id="1" class="fil53"
                d="M3301 16609l-28 -22 0 0c-14,8 -30,13 -49,13 -27,0 -49,-9 -65,-27 -17,-18 -25,-41 -25,-71 0,-29 8,-53 25,-71 17,-18 38,-27 65,-27 27,0 49,9 65,27 17,18 25,42 25,71 0,29 -8,53 -25,71l-2 2 0 0 5 4c12,10 19,15 20,16l-12 14zm-67 -53l12 -15 23 19 0 0 2 -3c12,-14 18,-32 18,-54 0,-23 -6,-41 -18,-55 -12,-14 -27,-21 -47,-21 -19,0 -35,7 -47,21 -12,14 -18,32 -18,55 0,22 6,41 18,54 12,14 27,21 47,21 11,0 20,-2 29,-6l0 0 -20 -16z" />
                <path id="12" class="fil53"
                d="M3348 16594l0 -185 0 0 12 0 0 0 74 0c20,0 35,4 45,13 10,9 15,21 15,37 0,16 -5,29 -16,38 -3,2 -6,4 -9,6l0 0 4 2c11,6 17,17 18,33l1 34c0,6 1,10 2,12 1,2 4,5 7,6l0 4 -31 0c-1,-2 -1,-5 -2,-12 -1,-6 -1,-13 -2,-21l-1 -15c0,-11 -3,-20 -8,-25 -5,-5 -14,-7 -26,-7l-59 0 0 0 0 80 0 0 -12 0 -13 0zm25 -101l0 0 62 0c12,0 20,-3 25,-8 5,-5 8,-13 8,-24 0,-11 -3,-18 -9,-23 -6,-5 -15,-7 -27,-7l-60 0 0 0 0 63z" />
                <path id="123" class="fil53"
                d="M3643 16463l0 0c-1,-12 -6,-21 -14,-27 -8,-6 -19,-9 -33,-9 -14,0 -25,3 -32,8 -7,5 -11,13 -11,24 0,7 2,12 7,16 5,4 15,7 29,10l32 8c17,4 30,10 37,18 7,8 11,19 11,34 0,17 -6,30 -19,40 -13,10 -30,15 -52,15 -24,0 -43,-6 -57,-17 -13,-11 -20,-26 -20,-46l0 -1 0 0 23 0 0 0c0,13 5,24 15,31 9,7 22,11 39,11 15,0 27,-3 35,-8 8,-5 12,-13 12,-23 0,-9 -3,-16 -8,-20 -5,-4 -16,-8 -31,-12l-32 -8c-16,-4 -28,-9 -35,-16 -7,-7 -10,-16 -10,-29 0,-18 6,-32 18,-42 12,-10 28,-16 49,-16 21,0 37,5 50,16 12,10 19,25 20,43l0 0 -23 0z" />
                <path class="fil53"
                d="M5052 16363c-17,-6 -29,-15 -37,-26 -8,-11 -12,-25 -12,-40 0,-24 9,-44 26,-60 17,-16 40,-24 68,-24 28,0 51,8 69,25 17,17 26,37 26,60 0,15 -4,28 -12,39 -8,11 -20,20 -36,26 20,7 35,17 46,32 10,15 16,32 16,52 0,28 -10,51 -30,70 -20,19 -46,28 -78,28 -32,0 -58,-9 -78,-29 -20,-19 -30,-43 -30,-71 0,-21 5,-39 16,-53 11,-14 26,-24 46,-29zm-8 -68c0,15 5,28 15,38 10,10 23,15 39,15 15,0 28,-5 38,-15 10,-10 15,-22 15,-36 0,-15 -5,-27 -15,-37 -10,-10 -23,-15 -38,-15 -15,0 -28,5 -38,15 -10,10 -15,22 -15,35zm-13 151c0,11 3,22 8,33 5,11 13,19 24,25 11,6 22,9 34,9 19,0 35,-6 47,-19 12,-12 19,-28 19,-47 0,-19 -6,-35 -19,-48 -13,-13 -29,-19 -48,-19 -19,0 -34,6 -47,19 -12,13 -19,28 -19,47z" />
                <polygon class="fil53"
                points="5361,16564 5361,16393 5297,16393 5297,16370 5451,16370 5451,16393 5386,16393 5386,16564 " />
                <path id="1" class="fil53"
                d="M5605 16370l26 0 0 112c0,20 -2,35 -7,47 -4,11 -12,21 -24,28 -12,7 -27,11 -45,11 -18,0 -33,-3 -45,-9 -12,-6 -20,-15 -25,-27 -5,-12 -7,-28 -7,-49l0 -112 26 0 0 112c0,17 2,29 5,37 3,8 9,14 16,19 8,4 17,7 28,7 19,0 32,-4 40,-13 8,-9 12,-25 12,-49l0 -112z" />
                <path id="12" class="fil53"
                d="M5729 16564l-75 -194 28 0 50 141c4,11 7,22 10,32 3,-11 7,-21 10,-32l52 -141 26 0 -76 194 -26 0z" />
                <path class="fil53"
                d="M7466 16592c-34,0 -61,-9 -81,-27 -20,-18 -31,-43 -32,-75l0 0 46 0 0 0c2,20 9,35 20,46 12,11 27,16 47,16 29,0 51,-16 66,-48 11,-24 19,-55 22,-94l0 0c-24,29 -53,44 -89,44 -36,0 -64,-12 -86,-35 -22,-23 -33,-54 -33,-92 0,-38 12,-69 35,-92 24,-23 55,-35 93,-35 41,0 73,15 95,44 22,29 33,71 33,124 0,72 -12,128 -36,167 -24,39 -58,59 -103,59zm83 -267c0,-25 -7,-45 -21,-60 -14,-16 -32,-23 -54,-23 -22,0 -40,8 -54,23 -14,16 -21,36 -21,60 0,25 7,45 21,60 14,16 32,24 54,24 22,0 40,-8 54,-24 14,-16 21,-36 21,-60z" />
                <path class="fil53"
                d="M7695 16570l-46 -174 0 0 13 0 13 0 0 0 31 138c1,2 1,4 1,7 0,2 1,4 1,4l0 0c0,-1 0,-3 1,-5 0,-2 1,-4 1,-6l37 -138 13 0 13 0 37 137c1,2 1,4 2,7 0,2 1,4 1,5l0 0c0,-1 0,-2 1,-5 0,-2 1,-4 1,-7l31 -137 0 0 13 0 13 0 0 0 -46 174 -13 0 -13 0 -38 -135c-1,-2 -1,-5 -2,-7 0,-2 -1,-4 -1,-5l0 0c0,1 0,3 -1,5 0,2 -1,4 -2,7l-37 135 -13 0 -13 0z" />
                <polygon id="1" class="fil53"
                points="7879,16570 7941,16483 7941,16483 7883,16396 7883,16396 7898,16396 7913,16396 7913,16396 7955,16464 7955,16464 7955,16464 8001,16396 8001,16396 8015,16396 8030,16396 8030,16396 7969,16481 7969,16481 8032,16570 8032,16570 8018,16570 8003,16570 8003,16570 7955,16500 7955,16500 7955,16500 7908,16570 7908,16570 7894,16570 " />
                <polygon id="12" class="fil53"
                points="8106,16500 8106,16500 8040,16396 8040,16396 8054,16396 8068,16396 8068,16396 8118,16480 8118,16480 8168,16396 8168,16396 8181,16396 8195,16396 8195,16396 8129,16501 8129,16501 8129,16570 8118,16570 8106,16570 " />
                <polygon id="123" class="fil53"
                points="8204,16549 8311,16417 8311,16417 8212,16417 8212,16417 8212,16406 8212,16396 8212,16396 8341,16396 8341,16406 8341,16416 8234,16549 8234,16549 8341,16549 8341,16549 8341,16559 8341,16570 8341,16570 8204,16570 8204,16560 " />
                <path class="fil44 str6" d="M2480 17265l315 206m-156 -268l0 351m148 -272l-311 188" />
                <path class="fil44 str8"
                d="M3046 17359c0,0 14,-80 56,-76 43,4 58,44 54,76m-153 0l43 0 110 0 50 0 0 192 -203 0 0 -192z" />
                <circle class="fil44" cx="3103" cy="17460" r="24" />
                <path class="fil44 str8" d="M3485 17339l0 208m-94 -107l201 0" />
                <path class="fil53"
                d="M5113 17595c-47,0 -83,-19 -109,-57 -26,-38 -38,-93 -38,-163 0,-71 13,-125 38,-164 26,-38 62,-57 109,-57 47,0 84,19 109,57 25,38 38,93 38,164 0,71 -13,125 -38,163 -25,38 -62,57 -109,57zm0 -48c30,0 53,-14 68,-43 15,-29 23,-72 22,-129 0,-57 -7,-101 -22,-129 -15,-29 -38,-43 -68,-43 -30,0 -53,14 -67,43 -15,29 -23,72 -23,129 0,57 8,101 23,129 15,29 37,43 67,43z" />
                <polygon class="fil53"
                points="5684,17494 5340,17496 5340,17496 5340,17426 5366,17426 5367,17466 5367,17466 5657,17465 5657,17465 5657,17425 5684,17425 " />
                <ellipse class="fil44 str9" cx="5882" cy="17416" rx="135" ry="134" />
                <ellipse class="fil44 str9" cx="5878" cy="17416" rx="79" ry="134" />
                <line class="fil44 str9" x1="5752" y1="17378" x2="6011" y2="17378" />
                <line class="fil44 str9" x1="5753" y1="17457" x2="6010" y2="17457" />
                <ellipse class="fil44 str9" cx="5880" cy="17416" rx="25" ry="132" />
                <path class="fil53"
                d="M7490 17149l-18 125 73 0 18 -125 37 0 -18 125 62 0 -5 37 -62 0 -12 83 62 0 -5 37 -63 0 -17 122 -37 0 17 -122 -72 0 -17 122 -37 0 17 -122 -62 0 5 -37 62 0 12 -83 -62 0 5 -37 62 0 18 -125 37 0zm-23 162l-12 83 73 0 12 -83 -73 0z" />
                <path class="fil54"
                d="M5465 10135l47 0c52,0 94,42 94,94l0 438c0,52 -42,94 -94,94l-47 0c-52,0 -94,-42 -94,-94l0 -438c0,-52 42,-94 94,-94zm-505 415c0,0 -101,25 -156,-69 -54,-94 -152,138 -65,203 87,65 199,123 366,62 167,-62 185,-192 181,-293 -4,-101 0,-424 0,-424 0,0 7,-91 -127,-91 -134,0 -112,134 -112,134l0 348c0,0 4,148 -87,130zm1036 -433c-193,0 -349,147 -349,327 0,181 156,327 349,327 193,0 349,-147 349,-327 0,-181 -156,-327 -349,-327zm4 202c70,0 127,56 127,125 0,69 -57,125 -127,125 -70,0 -127,-56 -127,-125 0,-69 57,-125 127,-125zm-515 -470c73,0 132,51 132,114 0,63 -59,114 -132,114 -73,0 -132,-51 -132,-114 0,-63 59,-114 132,-114z" />
                <rect class="fil47 str0" x="4805" y="1258" width="1187" height="195" rx="98" ry="98" />
                <ellipse class="fil55 str0" cx="4219" cy="1410" rx="76" ry="72" />
            </g>
            </svg>

            <img class="iphoneScreen hidden" src="" alt="">

        </div>
        <div class="appInfo">
            <div class="appIconShadow white-border">
                <svg width="0" height="0">
                    <defs>
                        <clipPath id="shape120">
                            <path id="shape" class="cls-1"
                                d="M6821,495.533v-4.281c0-1.2-.04-2.4-0.04-3.642a57.7,57.7,0,0,0-.68-7.882,26.144,26.144,0,0,0-2.48-7.483,25.115,25.115,0,0,0-11.04-11.044,26.118,26.118,0,0,0-7.49-2.481,47.28,47.28,0,0,0-7.88-.68c-1.2-.04-2.4-0.04-3.64-0.04h-53.5c-1.2,0-2.4.04-3.64,0.04a57.813,57.813,0,0,0-7.88.68,26.323,26.323,0,0,0-7.49,2.481,25.115,25.115,0,0,0-11.04,11.044,26.144,26.144,0,0,0-2.48,7.483,47.313,47.313,0,0,0-.68,7.882c-0.04,1.2-.04,2.4-0.04,3.642v53.5c0,1.2.04,2.4,0.04,3.641a57.7,57.7,0,0,0,.68,7.883,26.137,26.137,0,0,0,2.48,7.482,25.115,25.115,0,0,0,11.04,11.044,26.261,26.261,0,0,0,7.49,2.481,47.28,47.28,0,0,0,7.88.68c1.2,0.04,2.4.04,3.64,0.04h53.5c1.2,0,2.4-.04,3.64-0.04a57.654,57.654,0,0,0,7.88-.68,26.057,26.057,0,0,0,7.49-2.481,25.115,25.115,0,0,0,11.04-11.044,26.137,26.137,0,0,0,2.48-7.482,47.316,47.316,0,0,0,.68-7.883c0.04-1.2.04-2.4,0.04-3.641V495.533h0Z"
                                transform="translate(-6701 -458)" filter="url(#f1)" />
                        </clipPath>
                    </defs>
                </svg>
                ` + getIcon(app) + `
            </div>
            <div class="appNamePriceContainer">
                <h1 class="appName" data-locale="name">
                    ${app.display || getLocalized(app, 'name')}
                </h1>
                <h2 class="appPrice">
                    Free
                </h2>
            </div>
            <div class="appDescriptionContainer">
                ${getSummary(app)}
            </div>
            <div class="downloadButtonsContainer">
                <section class="app-badges" data-count="${getBadgeCount(app)}">` +
                    getKaiStoreButton(app) +
                    getJioStoreButton(app) +
                `</section>
            </div>
        </div>
        <section id="app-details">
        <div class="key-stats"><h3>App Statistics</h3>` +
        getDeveloperFragment(app.developer, app.developer_url) +
        `<p><u>Category</u>: <a href="/categories/${getCategoryName(app.category)}.html" title="${app.category}">${app.category}</a></p>` +
        ((isValidSize(app.size)) ? `<p><u>Size</u>: ${getSizeFragment(app.size)} ${((isValidSize(app.packaged_size)) ? '(' + getSizeFragment(app.packaged_size) + ' packaged)' : '')}</p>` : '') +
        `<p><u>Version</u>: ${app.version}</p>
        <p><u>Published</u>: ${getDateFragment(app.release_date, getLocale(app))}</p>
        ` + getKaiAdsDependency(app) + getKaiosPlatforms(app) +
        `<p><u>Type</u>: ${capitalizeFirstLetter(app.type)}</p>
        </div>` +
        ((app.recommendations && app.recommendations.length) ? `<section id="recommended-container"><h3>Recommended Apps</h3>` : '') +
        getRecommendedAppList(app.recommendations) + ((app.recommendations && app.recommendations.length) ? '</section>' : '') +
        `</section><footer>
        <p class="footerText center">Made with ❤ by <a href="https://barrasso.me" referrerPolicy="origin-when-cross-origin" rel="external noopener dns-prefetch">Tom Barrasso</a>. <span class="last-updated">Last updated <time>${getLastUpdated()}</time></span>.</p>
            <div class="footerLinks">
                <a href="https://kaios.app/" target="_self">KaiOS.app</a>
                <a href="https://kaios.dev" target="_self">KaiOS.dev</a>
                <a href="https://podlp.com">PodLP.com</a>
            </div>
        </footer>
    </div>
</div>
</div>` + getScreenshotScript(app) +
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
