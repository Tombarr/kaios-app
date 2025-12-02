
import process from 'process';

// Ensure critical variables are loaded
const requiredEnvVars = [
    'KAI_API_KEY',
    'KAI_GRAPH_API_KEY',
    'KAI_AUTH_KEY',
    'JIO_CUREF',
    'JIO_UA',
    'DEVICE_IMEI',
    'DEVICE_MCC',
    'DEVICE_MNC',
    'DEVICE_MODEL',
    'DEVICE_BRAND',
    'DEVICE_UA',
    'DEVICE_CU'
];

const missingVars = requiredEnvVars.filter(key => !process.env[key]);
if (missingVars.length > 0) {
    // We don't throw error immediately here because dotenv might be loaded in the entry file,
    // but this file might be imported before dotenv config runs if not careful.
    // However, usually config is imported after dotenv.
    // For safety in this specific refactor, we will rely on the entry point loading dotenv.
    console.warn(`Warning: Missing environment variables: ${missingVars.join(', ')}`);
}

export const config = {
    kaiStore: {
        apiKey: process.env.KAI_API_KEY,
        graphApiKey: process.env.KAI_GRAPH_API_KEY,
        marketingUrl: 'https://marketingappsearch.kaiostech.com/v1.0/apps',
        graphUrl: 'https://api.store.kaiostech.com/graphql',
        auth: {
            method: 'api-key',
            key: process.env.KAI_AUTH_KEY,
        }
    },
    jioStore: {
        baseUrl: 'https://api.kai.jiophone.net/v2.0/apps',
        curef: process.env.JIO_CUREF,
        userAgent: process.env.JIO_UA,
    },
    device: {
        imei: process.env.DEVICE_IMEI,
        mcc: process.env.DEVICE_MCC,
        mnc: process.env.DEVICE_MNC,
        model: process.env.DEVICE_MODEL,
        brand: process.env.DEVICE_BRAND,
        type: 999999,
        ua: process.env.DEVICE_UA,
        cu: process.env.DEVICE_CU,
        os: 'KaiOS',
    },
    api: {
        app: {
            id: process.env.APP_ID,
            name: 'KaiOS Plus',
            ver: '2.5.4'
        },
        server: {
            url: 'https://api.kaiostech.com'
        },
        ver: '3.0'
    }
};
