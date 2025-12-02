
import 'dotenv/config';
import { writeFile } from 'fs/promises';
import { getDetailedJioStoreApps } from './jio.js';
import { getAllKaiStoreApps, getAppYaml } from './kai.js';
import { getKaiStoreApps, sendKaiStoreRequest, getRecommendedKaiStoreApps } from './kaistone.js';
import { doAllSequentually, printProgress, fetchWithRetry } from './utils.js';
import { getAbsolutePathResource } from './shared.js';
import { initDb, closeDb, insertStoreApps, insertYmalRecommendations, getAllKaiStoreAppIds, getAppsMissingThumbnail, getRelativeThumbnails, updateApp, getDbBuffer } from './db.js';

async function fixRelativeThumbnails() {
    try {
        const appsWithRelativeThumbnails = getRelativeThumbnails();
        console.log(`${appsWithRelativeThumbnails.length} apps with relative thumbnails`);
        let successCount = 0;
        appsWithRelativeThumbnails.map((app) => ({
                ...app,
                thumbnail_url: getAbsolutePathResource(app.manifest_url || app.v3_manifest_url, app.thumbnail_url),
            }))
            .forEach((app) => {
                try {
                    updateApp(app);
                    successCount += 1;
                } catch (e) {
                    console.warn(`Error re-inserting app ${app.id}.`, e);
                }
            });
        console.log(`${successCount} apps with relative thumbnails resolved.`);
    } catch (err) {
        console.warn('fixRelativeThumbnails', err);
    }
}

async function populateMissingThumbnails() {
    const appsMissingThumbnails = getAppsMissingThumbnail();
    const v2AppsMissingThumbnails = appsMissingThumbnails
        .filter(({ manifest_url }) => !!manifest_url)
        .filter(({ manifest_url, id }) => (new URL(manifest_url)).pathname.includes(id));
    const v3AppsMissingThumbnails = appsMissingThumbnails
        .filter(({ v3_manifest_url }) => !!v3_manifest_url)
        .filter(({ v3_manifest_url, id }) => (new URL(v3_manifest_url)).pathname.includes(id));
    const nonKaiStoreAppsMissingThumbnails = appsMissingThumbnails
        .filter(({ manifest_url, v3_manifest_url }) => !!(manifest_url || v3_manifest_url))
        .filter(({ manifest_url, v3_manifest_url, id }) => !(new URL(manifest_url || v3_manifest_url)).pathname.includes(id));

    console.log(`${appsMissingThumbnails.length} missing thumbnail.`);
    console.log(`${v2AppsMissingThumbnails.length} KaiOS 2.5, ${v3AppsMissingThumbnails.length} KaiOS 3.0`);
    console.log(`${nonKaiStoreAppsMissingThumbnails.length} non-KaiStore apps`);

    // Get KaiOS 2.5/3.0 apps missing thumbnail
    const fetchAppsMissingThumbnails = [...v2AppsMissingThumbnails, ...v3AppsMissingThumbnails]
        .map(({ manifest_url, v3_manifest_url, id, release_date }) => (() =>
            sendKaiStoreRequest({
                method: 'GET',
                path: (new URL(manifest_url || v3_manifest_url)).pathname,
                version: (v3_manifest_url) ? '3.0' : '2.5'
            })
                .then((appManifest) => ({
                    ...appManifest,
                    id,
                    manifest_url,
                    v3_manifest_url,
                    release_date,
                }))
                .catch((e) => console.warn(`Failed to fetch missing thumbnail for ${id}:`, e.message))
        ));

    // Get non-KaiStore apps missing thumbnails
    const fetchNonKaiStoreAppsMissingThumbnails = nonKaiStoreAppsMissingThumbnails
        .map(({ manifest_url, v3_manifest_url, id, release_date }) => (() =>
                fetchWithRetry(manifest_url || v3_manifest_url)
                    .then((r) => r.json())
                    .then((appManifest) => ({
                        ...appManifest,
                        id,
                        manifest_url,
                        v3_manifest_url,
                        release_date,
                    }))
                    .catch((e) => console.warn(e.name, id))
        ));

    const nonKaiApps = await Promise.all(fetchNonKaiStoreAppsMissingThumbnails.map((fn) => fn()));
    insertStoreApps(nonKaiApps.filter((app) => !!app), 3.0);

    const kaiApps = await doAllSequentually(fetchAppsMissingThumbnails);
    insertStoreApps(kaiApps.filter((app) => !!app), 2.5);
}

