import { getObjectWithKeys, isEmpty } from './utils.js';

export const NON_PRINTING_SPACES = /[\u200B-\u200D\uFEFF]/ug;

/* @returns [Object] Object with keys for columns and null as the default value */
export function getDefaultObject(columns, defaultValue = null) {
    return columns.reduce((acc, col) => ({ ...acc, [col]: defaultValue }), { });
}

/* @returns [Object] With normalized string values */
function normalizeValues(object) {
    return Object.fromEntries(
        Object.entries(object)
            .map(([key, value]) => [key, (value) ? value.trim().normalize('NFC').replace(NON_PRINTING_SPACES, '') : value]),
    );
}

/* @returns [Array<Object>] Get array of locales objects */
export function getLocalesArray(localesObject, id) {
    if (localesObject === null || localesObject === undefined) {
        return [];
    }

    return Object.entries(localesObject)
        .map(([language, localeObject]) => normalizeValues({ ...localeObject, language, id }))
        .filter((locale) => !(isEmpty(locale.subtitle) && isEmpty(locale.description)));
}

/* @returns [String] KaiStore/ JioStore category name */
export function getCategoryName(category) {
    // Source: https://api.kaiostech.com/v3.0/categories
    const categories = new Map([
        [110, 'Education'],
        [130, 'Premium'],
        [30, 'Social'],
        [10, 'Games'],
        [60, 'Utilities'],
        [70, 'Lifestyle'],
        [50, 'News'],
        [40, 'Shopping'],
        [20, 'Entertainment'],
        [80, 'Health'],
        [90, 'Sports'],
        [100, 'Books/Reference'],
    ])
    return (categories.has(category) ? categories.get(category) : `${category}`);
}

/* @returns [String] Get URL of the largest available icon */
export function getLargestIcon(iconObj) {
    if (!iconObj || Object.keys(iconObj).length === 0) {
        return null;
    }

    const entries = Object.entries(iconObj)
        .map(([size, url]) => [Number.parseInt(size, 10), url]);
    const largestEntry = entries.reduce(([maxSize, maxUrl], [size, url]) => (size > maxSize) ? [size, url] : [maxSize, maxUrl], entries[0]);
    return largestEntry[1];
}

/* @returns [String] Return a secure HTTPS URL */
function makeSecure(urlStr) {
    if (isEmpty(urlStr)) {
        return null;
    }

    try {
        const hasHttp = urlStr.toLowerCase().startsWith('http');
        let url = new URL((hasHttp) ? urlStr : 'https://' + urlStr);
        if (url.protocol === 'http:') {
            url.protocol = 'https:';
        }
        return url.toString();
    } catch (e) {
        console.warn(`${e.name}: ${urlStr}`);
    }

    return urlStr;
}

export function getAbsolutePathResource(manifestUrl, pathname) {
    try {
        const url = new URL(manifestUrl);
        url.pathname = pathname;
        if (url.protocol === 'http:') {
            url.protocol = 'https:';
        }
        return url.toString();
    } catch (e) {
        if (manifestUrl) {
            console.warn(e.name, manifestUrl, e.message);
        }
        return pathname;
    }
}

/* @returns [Object] App object to insert into database */
export function getAppStoreObject(app, columns, osVersion = 2, isJio = false) {
    const appObj = getObjectWithKeys(app, columns);
    const icons = app.icons || { };
    const bgs = app.bgs || { };

    appObj.thumbnail_url = getLargestIcon(icons) || null;
    appObj.background_url = getLargestIcon(bgs) || null;

    // Fix relative path icons
    if (appObj.thumbnail_url && !appObj.thumbnail_url.toLowerCase().startsWith('http')) {
        if (app.manifest_url) {
            appObj.thumbnail_url = getAbsolutePathResource(app.manifestUrl, appObj.thumbnail_url);
        }
    }

    // Use HTTPS only
    if (appObj.thumbnail_url) {
        appObj.thumbnail_url = makeSecure(appObj.thumbnail_url);
    }

    // App store status
    if (app.status) {
        appObj.status = Number.parseInt(app.status, 10);
    }

    if (Array.isArray(appObj.screenshots)) {
        appObj.screenshots = JSON.stringify(appObj.screenshots || []);
    } else if (appObj.screenshots && typeof appObj.screenshots === 'object') {
        // Map, i.e. "qRAT4N8bJdCTuopm2ZDH": "https://storage.kaiostech.com/v3.0/files/app/j/uzJq1lizCr3yDxBIyayCxh4ZL0RsLVf66d8rBW/SCREENSHOT_IMAGE.png"
        appObj.screenshots = JSON.stringify(Object.values(appObj.screenshots) || []);
    }

    // null strings will get trimmed away before insertion
    appObj.permissions = JSON.stringify(app.permissions);
    appObj.activities = JSON.stringify(app.activities);
    appObj.chrome = JSON.stringify(app.chrome);
    appObj.messages = JSON.stringify(app.messages);
    appObj.locales = JSON.stringify(app.locales);
    appObj.inputs = JSON.stringify(app.inputs);

    // KaiOS dependencies, mainly ads-sdk
    if (app.dependencies) {
        appObj.dependencies = JSON.stringify(app.dependencies);
    }

    // Save locales for a separate table
    appObj.locales = app.locales;

    // Save separate details for JioStore apps
    const isJioApp = (app.manifest_url || '').toLowerCase().includes('jiophone.net') || isJio;
    const isKaiOS3 = (osVersion >= 3);
    if (isJioApp) {
        delete appObj.bundle_id;
        appObj.manifest_url = null;
        appObj.jio_manifest_url = app.manifest_url;
    } else if (isKaiOS3) {
        appObj.manifest_url = null;
        appObj.v3_manifest_url = app.manifest_url;
    }

    // JioStore uses category IDs, KaiStore uses category names
    if (typeof appObj.category === 'number') {
        appObj.category = getCategoryName(appObj.category);
    }

    // Manifest-derived developer info
    if (typeof app.developer === 'object') {
        appObj.developer = app.developer.name;
        appObj.developer_url = app.developer.url;
    }

    // Flip from HTTP to HTTPS
    if (appObj.developer_url) {
        appObj.developer_url = makeSecure(appObj.developer_url);
    }

    // Store APIs use created_at instead of release_date
    if (typeof app.created_at === 'number') {
        appObj.release_date = Math.round(app.created_at / 1000000) || 0; // ns to ms
    }

    appObj.name = appObj.name.trim().normalize('NFC').replace(NON_PRINTING_SPACES, '');

    if (appObj.theme) {
        appObj.theme = appObj.theme.trim().toUpperCase(); // Hex color strings
    }
    if (appObj.short_name) {
        appObj.short_name = appObj.short_name.trim().normalize('NFC').replace(NON_PRINTING_SPACES, '');
    }
    if (appObj.description) {
        appObj.description = appObj.description.trim().normalize('NFC').replace(NON_PRINTING_SPACES, '');
    }
    if (appObj.summary) {
        appObj.summary = appObj.summary.trim().normalize('NFC').replace(NON_PRINTING_SPACES, '');
    }
    return appObj;
}