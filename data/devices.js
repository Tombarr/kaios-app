
import process from 'process';
import 'dotenv/config';

import { load } from 'cheerio';
import { URL } from 'url';
import { writeFile } from 'fs/promises';
console.log(process.env.DEVICES_URL);

const url = new URL(process.env.DEVICES_URL + 'en/');
const IMG_DIR = './device-imgs/';

function getDevicePage() {
    return fetch(url, {
        headers: new Headers([
            ['Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'],
            ['Sec-Fetch-Dest', 'document'],
            ['Sec-Fetch-Mode', 'navigate'],
            ['Sec-Fetch-Site', 'none'],
            ['Sec-Fetch-User', '?1'],
            ['DNT', '1'],
        ])
    })
    .then((r) => r.text())
    .then((r) => load(r));
}

function getRelativeUrl(path) {
    const absUrl = new URL(process.env.DEVICES_URL);
    absUrl.pathname = path;
    return absUrl.toString();
}

async function saveDevices($) {
    const devices = [];

    $('.phone-list li').toArray().map((listItem) => {
        const $listItem = $(listItem);
        devices.push({
            name: $listItem.find('span.phone-name').text().trim(),
            src: getRelativeUrl(($listItem.find('.phone-image > img').attr('src') || '').split('#')[0].trim()),
        });
    });

    console.log(devices);

    return devices;
}

function getFileName(src) {
    const parts = src.split('/');
    return parts[parts.length - 1];
}

function toBuffer(arrayBuffer) {
    const buffer = Buffer.alloc(arrayBuffer.byteLength);
    const view = new Uint8Array(arrayBuffer);
    for (let i = 0, e = buffer.length; i < e; ++i) {
      buffer[i] = view[i];
    }
    return buffer;
  }

async function downloadImages(devices) {
    await Promise.all(
        devices.map(({ src }) => fetch(src, {
            headers: new Headers([
                ['Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'],
                ['Sec-Fetch-Dest', 'document'],
                ['Sec-Fetch-Mode', 'navigate'],
                ['Sec-Fetch-Site', 'cross-site'],
                ['Sec-Fetch-User', '?1'],
                ['DNT', '1'],
            ])
        })
        .then((r) => r.arrayBuffer())
        .then((r) => writeFile(IMG_DIR + getFileName(src), toBuffer(r))))
    );

    return devices;
}

function writeDevices(devices) {
    const localDevices = devices.map((device) => ({
        name: device.name,
        src: getFileName(device.src),
    }));

    return writeFile('./devices.json', JSON.stringify(localDevices));
}

getDevicePage()
    .then(saveDevices)
    .then(downloadImages)
    .then(writeDevices)
    .catch((e) => console.error(e));
