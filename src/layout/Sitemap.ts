import { App, AppObject, CategoryPair } from "../app-utils"
import { getCategoryName, getDeveloperUrlPath } from "../gen-utils";

const NOW = new Date();
const LASTMOD = NOW.toISOString().split('T')[0];

const getCategoryPages = (baseUrl: string, categories: CategoryPair[]) => categories.map(({ category }) => `
    <url>
        <loc>${baseUrl}/categories/${getCategoryName(category)}.html</loc>
        <lastmod>${LASTMOD}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.6</priority>
    </url>`.trim()).join('\n    ');

const getAppPages = (baseUrl: string, apps: AppObject[] | App[]) => apps.map((app) => `
    <url>
        <loc>${baseUrl}/apps/${app.id}.html</loc>
        <lastmod>${LASTMOD}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`.trim()).join('\n    ');

const getDeveloperPages = (baseUrl: string, apps: AppObject[] | App[]) => apps
    .map((app: AppObject | App) => ((!app.developer) ? '' : `
    <url>
        <loc>${baseUrl}/developers/${getDeveloperUrlPath(app.developer)}.html</loc>
        <lastmod>${LASTMOD}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`).trim()).join('\n    ');

export const Sitemap = (baseUrl: string, categories: CategoryPair[], apps: AppObject[] | App[]) => `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/siteindex.xsd"
    xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${baseUrl}</loc>
        <lastmod>${LASTMOD}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>\n    ` + getCategoryPages(baseUrl, categories) + '\n'
    + getDeveloperPages(baseUrl, apps) + '\n'
    + getAppPages(baseUrl, apps) + `
</urlset>`.trim();
