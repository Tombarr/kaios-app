export type App = {
    id: string;
    name: string;
    summary?: string;
    display?: string;
    description?: string;
    subtitle?: string;
    version: string;
    bundle_id?: string;
    google_bundle_id?: string;
    developer?: string;
    developer_url?: string;
    manifest_url?: string;
    jio_manifest_url?: string;
    v3_manifest_url?: string;
    thumbnail_url?: string;
    background_url?: string;
    default_locale?: string;
    screenshots?: string;
    theme?: string;
    category: string;
    recommended_index?: number;
    type: string;
    size: number;
    packaged_size: number;
    paid: number;
    priority?: number;
    release_date: number;
    ad?: number;
    hidden?: number;
    silent?: number;
    cursor?: number;
    fullscreen?: number;
    package_path?: string;
    origin?: string;
    short_name?: string;
    start_url?: string;
    activities?: string;
    chrome?: string;
    permissions?: string;
    messages?: string;
    dependencies?: string;
}

export interface Locale {
	id: string;
	language: string;
	name: string;
	subtitle?: string;
	description?: string;
}

export interface ParsedApp {
    id: string;
    name: string;
    summary?: string;
    display?: string;
    description?: string;
    subtitle?: string;
    version: string;
    bundle_id?: string;
    google_bundle_id?: string;
    developer?: string;
    developer_url?: string;
    manifest_url?: string;
    jio_manifest_url?: string;
    v3_manifest_url?: string;
    thumbnail_url?: string;
    background_url?: string;
    default_locale?: string;
    screenshots?: string[];
    theme?: string;
    category: string;
    recommended_index?: number;
    type: string;
    size: number;
    packaged_size: number;
    paid: boolean;
    priority?: number;
    release_date: number;
    ad?: boolean;
    hidden?: boolean;
    silent?: boolean;
    cursor?: boolean;
    fullscreen?: boolean;
    package_path?: string;
    origin?: string;
    short_name?: string;
    start_url?: string;
    activities?: object;
    chrome?: object;
    permissions?: object;
    messages?: object;
    dependencies?: object;
}

export interface SimpleApp {
    id: string;
    name: string;
    display: string;
    manifest_url?: string;
    v3_manifest_url?: string;
    jio_manifest_url?: string;
    thumbnail_url?: string;
}

export interface AppObject extends ParsedApp {
	locales: Locale[];
    locale?: Locale;
	recommendation_ids?: string[];
    recommendations?: SimpleApp[];
}

export interface CategoryPair {
    category: string;
    total: number;
}

export type Device = {
    name: string;
    src: string;
}

export function getThumbnailUrl(app: AppObject | SimpleApp): string | null {
    // Majority case: it's already a URL
    const manifest_url = (app.manifest_url || app.v3_manifest_url || app.jio_manifest_url);
    if (!(app.thumbnail_url && manifest_url)) return null;
    if ( app.thumbnail_url.toLowerCase().startsWith('http')) {
        return app.thumbnail_url;
    }

    // Minority case: it's a relative URL
    try {
        const url = new URL(manifest_url);
        url.pathname = app.thumbnail_url;
        return url.toString();
    } catch (e) {
        return null;
    }
}

type LocalizedProperty = 'name' | 'subtitle' | 'description';
export const getLocalized = (app: AppObject, property: LocalizedProperty) => (app.locale) ? app.locale[property] : app[property];
export const getLocale = (app: AppObject) => ((app.locale) ? app.locale.language : app.default_locale) || 'en-US';

export function toApp(app: App): ParsedApp {
	return {
		...app,
		paid: Boolean(app.paid),
		ad: Boolean(app.ad),
		hidden: Boolean(app.hidden),
		silent: Boolean(app.silent),
		cursor: Boolean(app.cursor),
		fullscreen: Boolean(app.fullscreen),
		screenshots: (app.screenshots) ? JSON.parse(app.screenshots) : [],
		permissions: (app.permissions) ? JSON.parse(app.permissions) : null,
		dependencies: (app.dependencies) ? JSON.parse(app.dependencies) : null,
		chrome: (app.chrome) ? JSON.parse(app.chrome) : null,
		activities: (app.activities) ? JSON.parse(app.activities) : null,
		messages: (app.messages) ? JSON.parse(app.messages) : null,
	};
}

export const getDomain = (urlStr: string): string => {
	try {
		const url = new URL(urlStr);
		return url.protocol + '//' + url.host;
	} catch (e) {
		return urlStr;
	}
};
