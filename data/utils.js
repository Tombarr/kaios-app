import { stdout } from 'process';

/* @returns [Object] Get object with a limited set of keys */
export function getObjectWithKeys(obj, keys) {
    return keys.reduce((acc, key) => ({ ...acc, ...((obj.hasOwnProperty(key)) ? { [key]: obj[key] } : { }) }), { })
}

/* @returns [Boolean] True if the value is a boolean */
export function isBoolean(val) {
    return (
        (val === false || val === true) ||
        (typeof val === 'string' && ['true', 'false'].includes(val.toLowerCase()))
    );
 }

/* @returns [Number] 1 if true, 0 if false */
export function toBooleanNumber(val) {
    if (typeof val === 'string') {
        return (val.toLowerCase() === 'true') ? 1 : 0;
    }

    return (val === true) ? 1 : 0;
}

const EMPTY_VALUES = new Set([
    null, undefined, 'null', 'undefined', '', '[]', '{}', NaN, 'none',
]);

/* @returns [Boolean] True if the value is empty */
export function isEmpty(val) {
    return EMPTY_VALUES.has(val);
}

export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchWithRetry(url, options = {}, retries = 3, backoff = 1000) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            // If 404, don't retry, just throw
            if (response.status === 404) {
                throw new Error(`HTTP 404: Not Found - ${url}`);
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response;
    } catch (error) {
        if (retries > 0) {
            console.warn(`Fetch failed for ${url}. Retrying in ${backoff}ms... (${retries} retries left) - ${error.message}`);
            await delay(backoff);
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        } else {
            throw error;
        }
    }
}

export function printProgress(msg = '') {
    if (typeof stdout.clearLine === 'function' && typeof stdout.cursorTo === 'function') {
        stdout.clearLine(0);
        stdout.cursorTo(0);
        stdout.write(msg);
    } else if (msg) {
        console.log(msg);
    }
}

export async function doAllSequentually(fnPromiseArr, delayMs = 1000) {
    const results = new Array(fnPromiseArr.length);
    for (let i = 0, e = fnPromiseArr.length; i < e; i++) {
        results[i] = await fnPromiseArr[i]();
        await delay(delayMs);
    }
    return results;
}

export async function throttledPromiseAll(fnPromise, MAX_IN_PROCESS = 5) {
    const results = new Array(fnPromise.length);

    async function doBlock(startIndex) {
      // Await the completion. If any fail, it will throw and that's good.
      const blockResults = await Promise.all(fnPromise.map((fn) => fn()));
      // Assuming all succeeded, copy the results into the results array
      for (let ix = 0; ix < blockResults.length; ix++) {
        results[ix + startIndex] = blockResults[ix];
      }
    }
  
    for (let iBlock = 0, e = fnPromise.length; iBlock < e; iBlock += MAX_IN_PROCESS) {
      await doBlock(iBlock);
    }
    return results;
};
