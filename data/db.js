
import Database from 'better-sqlite3';
import { getAppStoreObject, getDefaultObject, getLocalesArray } from './shared.js';
import { isBoolean, toBooleanNumber, isEmpty } from './utils.js';

let db;

export function initDb(filename = ':memory:') {
    db = new Database(filename);
    db.pragma('journal_mode = WAL;');
    db.pragma('foreign_keys = ON;');

    const createAppsTable = db.prepare(`
    CREATE TABLE IF NOT EXISTS apps (
        id VARCHAR(20) NOT NULL PRIMARY KEY CHECK (length(id) <= 20),
        name VARCHAR NOT NULL CHECK (length(name) > 0),
        summary VARCHAR,
        display VARCHAR,
        description VARCHAR,
        subtitle VARCHAR,
        version VARCHAR NOT NULL,
        bundle_id VARCHAR,
        google_bundle_id VARCHAR,
        developer VARCHAR,
        developer_url VARCHAR,
        manifest_url VARCHAR,
        jio_manifest_url VARCHAR,
        v3_manifest_url VARCHAR,
        thumbnail_url VARCHAR,
        background_url VARCHAR,
        default_locale VARCHAR,
        screenshots VARCHAR,
        theme VARCHAR(7) CHECK (length(theme) <= 7),
        category VARCHAR,
        recommended_index INTEGER CHECK (recommended_index >= 0 OR recommended_index IS NULL),
        type VARCHAR(10) NOT NULL CHECK (length(type) <= 10),
        size INTEGER CHECK (size IS NULL OR size >= 0),
        packaged_size INTEGER CHECK (packaged_size IS NULL OR packaged_size >= 0),
        paid BOOLEAN CHECK (paid IN (NULL, 0, 1)),
        priority INTEGER CHECK (priority >= 0 OR priority IS NULL),
        status INTEGER CHECK (status >= 0 OR status IS NULL),
        release_date INTEGER NOT NULL CHECK (release_date >= 0),
        ad BOOLEAN CHECK (ad IN (NULL, 0, 1)),
        hidden BOOLEAN CHECK (hidden IN (NULL, 0, 1)),
        silent BOOLEAN CHECK (silent IN (NULL, 0, 1)),
        cursor BOOLEAN CHECK (cursor IN (NULL, 0, 1)),
        fullscreen BOOLEAN check (fullscreen IN (NULL, 0, 1)),
        package_path VARCHAR,
        origin VARCHAR,
        short_name VARCHAR,
        start_url VARCHAR,
        activities VARCHAR,
        chrome VARCHAR,
        permissions VARCHAR,
        messages VARCHAR,
        dependencies VARCHAR,
        inputs VARCHAR,
        CHECK (
            manifest_url IS NOT NULL OR
            jio_manifest_url IS NOT NULL OR
            v3_manifest_url IS NOT NULL
        )
    );`.trim());

    const createLocalesTable = db.prepare(`
    CREATE TABLE IF NOT EXISTS locales (
        id VARCHAR(20) NOT NULL CHECK (length(id) <= 20),
        language VARCHAR NOT NULL,
        name VARCHAR NOT NULL,
        subtitle VARCHAR,
        description VARCHAR,
        FOREIGN KEY(id) REFERENCES apps(id),
        UNIQUE(id, language),
        UNIQUE(name, subtitle, description)
    );`.trim());

    const createYmalTable = db.prepare(`
    CREATE TABLE IF NOT EXISTS ymal (
        id VARCHAR(20) NOT NULL CHECK (length(id) <= 20),
        recommendation_id VARCHAR(20) NOT NULL CHECK (length(id) <= 20),
        CHECK(id != recommendation_id),
        FOREIGN KEY(id) REFERENCES apps(id),
        FOREIGN KEY(recommendation_id) REFERENCES apps(id),
        UNIQUE(id, recommendation_id)
    );`.trim());

    createAppsTable.run();
    createLocalesTable.run();
    createYmalTable.run();
    
    return db;
}

export function getDb() {
    if (!db) {
        throw new Error('Database not initialized');
    }
    return db;
}

export function closeDb() {
    if (db) {
        db.close();
        db = null;
    }
}

/* @returns [Array<String>] Get list of columns in table */
function getColumns(table, attr = 'name') {
    return db.pragma(`table_info(${table})`).map((obj) => obj[attr]);
}

/* @return [Object] Get KaiOS app object, with defaults, for DB insertion */
function getAppObject(appObj) {
    return Object.fromEntries(
        Object.entries(appObj)
            .map(([key, val]) => (isBoolean(val) ? [key, toBooleanNumber(val)] : [key, val]))
            .filter(([_, val]) => !isEmpty(val))
    );
}

