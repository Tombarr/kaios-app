
import { URL } from 'url';
import { printProgress, fetchWithRetry } from './utils.js';
import { config } from './config.js';

/* @return [Object] JioStore app manifest content */
export async function getJioManifest(manifestUrl, curef = config.jioStore.curef) {
    // Note: some manifest URLs might be external (not api.kai.jiophone.net)
    let url = new URL(manifestUrl);
    url.searchParams.append('cu', curef);
    const resp = await fetchWithRetry(url, {
        headers: {
            // Without UA, returns 400 "Invalid filter query params: Missing Platform/OS in headers"
            'User-Agent': config.jioStore.userAgent,
        },
    });
    return resp.json();
}

/* @return [Object] Full app object, merged with manifest */
async function mergeJioManifest(app) {
    if (!app.manifest_url) {
        return app;
    }

    try {
        let appManifest = await getJioManifest(app.manifest_url);
        let combinedApp = {
            ...appManifest,
            ...app,
        };
        combinedApp.version = appManifest.version; // Always the latest, esp for hosted apps
        return combinedApp;
    } catch (e) {
        console.warn('\n', e.name, app.manifest_url);
    }

    return app;
}

/* @returns [Array<Object>] Get all apps on the JioStore */
export async function getAllJioStoreApps(curef = config.jioStore.curef) {
    let url = new URL(config.jioStore.baseUrl);
    url.searchParams.append('cu', curef);
    const resp = await fetchWithRetry(url, {
        headers: {
            // Without UA, returns 400 "Invalid filter query params: Missing Platform/OS in headers"
            'User-Agent': config.jioStore.userAgent,
        },
    });
    const respObj = await resp.json();
    return respObj.apps;
}

/* @returns [Array<Object>] Get all apps on the JioStore, with manifest details */
export function getDetailedJioStoreApps(curef = config.jioStore.curef) {
    console.log(`Fetching JioStore apps for ${curef}.`);

    return getAllJioStoreApps(curef)
        .then((apps) => {
            console.log(`Fetched ${apps.length} apps.`);
            let successCount = 0, errorCount = 0;
            return Promise.all(
                apps.map((app) => mergeJioManifest(app)
                    .then((app) => {
                        successCount += 1;
                        return app;
                    })
                    .catch((e) => {
                        errorCount += 1;
                        return Promise.reject(e);
                    })
                    .finally(() => {
                        const remaining = apps.length - (successCount + errorCount);
                        const percent = Number.parseFloat(((successCount + errorCount) / apps.length) * 100).toFixed(1);
                        printProgress(`${percent}% complete: ${successCount} succeeded, ${errorCount} errors, ${remaining} remaining.`);
                    })
                )
            );
        });
}
