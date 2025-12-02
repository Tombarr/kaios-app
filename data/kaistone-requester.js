
/*
 * Copyright (C) 2021 Affe Null <affenull2345@gmail.com>
 * Refactored 2024, 2025
 */
import hawk from 'hawk';
import { fetchWithRetry } from './utils.js';

export default class Requester {
    constructor(auth, api, dev) {
        this.auth = auth;
        this.api = api;
        this.dev = dev;
        this.token = null;
    }

    async init() {
        switch (this.auth.method) {
            case 'api-key':
                try {
                    const token = await this.send({
                        method: 'POST',
                        data: {
                            brand: this.dev.brand,
                            device_id: this.dev.imei,
                            device_type: this.dev.type,
                            model: this.dev.model,
                            os: this.dev.os,
                            os_version: this.dev.version,
                            reference: this.dev.cu
                        },
                        path: '/v3.0/applications/' + this.api.app.id + '/tokens',
                        headers: {
                            'Authorization': 'Key ' + this.auth.key
                        },
                        type: 'json'
                    });
                    this.token = token;
                } catch (e) {
                    throw new Error(`Authentication failed: ${e.message}`);
                }
                break;
            case 'account':
                throw new Error('Login method not implemented');
            case 'token':
                this.token = {
                    kid: this.auth.kid,
                    mac_key: this.auth.key
                };
                break;
            default:
                throw new Error('Unknown authentication method: ' + this.auth.method);
        }
    }

    async send(req) {
        if (!req.path) throw new TypeError('request missing path');
        if (!req.method) throw new TypeError('request missing method');

        let url = req.path;
        if (url.startsWith('/')) {
            url = this.api.server.url + url;
        }

        const options = {
            method: req.method,
            headers: { ...req.headers },
        };

        const payload = ['POST', 'PUT'].includes(req.method) ? (
            (req.contentType && req.contentType !== 'application/json') ?
                req.data : JSON.stringify(req.data)
        ) : null;

        options.headers['Kai-API-Version'] = this.api.ver;
        options.headers['Kai-Request-Info'] =
            'ct="wifi", rt="auto", utc="' +
            Date.now() + '", utc_off="1", ' +
            'mcc="' + this.dev.mcc + '", ' +
            'mnc="' + this.dev.mnc + '", ' +
            'net_mcc="null", ' +
            'net_mnc="null"';
        options.headers['Kai-Device-Info'] =
            'imei="' + this.dev.imei + '", curef="' + this.dev.cu + '"';
        options.headers['User-agent'] = this.dev.ua;
        options.headers['Content-type'] = req.contentType || 'application/json';

        if (this.token) {
            const hawkinfo = {
                credentials: {
                    id: this.token.kid,
                    algorithm: 'sha256',
                    key: Buffer.from(this.token.mac_key, 'base64')
                }
            };
            if (payload) {
                hawkinfo.payload = payload;
                hawkinfo.contentType = req.contentType || 'application/json';
            }
            options.headers['Authorization'] =
                hawk.client.header(url, req.method, hawkinfo).header;
        }

        if (payload) {
            options.body = payload;
        }

        const response = await fetchWithRetry(url, options);

        if (req.type === 'json') {
            return await response.json();
        } else {
            return await response.text();
        }
    }
}