const getBindNames = (cols) => cols.map((name) => ('@' + name)).join(', ').trim();
const getUpsertNames = (cols) => cols.map((name) => `${name} = excluded.${name}`).join(', ').trim();

/* Insert KaiOS apps into database */
export function insertStoreApps(apps, osVersion = 2, isJio = false) {
    if (!apps || apps.length === 0) {
        return apps;
    }

    const appColumns = getColumns('apps');
    const localeColumns = getColumns('locales');
    const defaultAppObject = getDefaultObject(appColumns);
    const defaultLocalesObject = getDefaultObject(localeColumns);

    // Ignore apps without an ID or Name
    const filteredApps = apps.filter((app) => app && app.id && app.name);

    const insertMany = db.transaction((filteredApps) => {
        for (const app of filteredApps) {
            const appObj = getAppObject(getAppStoreObject(app, appColumns, osVersion, isJio));
            const fullAppObj = { ...defaultAppObject, ...appObj };

            // Extract out locales
            const { locales } = appObj;
            delete fullAppObj.locales;
            delete appObj.locales;

            // SQLite UPSERT
            const insertAppStatement = db.prepare(`
                INSERT INTO apps VALUES (${getBindNames(Object.keys(fullAppObj))})
                ON CONFLICT(id) DO UPDATE SET ${getUpsertNames(Object.keys(appObj))};
            `.trim());

            try {
                insertAppStatement.run(fullAppObj);
            } catch (e) {
                console.warn(`Error inserting app ${appObj.id}.`);
                console.warn(e);
                if (e.code !== 'SQLITE_CONSTRAINT_NOTNULL') {
                    // process.exit(0); // Don't exit process in library code
                    throw e;
                }
            }

            // Insert locales into a separate table
            const localesArray = getLocalesArray(locales, appObj.id);
            for (const locale of localesArray) {
                const fullLocaleObj = { ...defaultLocalesObject, ...locale };
                const insertLocalesStatement = db.prepare(`
                    INSERT OR REPLACE INTO locales VALUES (${getBindNames(Object.keys(fullLocaleObj))});
                `.trim());

                try {
                    insertLocalesStatement.run(fullLocaleObj);
                } catch (e2) {
                    console.warn(`Error inserting locale ${appObj.id}, ${locale.language}.`);
                    console.warn(e2);
                }
            }
        }
    });

    insertMany(filteredApps);

    return filteredApps;
}

export function insertYmalRecommendations(id, recommended_ids) {
    const insertMany = db.transaction((recommended_ids) => {
        for (const recommended_id of recommended_ids) {
            // SQLite UPSERT
            const insertYmalStatement = db.prepare(`INSERT OR IGNORE INTO ymal VALUES (@id, @recommended_id);`.trim());

            try {
                insertYmalStatement.run({ id, recommended_id });
            } catch (e) {
                // Ignore bad IDs like RUP-Kznhau9Id7UGc9ck
                if (e.code !== 'SQLITE_CONSTRAINT_FOREIGNKEY') {
                    console.warn(`Error inserting ymal ${id} -> ${recommended_id}.`);
                    console.warn(e);
                }
            }
        }
    });

    return insertMany(recommended_ids);
}

export function getAllKaiStoreAppIds() {
    return db.prepare(`SELECT id, manifest_url, v3_manifest_url FROM apps WHERE (manifest_url IS NOT NULL OR v3_manifest_url IS NOT NULL);`).all();
}

/* returns [Array<String>] Get list of app paths missing a thumbnail */
export function getAppsMissingThumbnail() {
    return db.prepare(`
        SELECT id, manifest_url, v3_manifest_url, release_date
        FROM apps
        WHERE thumbnail_url IS NULL AND
        (manifest_url IS NOT NULL or v3_manifest_url IS NOT NULL);`
    .trim()).all();
}

export function getRelativeThumbnails() {
    return db.prepare(`
        SELECT *
        FROM apps
        WHERE thumbnail_url NOT LIKE @prefix
        COLLATE NOCASE;
    `.trim()).all({ prefix: 'http%' });
}

export function updateApp(app) {
     const insertAppStatement = db.prepare(`
        INSERT INTO apps VALUES (${getBindNames(Object.keys(app))})
        ON CONFLICT(id) DO UPDATE SET ${getUpsertNames(Object.keys(app))};
    `.trim());
    insertAppStatement.run(app);
}

export function getDbBuffer() {
    return db.serialize();
}
