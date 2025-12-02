import Database from 'better-sqlite3';
import fs, { readFileSync } from 'fs';
import path from 'path';
import { writeFile, cp } from 'fs/promises';
import { App, AppObject, CategoryPair, Device, Locale, SimpleApp, toApp } from './app-utils';
import { getCategoryName, getDeveloperUrlPath } from './gen-utils';
import { AppLayout } from './layout/NewAppLayout';
import { CategoriesLayout } from './layout/CategoriesLayout';
import { CategoryLayout } from './layout/CategoryLayout';
import { DeveloperLayout } from './layout/DeveloperLayout';
import { minify as uglify } from 'uglify-js';
import { Sitemap } from './layout/Sitemap';

const BASE_URL = 'https://kaios.app/';
const START = Date.now();

function makeOutputFolder(dir = 'gen') {
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
}

const args = process.argv;
const file = args[2];
const deviceFile = args[3];

if (!file || file.length === 0) {
    console.warn('Missing database input');
    process.exit(1);
}

if (!deviceFile || deviceFile.length === 0) {
    console.warn('Missing device file input');
}

const deviceFilePath = path.resolve(__dirname, deviceFile);
const deviceFileList = JSON.parse(fs.readFileSync(deviceFilePath, 'utf8')) as Device[];

const db = new Database(file, {
    fileMustExist: true,
    readonly: true,
});

function getApps() {
    const selectApp = db.prepare(`
        SELECT * FROM apps;
    `.trim());

    return selectApp.all();
}

function getApp(id: string) {
    const selectApp = db.prepare(`
        SELECT * FROM apps WHERE id = @id;
    `.trim());

    return selectApp.get({ id });
}

function getLocales(id: string): Locale[] {
    const selectLocales = db.prepare(`
        SELECT * FROM locales WHERE id = @id;
    `.trim());

    return (selectLocales.all({ id }) as Locale[]);
}

function getRecommendationIds(id: string) {
    const selectRecommend = db.prepare(`
        SELECT recommendation_id FROM ymal WHERE id = @id;
    `.trim());

    return selectRecommend.all({ id });
}

function getShortApp(id: string): SimpleApp {
    const selectApp = db.prepare(`
        SELECT id, name, display, thumbnail_url, manifest_url, v3_manifest_url, jio_manifest_url
        FROM apps WHERE id = @id;
    `.trim());

    return (selectApp.get({ id }) as SimpleApp);
}

function getAppsInCategory(category: CategoryPair): SimpleApp[] {
    const selectApps = db.prepare(`
        SELECT id, name, display, thumbnail_url, manifest_url, v3_manifest_url, jio_manifest_url
        FROM apps WHERE category = @category COLLATE NOCASE
        ORDER BY priority ASC NULLS LAST, name ASC;
    `.trim());

    return (selectApps.all(category) as SimpleApp[]);
}

function getCategories(): CategoryPair[] {
    const selectApps = db.prepare(`
        SELECT category, COUNT(*) AS total
        FROM apps GROUP BY category
        ORDER BY category ASC;
    `.trim());

    return (selectApps.all() as CategoryPair[]);
}

const PODLP_ID = 'UxappJMyyWGDpPORzsyl';
const PODLP_ICON = 'https://podlp.com/img/logo.svg';
const PODLP_BUNDLE_ID = 'com.podlp.podlp';

function getRecommendedApps(): SimpleApp[] {
    const selectApps = db.prepare(`
    SELECT id, name, display, thumbnail_url, manifest_url, v3_manifest_url
    FROM apps WHERE id = '${PODLP_ID}'
    OR (recommended_index IS NOT NULL AND recommended_index > 0)
    ORDER BY recommended_index;
    `.trim());

    return (selectApps.all() as SimpleApp[]);
}

function getLatestApps(n = 10): SimpleApp[] {
    const selectApps = db.prepare(`
    SELECT * FROM apps ORDER BY release_date DESC LIMIT ${n};
    `.trim());

    return (selectApps.all() as SimpleApp[]);
}

function getDefaultLocale(app: AppObject): Locale | undefined {
    if (!(app && Array.isArray(app.locales))) {
        return undefined;
    }

    const defaultLocale = app.default_locale || 'en-US';
    return app.locales.find((locale) => locale.language === defaultLocale);
}

function replaceIconPodLP(appList: AppObject[] | SimpleApp[] | App[]) {
    const idx = appList.findIndex((app) => app.id === PODLP_ID);
    if (idx >= 0) {
        appList[idx].thumbnail_url = PODLP_ICON;
    }
    return appList;
}

function replaceBundlePodLP(appList: AppObject[] | App[]) {
    const idx = appList.findIndex((app) => app.id === PODLP_ID);
    if (idx >= 0) {
        appList[idx].bundle_id = PODLP_BUNDLE_ID;
    }
    return appList;
}

