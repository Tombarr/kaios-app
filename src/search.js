document.addEventListener("DOMContentLoaded", () => {
    const FUSE_CONFIG = {
        keys: ['name', 'summary'],
        threshold: 0.3,
    };

    const IGNORE_KEYS = new Set(["Shift", "Escape", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"]);

    document.body.classList.remove('no-js');
    const input = document.getElementById('search');
    const suggestions = document.getElementById('suggestions');
    const searchContainer = document.querySelector('.search-container');

    let fuseIndex = null;
    let appList = null;
    let fusePromise = null;
    let fuseError = false;

    function getSearchIndex() {
        return fetch('/search-index.json')
            .then((r) => r.json())
            .then((fullIndex) => ({
                apps: fullIndex.apps.map((app) =>
                    ((app.pre === undefined) ? app : ({
                        id: app.id,
                        icon: fullIndex.thumbnailPrefixes[app.pre] + app.icon,
                    }))),
                index: fullIndex.index,
            }))
            .finally(() => {
                fusePromise = null;
            });
    }

    function appendScript(srciptSrc) {
        let exists = document.querySelector(`script[src="${srciptSrc}"]`);
        if (exists) {
            return Promise.resolve(null);
        }

        return new Promise((resolve, reject) => {
            let script = document.createElement('script');
            script.src = srciptSrc;
            script.type = 'text/javascript';
            script.addEventListener('error', reject);
            script.addEventListener('load', resolve);
            document.head.appendChild(script);
        });
    }

    function buildSearchIndex(fullIndex) {
        const documentList = fullIndex.index.records
            .map((o) => ({
                name: o.$[0].v,
                summary: (o.$[1] || {}).v
            }));
        const parsedIndex = Fuse.parseIndex(fullIndex.index);
        return new Fuse(documentList, FUSE_CONFIG, parsedIndex);
    }

    function getFuseSearchIndex() {
        console.log('getFuseSearchIndex');
        if (fuseIndex) {
            return Promise.resolve(fuseIndex);
        } else if (fusePromise) {
            return fusePromise;
        }

        fusePromise = getSearchIndex()
            .then((fullIndex) => {
                appList = fullIndex.apps;
                return fullIndex;
            })
            .then(buildSearchIndex)
            .then((newFuseIndex) => {
                fuseIndex = newFuseIndex;
                return newFuseIndex;
            });
    }

    function search(query) {
        console.log('search', query);
        return getFuseSearchIndex()
            .then(() => {
                const results = fuseIndex.search(query).map(({ refIndex, item }) => ({
                    name: item.name,
                    summary: item.summary,
                    icon: appList[refIndex].icon,
                    id: appList[refIndex].id,
                }));
                console.log(results);
                return results;
            })
    }

    let prevResults = [];

    const isNewResults = (newResults) => {
        if (prevResults.length !== newResults.length) {
            return true;
        }

        return (JSON.stringify(prevResults) !== JSON.stringify(newResults));
    };

    const makeSearchResultFragment = (results) => {
        return results.reduce((frag, app) => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = `/apps/${app.id}.html`;
            a.title = app.name;

            if (app.icon) {
                const img = document.createElement('img');
                img.draggable = false;
                img.loading = 'lazy';
                img.referrerPolicy = 'no-referrer';
                img.width = 52;
                img.height = 52;
                img.src = app.icon;
                img.alt = app.name;
                a.appendChild(img);
            }

            const h4 = document.createElement('h4');
            h4.textContent = app.name;
            a.appendChild(h4);

            const span = document.createElement('span');
            if (app.summary) {
                span.textContent = app.summary;
            }
            a.appendChild(span);

            li.appendChild(a);
            frag.appendChild(li);
            return frag;
        }, document.createDocumentFragment());
    };

    function displayResults(results) {
        if (!isNewResults(results)) {
            return false;
        }
        prevResults = results;

        const ol = document.createElement('ol');
        const frag = makeSearchResultFragment(results);

        ol.appendChild(frag);
        suggestions.replaceChild(ol, suggestions.firstChild);

        if (results.length === 0) {
            suggestions.classList.add('no-results');
        } else {
            suggestions.classList.remove('no-results');
        }
    }

    function loadSearchScripts() {
        console.log('loadSearchScripts');
        appendScript('https://cdn.jsdelivr.net/npm/fuse.js/dist/fuse.js')
            .then(getFuseSearchIndex)
            .catch((e) => {
                console.warn(e);
                fuseError = true;
            });
    }

    input.addEventListener('focus', function onSearchFocus() {
        requestAnimationFrame(loadSearchScripts);
        input.removeEventListener('focus', onSearchFocus);
    });

    function getKeyboardFocusableElements(element = document) {
        return Array.from(element.querySelectorAll(
            'a[href], button, input, textarea, select, details,[tabindex]:not([tabindex="-1"])'
        ))
        .filter((el) => (
            !el.hasAttribute('disabled') &&
            !el.getAttribute('aria-hidden')
        ));
    }

    const moveFocus = (direction = 1, element = document) => {
        const focused = document.activeElement;
        const focusable = getKeyboardFocusableElements(element);

        const focusedIndex = focusable.findIndex((el) => el.isEqualNode(focused));
        const nextFocus = focusable[focusedIndex + direction];

        console.log('moveFocus', direction, focused, focusable, focusedIndex, nextFocus);

        if (nextFocus) {
            nextFocus.focus();
        }
    };

    searchContainer.addEventListener('keyup', (e) => {
        console.log('searchContainer keyup', e.key);
        switch (e.key) {
            case 'ArrowUp':
                moveFocus(-1, searchContainer);
                return true;
            case 'ArrowDown':
                moveFocus(1, searchContainer);
                return true;
        }
    });

    input.addEventListener('keyup', (e) => {
        const query = e.currentTarget.value;
        console.log('input keyup', e.key, query, fuseError);

        if (IGNORE_KEYS.has(e.key)) {
            return false;
        }

        if (query.length < 3 || fuseError) {
            displayResults([]);
        } else {
            requestAnimationFrame(() => {
                search(query)
                    .then(displayResults);
            });
        }
    });

    Array.from(document.images)
        .forEach((img) => { img.onerror = () => img.parentNode.removeChild(img) });
});