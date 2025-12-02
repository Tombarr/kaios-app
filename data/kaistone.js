
import Requester from './kaistone-requester.js';
import { config } from './config.js';

const requesters = new Map();
const requesterPromises = new Map();

/* @returns [Promise<Object>] Kaistone Requester for a given version */
async function getRequester(version = '2.5.4') {
    if (requesters.has(version)) {
        return requesters.get(version);
    } else if (requesterPromises.has(version)) {
        return requesterPromises.get(version);
    }

    const promise = (async () => {
        const devSettings = {
            ...config.device,
            version,
            ua: `${config.device.ua} KAIOS/${version}`
        };
        const requester = new Requester(config.kaiStore.auth, config.api, devSettings);
        await requester.init();
        requesters.set(version, requester);
        requesterPromises.delete(version);
        return requester;
    })();

    requesterPromises.set(version, promise);
    return promise;
}

/* @returns [Object] Object containing a list of apps from the KaiStore */
export function sendKaiStoreRequest({ method, path, data, version = '2.5.4' }) {
    return getRequester(version)
        .then((requestor) => requestor.send({
            method: method,
            path: path,
            data: data,
            type: 'json'
        }));
}

/* @returns [Array<Object>] List of apps from the KaiStore */
export function getKaiStoreApps(version = '2.5.4') {
    return sendKaiStoreRequest({ method: 'GET', path: '/v3.0/apps', version })
        .then((r) => r.apps);
}

/* @returns [Array<Object>] List of KaiStore Recommended apps */
export function getRecommendedKaiStoreApps(version = '2.5.4', locale = 'en-US') {
    return sendKaiStoreRequest({
        method: 'GET',
        version,
        path: `/kc_ksfe/v1.0/apps/combo?link=true&bookmark=true&defaultServiceId=0&page_num=1&page_size=15&locale=${locale}`
    }).then((r) => r.recommended);
}