(async () => {
    const { minify } = await import("html-minifier-terser");
    const { default: Fuse } = await import("fuse.js");

    const apps = (getApps()) as App[];
    const latestApps = getLatestApps();
    const categories = getCategories();
    const recommendedApps = getRecommendedApps();
    replaceIconPodLP(apps);
    replaceIconPodLP(latestApps);
    replaceBundlePodLP(apps);
    replaceIconPodLP(recommendedApps);
    const allApps = apps
        .map(toApp)
        .map((app) => ({
            ...app,
            locales: getLocales(app.id),
            recommendations: getRecommendationIds(app.id)
                .map((o: any) => o.recommendation_id)
                .map(getShortApp),
        }))
        .map((app): AppObject => ({
            ...app,
            locale: getDefaultLocale(app),
        }));

    const appsByDeveloper = allApps
        .filter((app) => app.developer !== null && app.developer !== undefined && app.developer.length)
        .reduce((map: Map<string, Array<AppObject>>, app: AppObject): Map<string, Array<AppObject>> => {
            if (app.developer) {
                const developer = getDeveloperUrlPath(app.developer);
                if (map.has(developer)) {
                    map.get(developer)?.push(app);
                } else {
                    map.set(developer, [app]);
                }
            }
        return map;
    }, new Map());

    const categoryApps = categories.map((category) => ({
        ...category,
        apps: getAppsInCategory(category),
    }));
    categoryApps.map(({ apps }) => replaceIconPodLP(apps));

    const thumbnailPrefixes = [
        'https://storage.kaiostech.com/v3.0/files/app/',
        'https://storage.kai.jiophone.net/v2.0/files/app/',
    ];

    const appsToIndex = apps.map(({ display, name, summary, subtitle }) => ({
        name: display || name,
        summary: summary || subtitle,
    }));

    const searchIndex = Fuse.createIndex(['name', 'summary'], appsToIndex);
    const appSearchMap = apps.map(({ id, thumbnail_url }) => {
            const prefixIndex = thumbnailPrefixes.findIndex((prefix) => (thumbnail_url || '').startsWith(prefix));
            return ({
                id: id,
                icon: (prefixIndex >= 0) ? (thumbnail_url || '').substring(thumbnailPrefixes[prefixIndex].length) : thumbnail_url,
                pre: (prefixIndex >= 0) ? prefixIndex : undefined,
            })
        });

    const appLayouts = allApps.map((app) => ({ id: app.id, html: AppLayout(app) }));
    const categoryLayouts = CategoriesLayout(categories, recommendedApps, latestApps, apps.length, deviceFileList);
    const categoryAppLayouts = categoryApps.map(({ category, apps }) => ({ category, html: CategoryLayout(category, apps) }));
    const developerLayouts = Array.from(appsByDeveloper.entries()).map(([name, apps]) => ({ name, html: DeveloperLayout(apps)}));
    const sitemap = Sitemap(BASE_URL, categories, apps);
    const robots = `User-agent: *
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml`;

    const searchScript = uglify(readFileSync('./search.js').toString()).code;

    makeOutputFolder('./gen');
    makeOutputFolder('./gen/categories/');
    makeOutputFolder('./gen/apps/');
    makeOutputFolder('./gen/developers/');
    makeOutputFolder('./gen/devices/');

    const MINIFY_OPTS = {
        collapseWhitespace: true,
        removeComments: true,
        removeCommentsFromCDATA: true,
        removeEmptyAttributes: true,
    };

    const searchIndexFull = ({
        apps: appSearchMap,
        thumbnailPrefixes,
        index: searchIndex.toJSON(),
    });

    await Promise.all([
        cp('./img/', './gen/img/', { recursive: true }),
        cp('./site.css', './gen/site.css'),
        cp('./main.css', './gen/main.css'),
        cp(path.resolve(path.dirname(deviceFilePath), './device-imgs/'), './gen/devices/', { recursive: true }),
        writeFile('./gen/sitemap.xml', sitemap),
        writeFile('./gen/robots.txt', robots),
        writeFile('./gen/search.js', searchScript),
        writeFile('./gen/search-index.json', JSON.stringify(searchIndexFull)),
        minify(categoryLayouts, MINIFY_OPTS).then(html => writeFile('./gen/index.html', html)),
        ...categoryAppLayouts.map(async (o) => writeFile(`./gen/categories/${getCategoryName(o.category)}.html`, await minify(o.html, MINIFY_OPTS))),
        ...appLayouts.map(async (o) => writeFile(`./gen/apps/${o.id}.html`, await minify(o.html, MINIFY_OPTS))),
        ...developerLayouts.map(async (o) => writeFile(`./gen/developers/${o.name}.html`, await minify(o.html, MINIFY_OPTS))),
    ])
        .then(() => {
            const elapsedTime = Math.round((Date.now() - START) / 1000);
            const numFiles = appLayouts.length + categoryAppLayouts.length + developerLayouts.length + 5;
            console.log(`${numFiles} files written in ${elapsedTime}s.`);
        })
        .catch((e) => {
            console.error(e);
        });
})();
