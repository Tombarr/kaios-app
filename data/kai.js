
import { URL } from 'url';
import { printProgress, fetchWithRetry } from './utils.js';
import { config } from './config.js';

/* @returns [Object] Get a single page of apps on the KaiStore */
export async function getKaiStoreApps(page = 1, size = 100) {
    const url = new URL(config.kaiStore.marketingUrl);
    url.searchParams.append('page', page);
    url.searchParams.append('size', size);
    const response = await fetchWithRetry(url, {
        headers: {
            'x-api-key': config.kaiStore.apiKey,
        },
    });
    return response.json();
}

/* @returns [Object] Get app details from the KaiStore's GraphQL API */
async function getGraphResponse(payload, version, locale, curef) {
    const url = new URL(config.kaiStore.graphUrl);
    url.searchParams.append('locale', locale);
    url.searchParams.append('imei', config.device.imei);
    url.searchParams.append('platform', version);
    url.searchParams.append('curef', curef);
    url.searchParams.append('mcc', 'null');
    url.searchParams.append('mnc', 'null');
    const response = await fetchWithRetry(url, {
        method: 'POST',
        body: payload,
        headers: {
            'Content-Type': 'text/plain',
            'Origin': 'https://kaios-plus.kaiostech.com',
            'x-api-key': config.kaiStore.graphApiKey,
        },
    });
    return response.json();
}

/* @returns [Object] Get app details from the KaiStore's GraphQL API */
export async function getAppDetails(id, version = '2.5.4', locale = 'en-US', curef = 'null') {
    const payload = `query {
        getApp(manifest_url:"https://api.kaiostech.com/apps/manifest/${id}") {
        id,
        name,
        theme,
        version,
        packaged_size,
        icons {size_56,size_128},
        create_at,
        default_locale,
        display,
        manifest_url,
        bgs {size_240},
        bundle_id,
        paid,
        supported_platforms,
        developer {name,url},
        locales {en_US {name,subtitle,description}, default {name,subtitle,description}},
        description,
        type,
        default_locale,
        product_id,
        category_list
      , ymal {recommendation_id, is_sponsored,
        id,
        name,
        theme,
        version,
        packaged_size,
        icons {size_56,size_128},
        create_at,
        default_locale,
        display,
        manifest_url,
        bgs {size_240},
        bundle_id,
        paid,
        supported_platforms,
        developer {name,url},
        locales {en_US {name,subtitle,description}, default {name,subtitle,description}},
        description,
        type,
        default_locale,
        product_id,
        category_list
      }}
    }`;
    const responseJson = await getGraphResponse(payload, version, locale, curef);
    return responseJson.data.getApp;
}

/* @returns [Array<String>] Get You Might Also Like (YAML) results (list of IDs) from the KaiStore's GraphQL API */
export async function getAppYaml(id, version = '2.5.4', locale = 'en-US', curef = 'null') {
    const payload = `query { getYmalApp(manifest_url:"https://api.kaiostech.com/apps/manifest/${id}") { id } }`;
    const responseJson = await getGraphResponse(payload, version, locale, curef);
    return responseJson.data.getYmalApp.map(({ id }) => id);
}

/* @returns [Array<Number>] Get an array from 2 to max */
const getPageArray = (max) => Array(max - 1).fill(null).map((_, i) => i + 2);

/* @returns [Array<Object>] Get all apps on the KaiStore */
export async function getAllKaiStoreApps() {
    console.log('Fetching apps from marketingappsearch.kaiostech.com');
    // Get first page of apps
    let firstPageResponse = await getKaiStoreApps();
    let pages = 1;
    printProgress(`${pages} of ${firstPageResponse.total_pages} pages fetched.`);

    // Get all pages of apps
    let pageResponses = await Promise.all(
        getPageArray(firstPageResponse.total_pages)
            .map((page) => getKaiStoreApps(page)
                .then((page) => {
                    pages += 1;
                    printProgress(`${pages} of ${firstPageResponse.total_pages} pages fetched.`);
                    return page
                }))
    );
    pageResponses.unshift(firstPageResponse);

    return pageResponses.map(({ data }) => data).flat();
}