async function fetchAppRecommendations() {
    const ids = getAllKaiStoreAppIds();
    console.log(`Found ${ids.length} IDs on KaiStore.`);
    let successCount = 0;
    let errorCount = 0;
    
    return doAllSequentually(ids.map(({ id, manifest_url, v3_manifest_url }) => {
        return async () => {
            const promises = [];
            
            if (manifest_url) {
                promises.push(
                    getAppYaml(id, '2.5.4')
                    .then((recommended_ids) => {
                        insertYmalRecommendations(id, recommended_ids);
                        if (recommended_ids && recommended_ids.length) successCount++;
                        else errorCount++;
                    })
                    .catch(e => {
                        errorCount++;
                        if (e.name !== 'TypeError') console.warn(e.name, e.code);
                    })
                );
            }
            
            if (v3_manifest_url) {
                promises.push(
                    getAppYaml(id, '3.0')
                    .then((recommended_ids) => {
                        insertYmalRecommendations(id, recommended_ids);
                        if (!manifest_url) {
                           if (recommended_ids && recommended_ids.length) successCount++;
                           else errorCount++; 
                        }
                    })
                    .catch(e => {
                        if (!manifest_url) errorCount++;
                        if (e.name !== 'TypeError') console.warn(e.name, e.code);
                    })
                );
            }
            
            await Promise.all(promises);
            const percent = Number.parseFloat(((successCount + errorCount) / ids.length) * 100).toFixed(1);
            const remaining = ids.length - (successCount + errorCount);
            printProgress(`${percent}%, ${successCount} succeeded, ${errorCount} error, ${remaining} remaining of ${ids.length} total`);
        }
    }), 10);
}

async function main() {
    initDb();

    try {
        console.log('Starting data fetch...');

        // JioStore
        const jioApps = await getDetailedJioStoreApps();
        insertStoreApps(jioApps, 2.5, true);
        console.log(`Fetched ${jioApps.length} JioStore Apps - DONE`);

        // KaiStore 2.5
        const kai25Apps = await getKaiStoreApps('2.5.4');
        insertStoreApps(kai25Apps, 2);
        console.log(`Fetched ${kai25Apps.length} KaiStore 2.5 Apps - DONE`);

        // KaiStore 3.0
        const kai31Apps = await getKaiStoreApps('3.1');
        insertStoreApps(kai31Apps, 3);
        console.log(`Fetched ${kai31Apps.length} KaiStore 3.0 Apps - DONE`);

        // WebStore
        const webApps = await getAllKaiStoreApps();
        insertStoreApps(webApps);
        console.log(`Fetched ${webApps.length} WebStore Apps - DONE`);

        // Recommended 2.5
        const rec25Apps = await getRecommendedKaiStoreApps('2.5.4');
        insertStoreApps(rec25Apps, 2.5);
        console.log(`Fetched ${rec25Apps.length} KaiStore Recommended 2.5 Apps - DONE`);

        // Recommended 3.0
        const rec31Apps = await getRecommendedKaiStoreApps('3.1');
        insertStoreApps(rec31Apps, 3);
        console.log(`Fetched ${rec31Apps.length} KaiStore Recommended 3.0 Apps - DONE`);

        // Recommendations
        await fetchAppRecommendations();
        console.log('\nFetched app recommendations');

        // Fix thumbnails
        await populateMissingThumbnails();
        await fixRelativeThumbnails();

        // Save DB
        const buffer = getDbBuffer();
        console.log(`${buffer.byteLength / (1024 * 1024)}mb written.`);
        await writeFile(`apps-${Date.now()}.db`, buffer);
        await writeFile(`apps.db`, buffer); // Save as latest

        console.log('Done!');
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    } finally {
        closeDb();
    }
}

main();
