function startGameRoulette(fontBase64 = "") {
    const settingsKey = 'game-roulette.settings';
    const settings = {hltb: true, sound: true, winnerBanner: true, winnerLogo: true, hideWinnerIcon: false, collectionId: '', installed: false, neverPlayed: false};
    const showLegacyWinnerLogo = false;
    try {
        const saved = JSON.parse(window.localStorage.getItem(settingsKey));
        for (const key of Object.keys(settings)) {
            if (typeof saved?.[key] === typeof settings[key]) settings[key] = saved[key];
        }
    } catch {}

    function saveSettings() {
        try { window.localStorage.setItem(settingsKey, JSON.stringify(settings)); } catch {}
    }

    const attached = new WeakSet();
    const currentDialog = new WeakMap();
    const soundtrackCollectionId = 'type-music';
    const coverCache = new WeakMap();
    const pendingArtDetails = new Map();

    const styles = `
        .gr-roulette-item { flex: 0 0 auto; }
        :where(.gr-trigger) {
            display: inline-flex; align-items: center; justify-content: center;
            padding: 0; border: none; color: inherit; cursor: pointer;
        }
        .gr-trigger:focus-visible { outline: 1px solid currentColor; outline-offset: -2px; }
        .gr-glyph { position: relative; display: block; width: 32px; height: 32px; opacity: .78; }
        .gr-trigger:is(:hover, :focus-visible) .gr-glyph { opacity: 1; }
        .gr-glyph::before {
            content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 15px; height: 15px; border: 1.5px solid currentColor; border-radius: 3px;
            background: radial-gradient(circle at 28% 28%, currentColor 1px, transparent 1.4px),
                        radial-gradient(circle at 50% 50%, currentColor 1px, transparent 1.4px),
                        radial-gradient(circle at 72% 72%, currentColor 1px, transparent 1.4px);
        }
        .gr-collection-picker { position: relative; min-width: 0; max-width: min(36%, 210px); }
        .gr-collection-picker::after {
            content: ''; position: absolute; pointer-events: none;
            inset-block-start: 50%; inset-inline-end: 13px; width: 5px; height: 5px;
            border: solid currentColor; border-width: 0 1.5px 1.5px 0;
            transform: translateY(-70%) rotate(45deg);
        }
        .gr-collections {
            appearance: none; display: block; min-width: 0; max-width: 100%;
            padding: 5px 30px 5px 12px;
            color: inherit; background: var(--gr-inset); border: 1px solid var(--gr-border);
            border-radius: var(--gr-radius); font: inherit; color-scheme: dark;
        }
        .gr-dialog:focus, .gr-dialog :is(button, select, input):focus {
            outline: none !important;
        }
        .gr-dialog [hidden] { display: none !important; }
        .gr-dialog button:disabled { opacity: .45; cursor: default; }
        .gr-dialog {
            --gr-surface: var(--gd-glass, rgb(var(--st-background, 37, 42, 51)));
            --gr-inset: var(--gd-card, rgb(var(--st-color-1, 27, 32, 41)));
            --gr-ink: var(--gd-ink, #dcdedf);
            --gr-muted: var(--gd-ink-soft, #a5adbb);
            --gr-accent: var(--gd-accent, rgb(var(--st-accent-1, 102, 192, 244)));
            --gr-border: color-mix(in srgb, var(--gr-ink) 15%, transparent);
            --gr-radius: var(--st-border-radius, 4px);
            --gr-window-radius: max(14px, var(--gr-radius));
            --gr-cover-radius: max(7px, var(--gr-radius));
            width: min(820px, calc(100vw - 44px)); max-height: calc(100vh - 38px);
            box-sizing: border-box; margin: auto; padding: 0; overflow: auto; color: var(--gr-ink);
            border: 1px solid var(--gr-border); border-radius: var(--gr-window-radius);
            background: var(--gr-surface);
            box-shadow: 0 18px 60px #0008; font: 15px/1.4 "Motiva Sans", system-ui, sans-serif;
        }
        .gr-dialog::backdrop { background: rgb(0 0 0 / .62); }
        .gr-head, .gr-footer { padding: 19px 24px; }
        .gr-head { display: flex; align-items: center; gap: 12px; }
        .gr-head > div { flex: 1; min-width: 0; }
        .gr-head h2 { margin: 0; font: 400 30px/1.15 'Germania One', Georgia, serif; font-family: 'Germania One', Georgia, serif !important; }
        .gr-head p { color: var(--gr-muted); margin: 4px 0 0; overflow-wrap: anywhere; }
        .gr-head p:empty { display: none; }
        .gr-head .gr-close { flex: none; border: 0; border-radius: var(--gr-radius); color: inherit; background: transparent; font: 20px/1.2 system-ui, sans-serif; padding: 1px 7px; cursor: pointer; }
        .gr-head .gr-close:hover { background: var(--gr-border); }
        @media (max-width: 460px) {
            .gr-head { gap: 6px; padding-inline: 12px; }
            .gr-head h2 { font-size: 22px; }
            .gr-collections { font-size: 13px; }
        }
        .gr-field { position: relative; padding-block: 13px; background: var(--gr-inset); overflow: hidden; }
        .gr-reel {
            overflow: hidden;
            transition: filter 140ms ease-out;
            mask-image: linear-gradient(to right,
                transparent, rgb(0 0 0 / .28) 4%, rgb(0 0 0 / .68) 9%, rgb(0 0 0 / .93) 14%,
                black 18%, black 82%,
                rgb(0 0 0 / .93) 86%, rgb(0 0 0 / .68) 91%, rgb(0 0 0 / .28) 96%, transparent);
        }
        .gr-reel[data-spinning] { filter: blur(.45px); }
        .gr-track {
            position: relative; display: flex; align-items: center; width: max-content; min-height: 160px;
            gap: 9px; padding-block: 7px; will-change: transform;
        }
        .gr-card {
            box-sizing: border-box; flex: none; position: relative; display: grid; place-items: center;
            width: clamp(84px, 13vw, 112px); aspect-ratio: 2 / 3; overflow: hidden; margin: 0;
            border: 1px solid var(--gr-border); border-radius: var(--gr-cover-radius);
            background: var(--gr-surface); transform: scale(var(--gr-card-scale, 1));
        }
        .gr-cover-fallback {
            position: absolute; inset: 0; display: grid; grid-template-rows: 1fr auto; align-items: center;
            gap: 5px; padding: 9px 7px; text-align: center;
            background: radial-gradient(ellipse at 45% 20%, var(--gr-border), transparent 68%), var(--gr-inset);
        }
        .gr-cover-fallback b {
            margin: auto; display: grid; place-items: center; width: 58%; aspect-ratio: 1;
            color: var(--gr-accent); border: 1px solid var(--gr-border); border-radius: 50%;
            font: 400 27px/1 "Germania One", Georgia, serif;
        }
        .gr-cover-title {
            display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3;
            overflow: hidden; overflow-wrap: anywhere; font-size: 11px;
        }
        .gr-card.gr-card-wide img {
            inset-block: 0 auto; height: 72%; object-fit: contain;
        }
        .gr-card-wide .gr-cover-fallback b { visibility: hidden; }
        .gr-card img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .gr-card { transition: opacity 260ms ease; }
        .gr-track:has(.gr-winner) .gr-card:not(.gr-winner) { opacity: .52; }
        .gr-card.gr-winner {
            z-index: 1; border-color: var(--gr-accent);
            box-shadow: 0 0 12px color-mix(in srgb, var(--gr-accent) 65%, transparent);
            animation: gr-winner-glow 540ms ease-out;
        }
        .gr-pointer {
            position: absolute; z-index: 1; inset-block: 0; inset-inline-start: 50%; width: 0;
            pointer-events: none;
        }
        .gr-pointer::before, .gr-pointer::after {
            content: ''; position: absolute; left: -7px; border-inline: 7px solid transparent;
        }
        .gr-pointer::before { top: 0; border-top: 9px solid var(--gr-accent); }
        .gr-pointer::after { bottom: 0; border-bottom: 9px solid var(--gr-accent); }
        .gr-reel:has(.gr-winner) + .gr-pointer { animation: gr-pointer-flash 420ms ease-out; }
        @keyframes gr-winner-glow {
            from { box-shadow: 0 0 18px 2px color-mix(in srgb, var(--gr-accent) 82%, transparent); }
        }
        @keyframes gr-pointer-flash {
            from { filter: brightness(1.45) drop-shadow(0 0 5px var(--gr-accent)); }
        }
        .gr-footer {
            position: relative; isolation: isolate; display: flex; align-items: center;
            flex-wrap: wrap; gap: 12px 16px; padding-block-start: 25px;
        }
        .gr-footer::before {
            content: ''; position: absolute; z-index: -1; pointer-events: none;
            inset: 0 16% 0 0; background: var(--gr-winner-art, none) center 55% / cover;
            filter: blur(22px) saturate(2) brightness(.66); opacity: .55; clip-path: inset(0);
            mask-image: linear-gradient(to right, #000 28%, transparent 96%), linear-gradient(to bottom, #000 34%, transparent 100%);
            mask-composite: intersect;
        }
        .gr-footer[data-winner-banner]::before {
            inset: 0;
            background:
                linear-gradient(90deg, var(--gr-surface),
                    color-mix(in srgb, var(--gr-surface) 93%, transparent) 17%,
                    color-mix(in srgb, var(--gr-surface) 32%, transparent) 56%,
                    color-mix(in srgb, var(--gr-surface) 75%, transparent) 85%, var(--gr-surface)),
                linear-gradient(0deg, var(--gr-surface),
                    color-mix(in srgb, var(--gr-surface) 25%, transparent) 75%),
                var(--gr-winner-art) center 52% / cover no-repeat;
            filter: none; opacity: 1; mask-image: none;
        }
        .gr-footer > button.DialogButton { width: auto; min-inline-size: 88px; flex: 0 0 auto; border-radius: max(8px, var(--gr-radius)); }
        .gr-dialog .gr-footer > button.gr-spin.Primary {
            display: inline-flex; align-items: center; justify-content: center; gap: 7px;
            background: color-mix(in srgb, var(--gr-accent) 44%, var(--gr-surface)) !important;
            color: var(--gr-ink);
            box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--gr-accent) 55%, transparent);
        }
        .gr-dialog .gr-footer > button.gr-spin.Primary:hover:not(:disabled) {
            background: color-mix(in srgb, var(--gr-accent) 53%, var(--gr-surface)) !important;
        }
        .gr-spin-icon::before { content: '↻'; display: block; font: 18px/1 system-ui, sans-serif; }
        .gr-outcome {
            flex: 0 0 100%; min-width: 0; display: flex; align-items: center;
            flex-wrap: wrap; justify-content: space-between; gap: 4px 18px;
        }
        .gr-result { min-height: 25px; min-width: 0; margin: 0; flex: 1 1 16rem; overflow-wrap: anywhere; font-size: 15px; font-weight: 400; }
        .gr-times {
            display: flex; flex-wrap: wrap; gap: 6px 16px; margin: 0; max-inline-size: 100%;
            color: var(--gr-muted); font-size: 12px;
        }
        .gr-times strong { display: block; color: var(--gr-ink); font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; }
        @media (max-width: 600px) {
            .gr-outcome { display: grid; }
        }
        .gr-times-loading { display: inline-flex; align-items: center; gap: 6px; }
        .gr-times-loading::before {
            content: ''; inline-size: 9px; block-size: 9px;
            border: 1.5px solid var(--gr-border); border-top-color: var(--gr-accent);
            border-radius: 50%; animation: gr-times-spin 800ms linear infinite;
        }
        @keyframes gr-times-spin { to { transform: rotate(1turn); } }
        .gr-result[data-winner] {
            font: 400 24px/1.2 "Germania One", Georgia, serif;
            font-family: "Germania One", Georgia, serif !important;
            animation: gr-result-in 280ms ease-out;
        }
        .gr-result[data-winner][data-title-fallback] { font-family: Georgia, serif !important; }
        .gr-result[data-winner] sup { font-size: .54em; line-height: 0; }
        .gr-result:has(.gr-winner-icon) { display: flex; align-items: center; gap: 10px; }
        .gr-winner-icon { display: block; flex: none; inline-size: 32px; block-size: 32px; border-radius: 5px; object-fit: contain; }
        .gr-winner-name { min-inline-size: 0; font-family: inherit !important; }
        .gr-result:has(.gr-winner-logo) { display: grid; justify-items: start; gap: 2px; }
        .gr-result .gr-winner-caption {
            font: 400 18px/1.2 'Germania One', Georgia, serif;
            font-family: 'Germania One', Georgia, serif !important;
        }
        .gr-result[data-title-fallback] .gr-winner-caption { font-family: Georgia, serif !important; }
        .gr-winner-logo {
            display: block; position: relative; overflow: hidden; max-inline-size: 100%;
            filter: drop-shadow(0 2px 3px #0009);
        }
        .gr-winner-logo img { position: absolute; display: block; max-width: none; max-height: none; }
        @keyframes gr-result-in {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
            .gr-card { transition: none; }
            .gr-card.gr-winner, .gr-reel:has(.gr-winner) + .gr-pointer { animation: none; }
            .gr-result[data-winner] { animation: none; }
            .gr-times-loading::before { animation: none; }
        }
        .gr-filters { margin-inline-end: auto; display: flex; flex-wrap: wrap; gap: 8px 16px; }
        .gr-filter { position: relative; display: inline-flex; align-items: center; gap: 7px; color: var(--gr-muted); }
        .gr-filter input { position: absolute; inset-inline-start: 0; opacity: 0; width: 15px; height: 15px; margin: 0; }
        .gr-check {
            display: grid; place-items: center; box-sizing: border-box; flex: 0 0 15px;
            width: 15px; height: 15px; border: 1px solid color-mix(in srgb, var(--gr-muted) 60%, var(--gr-inset));
            border-radius: 4px; background: var(--gr-inset);
        }
        .gr-filter input:checked + .gr-check {
            background: color-mix(in srgb, var(--gr-accent) 44%, var(--gr-surface)); border-color: var(--gr-accent);
        }
        .gr-filter input:checked + .gr-check::before {
            content: ''; width: 6px; height: 3px; border: solid var(--gr-ink); border-width: 0 0 2px 2px;
            transform: translateY(-1px) rotate(-45deg);
        }
        .gr-filter input:disabled + .gr-check { opacity: .45; }
        @media (forced-colors: active) {
            .gr-filter input { position: static; opacity: 1; }
            .gr-check { display: none; }
        }
        .gr-empty { min-height: 174px; display: grid; place-items: center; color: var(--gr-muted); }
    `;

    // Shuffle through each whole-second duration before refilling the pool.
    const spinDurations = [];
    function nextSpinDuration() {
        if (!spinDurations.length) spinDurations.push(7000, 8000, 9000, 10000, 11000, 12000, 13000);
        const index = Math.floor(Math.random() * spinDurations.length);
        return spinDurations.splice(index, 1)[0];
    }

    function element(doc, tag, className, label) {
        const node = doc.createElement(tag);
        if (className) node.className = className;
        if (label) node.textContent = label;
        return node;
    }

    // Character coverage of the bundled Germania One font.
    const germaniaCharacters = /^[\u0020-\u007e\u00a0-\u0101\u0112-\u0113\u0116-\u0117\u011a\u0127-\u012b\u0130-\u0135\u0137-\u0138\u013f-\u0144\u014a-\u014c\u0151-\u0154\u0156-\u0159\u0168-\u016b\u016f\u0171\u017f\u01fc-\u01fd\u0237\u02c6-\u02c7\u02d9-\u02da\u02dc-\u02dd\u0307\u03bc\u2013-\u2014\u2018-\u201a\u201c-\u201e\u2022\u2039-\u203a\u2044\u20ac\ufb00-\ufb05]*$/u;

    function showWinnerTitle(doc, result, title) {
        const text = title.normalize('NFC').replace(/[\u2160-\u217f]/gu, numeral => numeral.normalize('NFKC'));
        const parts = text.split('™');
        result.toggleAttribute('data-title-fallback', !germaniaCharacters.test(parts.join('TM')));
        result.replaceChildren(parts[0]);
        for (const part of parts.slice(1)) {
            result.append(element(doc, 'sup', '', 'TM'), part);
        }
    }

    function libraryPath() {
        return window.MainWindowBrowserManager?.m_lastLocation?.pathname || "";
    }

    function collectionRoute() {
        const pathname = libraryPath();
        const match = /^\/library\/collection\/([^/]+)\/?$/.exec(pathname || '');
        if (!match) return null;
        try { return decodeURIComponent(match[1]); } catch { return null; }
    }

    function gamesIn(collection, installedOnly = false, neverPlayedOnly = false) {
        const games = new Map();
        for (const game of collection?.visibleApps ?? []) {
            if (game.display_name && Number(game.appid) > 0 &&
                (game.app_type === 1 || game.app_type === 1073741824) &&
                (!installedOnly || game.installed) &&
                (!neverPlayedOnly || !(game.rt_last_time_played > 0 ||
                    game.rt_last_time_locally_played > 0 || game.minutes_playtime_forever > 0))) {
                games.set(game.appid, game);
            }
        }
        return [...games.values()];
    }

    async function getCompletionTimes(game) {
        const appid = Number(game.appid);
        if (game.app_type !== 1 || !Number.isInteger(appid) || appid <= 0 || appid >= 0x80000000) return null;
        try {
            const lookup = window.HLTBForSteamLookup || (args =>
                Millennium.callServerMethod?.('hltb-for-millennium', 'GetHltbData', args));
            const args = {
                app_id: appid,
                fallback_name: game.display_name,
                force_refresh: false,
            };
            const response = await lookup(args);
            const payload = typeof response === 'string' ? JSON.parse(response) : response;
            if (!payload?.success || !payload.data) return null;
            const values = [['Main Story', payload.data.comp_main], ['100%', payload.data.comp_100]]
                .filter(([, hours]) => Number.isFinite(hours) && hours > 0);
            const refresh = payload.fromCache && payload.isStale
                ? () => Promise.resolve().then(() => lookup({...args, force_refresh: true})).catch(() => {})
                : undefined;
            return {values, refresh};
        } catch {
            return null;
        }
    }

    function artSources(game) {
        const id = Number(game.appid);
        const appStore = window.appStore;
        const edition = game.rtStoreAssetModifyTime || 0;
        const local = filename => '/assets/' + id + '/' + filename + '?c=' + edition;
        const images = [];
        try {
            images.push(...(appStore?.GetCustomVerticalCapsuleURLs?.(game) || []));
            images.push(...(appStore?.GetCachedVerticalCapsuleURL?.(game) || []));
        } catch {}
        images.push(local('library_600x900.jpg'));
        try {
            const storeAssets = window.StoreItemCache?.GetApp?.(id)?.GetAssets?.();
            images.push(
                appStore?.GetVerticalCapsuleURLForApp?.(game),
                storeAssets?.GetLibraryCapsuleURL_2x?.(),
                storeAssets?.GetLibraryCapsuleURL?.(),
                appStore?.GetPregeneratedVerticalCapsuleForApp?.(game),
            );
        } catch {}
        if (game.app_type === 1 && id < 0x80000000) {
            const cdn = 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/' + id + '/';
            images.push(cdn + 'library_600x900.jpg', local('library_header.jpg'), local('header.jpg'), cdn + 'header.jpg');
        } else {
            try { images.push(...(appStore?.GetCustomLandcapeImageURLs?.(game) || [])); } catch {}
            images.push(local('header.jpg'));
        }
        return [...new Set(images.filter(source => typeof source === 'string' && source))];
    }

    async function libraryArtSources(game, kind) {
        const id = Number(game.appid);
        if (!Number.isInteger(id) || id <= 0) return [];
        const images = [];
        const logo = kind === 'logo';
        const filename = logo ? 'logo.png' : 'library_hero.jpg';
        const details = window.appDetailsStore;
        try {
            const custom = logo ? window.appStore?.GetCustomLogoImageURLs?.(game)
                : window.appStore?.GetCustomHeroImageURLs?.(game);
            if (Array.isArray(custom)) images.push(...custom);
            else if (custom) images.push(custom);
        } catch {}
        try {
            if (details?.RequestAppDetails && !details.GetAppDetails?.(id)) {
                let pending = pendingArtDetails.get(id);
                if (!pending) {
                    let timeout;
                    pending = Promise.race([
                        details.RequestAppDetails(id),
                        new Promise(resolve => { timeout = setTimeout(resolve, 1500); }),
                    ]).catch(() => {}).finally(() => {
                        clearTimeout(timeout);
                        pendingArtDetails.delete(id);
                    });
                    pendingArtDetails.set(id, pending);
                }
                await pending;
            }
            const nativeImages = logo ? details?.GetLogoImages?.(game)?.rgLogoImages
                : details?.GetHeroImages?.(game)?.rgHeroImages;
            if (Array.isArray(nativeImages)) images.push(...nativeImages);
        } catch {}
        try {
            const assets = window.StoreItemCache?.GetApp?.(id)?.GetAssets?.();
            images.push(logo ? assets?.GetLibraryLogoURL?.() : assets?.GetLibraryHeroURL?.());
        } catch {}
        images.push('/assets/' + id + '/' + filename + '?c=' + (game.rtStoreAssetModifyTime || 0));
        if (game.app_type === 1 && id < 0x80000000) {
            images.push('https://shared.steamstatic.com/store_item_assets/steam/apps/' + id + '/' + filename);
        }
        return [...new Set(images.filter(source => typeof source === 'string' && source))];
    }

    function getTransparentLogoBounds(doc, image) {
        const canvas = doc.createElement('canvas');
        const scale = 128 / Math.max(image.naturalWidth, image.naturalHeight);
        const width = canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d', {willReadFrequently: true});
        if (!context) return null;
        context.drawImage(image, 0, 0, width, height);
        const {data} = context.getImageData(0, 0, width, height);
        let left = width, right = -1, top = height, bottom = -1;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (data[(y * width + x) * 4 + 3] < 32) continue;
                left = Math.min(left, x);
                right = Math.max(right, x);
                top = Math.min(top, y);
                bottom = Math.max(bottom, y);
            }
        }
        if (right <= left || bottom <= top) return null;
        // Ignore transparent padding outside the artwork.
        const contentWidth = right - left + 1;
        const contentHeight = bottom - top + 1;
        const insetX = Math.round(contentWidth * .12);
        const insetY = Math.round(contentHeight * .12);
        let transparent = 0;
        let innerTransparent = 0;
        for (let y = top; y <= bottom; y++) {
            for (let x = left; x <= right; x++) {
                if (data[(y * width + x) * 4 + 3] > 24) continue;
                transparent++;
                if (x >= left + insetX && x <= right - insetX && y >= top + insetY && y <= bottom - insetY) {
                    innerTransparent++;
                }
            }
        }
        const innerArea = (contentWidth - 2 * insetX) * (contentHeight - 2 * insetY);
        if (transparent < contentWidth * contentHeight * .12 || innerTransparent < innerArea * .07) return null;
        // Keep a small margin for antialiased edges and soft shadows.
        left = Math.max(0, left - 2);
        top = Math.max(0, top - 2);
        right = Math.min(width, right + 3);
        bottom = Math.min(height, bottom + 3);
        return {x: left / width, y: top / height, width: (right - left) / width, height: (bottom - top) / height};
    }

    function iconSources(game) {
        const store = window.appStore;
        const cached = store?.GetCachedIconURLsForApp?.(game);
        return [...new Set([
            ...(Array.isArray(cached) ? cached : [cached]),
            store?.GetIconURLForApp?.(game),
        ].filter(source => typeof source === 'string' && source))];
    }

    function loadArtwork(doc, game, kind = 'cover') {
        let cache = coverCache.get(doc);
        if (!cache) {
            cache = new Map();
            coverCache.set(doc, cache);
        }
        const key = [game.appid, game.rt_custom_image_mtime, game.rtStoreAssetModifyTime, kind].join(':');
        const cached = cache.get(key);
        if (cached && cached.expires > Date.now()) return cached.request;

        const entry = {expires: Infinity, request: null};
        entry.request = (async () => {
            const sources = kind === 'cover' ? artSources(game)
                : kind === 'icon' ? iconSources(game) : await libraryArtSources(game, kind);
            for (const source of sources) {
                const image = new doc.defaultView.Image();
                let timeout;
                try {
                    if (kind === 'logo' && new URL(source, doc.baseURI).origin !== doc.location.origin) {
                        image.crossOrigin = 'anonymous';
                    }
                    image.src = source;
                    await Promise.race([
                        image.decode(),
                        new Promise((resolve, reject) => { timeout = setTimeout(reject, 2200); }),
                    ]);
                    const minWidth = kind === 'icon' ? 16 : 48;
                    const minHeight = kind === 'icon' ? 16 : 32;
                    if (image.naturalWidth < minWidth || image.naturalHeight < minHeight) continue;
                    if (kind === 'banner' && image.naturalWidth < image.naturalHeight * 2) continue;
                    if (kind === 'logo') {
                        const bounds = getTransparentLogoBounds(doc, image);
                        if (!bounds) continue;
                        const sourceWidth = image.naturalWidth * bounds.width;
                        const ratio = sourceWidth / (image.naturalHeight * bounds.height);
                        const displayWidth = Math.min(300, 84 * ratio);
                        if (sourceWidth < displayWidth) continue;
                        return {image, bounds, ratio, displayWidth};
                    }
                    return image;
                } catch {
                    image.removeAttribute('src');
                } finally {
                    clearTimeout(timeout);
                }
            }
            return null;
        })().catch(() => null).then(image => {
            entry.expires = Date.now() + (image ? 300000 : 20000);
            return image;
        });
        cache.set(key, entry);
        if (cache.size > 160) cache.delete(cache.keys().next().value);
        return entry.request;
    }

    function random(games) {
        return games[Math.floor(Math.random() * games.length)];
    }

    function buildSpinCards(games, selected, prefixIds, targetIndex) {
        const spacing = Math.min(10, games.length - 1);
        const recent = prefixIds.slice(Math.max(0, prefixIds.length - spacing));
        const cards = [];
        const append = game => {
            cards.push(game);
            recent.push(String(game.appid));
            if (recent.length > spacing) recent.shift();
        };
        const appendFiller = () => append(random(games.filter(game => !recent.includes(String(game.appid)))));

        // Let the preselected winner come around again if it is still in the recent cards.
        while (prefixIds.length + cards.length < targetIndex || recent.includes(String(selected.appid))) {
            appendFiller();
        }
        const winnerIndex = prefixIds.length + cards.length;
        append(selected);
        for (let i = 0; i < 5; i++) appendFiller();
        return {cards, winnerIndex};
    }

    function makeCard(doc, game) {
        const card = element(doc, 'figure', 'gr-card');
        card.dataset.appid = String(game.appid);
        const label = element(doc, 'div', 'gr-cover-fallback');
        const initial = [...game.display_name.trim()][0] || '?';
        label.append(element(doc, 'b', '', initial.toUpperCase()), element(doc, 'span', 'gr-cover-title', game.display_name));
        card.append(label);
        void loadArtwork(doc, game).then(cover => {
            if (!cover || !card.isConnected) return;
            const image = cover.cloneNode();
            image.alt = '';
            const wide = cover.naturalWidth >= cover.naturalHeight;
            card.classList.toggle('gr-card-wide', wide);
            if (!wide) label.hidden = true;
            card.append(image);
        });
        return card;
    }

    function playSpinTone(audio, finished = false) {
        if (!settings.sound || audio?.state !== 'running') return;
        const now = audio.currentTime;
        const end = now + (finished ? .14 : .028);
        const tone = audio.createOscillator();
        const gain = audio.createGain();
        tone.type = 'sine';
        tone.frequency.setValueAtTime(finished ? 392 : 720, now);
        tone.frequency.exponentialRampToValueAtTime(finished ? 523 : 240, end);
        gain.gain.setValueAtTime(.0001, now);
        gain.gain.exponentialRampToValueAtTime(finished ? .055 : .025, now + .005);
        gain.gain.exponentialRampToValueAtTime(.0001, end);
        tone.connect(gain).connect(audio.destination);
        tone.start(now);
        tone.stop(end);
    }

    function watchReelSound(view, reel, track, audio) {
        if (!audio) return () => {};
        let frame;
        let lastCard;
        let lastTick = -Infinity;
        const tick = now => {
            const [first, second] = track.children;
            if (first && second) {
                const firstRect = first.getBoundingClientRect();
                const step = second.getBoundingClientRect().left - firstRect.left;
                const visible = reel.getBoundingClientRect();
                if (step > 0 && visible.width > 0) {
                    const position = visible.left + visible.width / 2 - firstRect.left - firstRect.width / 2;
                    const card = Math.round(position / step);
                    if (lastCard !== undefined && card !== lastCard && now - lastTick >= 44) {
                        playSpinTone(audio);
                        lastTick = now;
                    }
                    lastCard = card;
                }
            }
            frame = view.requestAnimationFrame(tick);
        };
        frame = view.requestAnimationFrame(tick);
        return () => view.cancelAnimationFrame(frame);
    }

    function openRoulette(doc, collectionId, trigger) {
        const store = window.collectionStore;
        const view = doc.defaultView;
        let collection;
        let choices = [];
        try {
            if (collectionId && collectionId !== soundtrackCollectionId) {
                collection = store?.GetCollection(collectionId);
            }
            if (!collection) {
                choices = (store?.userCollections || []).filter(choice => choice.m_strId !== soundtrackCollectionId);
            }
        } catch {}
        const collectionName = choice => {
            if (!choice) return 'Steam Collections';
            const id = choice.m_strId;
            if (id === 'favorite' || id === 'uncategorized') {
                return store?.SystemCollectionIdToName?.(id) || choice.m_strName;
            }
            return choice.m_strName;
        };
        collection ||= choices.find(choice => choice.m_strId === settings.collectionId)
            || choices.find(choice => gamesIn(choice).length) || choices[0];
        if (collection?.m_strId && collection.m_strId !== settings.collectionId) {
            settings.collectionId = collection.m_strId;
            saveSettings();
        }
        currentDialog.get(doc)?.close();

        const dialog = element(doc, 'dialog', 'gr-dialog');
        dialog.setAttribute('aria-labelledby', 'gr-title');
        const head = element(doc, 'header', 'gr-head');
        const titles = element(doc, 'div');
        const title = element(doc, 'h2', '', 'Game Roulette');
        title.id = 'gr-title';
        const subtitle = element(doc, 'p');
        titles.append(title, subtitle);
        head.append(titles);
        let chooser;
        if (choices.length) {
            chooser = element(doc, 'select', 'gr-collections');
            chooser.setAttribute('aria-label', 'Choose a collection');
            for (const choice of choices) {
                const option = element(doc, 'option', '', collectionName(choice));
                option.value = choice.m_strId;
                chooser.append(option);
            }
            chooser.value = collection?.m_strId || "";
            const picker = element(doc, 'span', 'gr-collection-picker');
            picker.append(chooser);
            head.append(picker);
        }
        const close = element(doc, 'button', 'gr-close', '×');
        close.setAttribute('aria-label', 'Close Game Roulette');
        head.append(close);

        const field = element(doc, 'div', 'gr-field');
        field.setAttribute('aria-hidden', 'true');
        const reel = element(doc, 'div', 'gr-reel');
        const track = element(doc, 'div', 'gr-track');
        const empty = element(doc, 'div', 'gr-empty', 'No eligible games in this collection');
        reel.append(track);
        field.append(reel, element(doc, 'div', 'gr-pointer'), empty);

        const footer = element(doc, 'footer', 'gr-footer');
        const outcome = element(doc, 'div', 'gr-outcome');
        outcome.setAttribute('role', 'status');
        const result = element(doc, 'p', 'gr-result');
        const times = element(doc, 'p', 'gr-times');
        times.hidden = true;
        outcome.append(result, times);
        const filters = element(doc, 'div', 'gr-filters');
        function addFilter(text) {
            const label = element(doc, 'label', 'gr-filter');
            const checkbox = element(doc, 'input');
            checkbox.type = 'checkbox';
            const mark = element(doc, 'span', 'gr-check');
            mark.setAttribute('aria-hidden', 'true');
            label.append(checkbox, mark, text);
            filters.append(label);
            return checkbox;
        }
        const installed = addFilter('Installed');
        const neverPlayed = addFilter('Never played');
        installed.checked = settings.installed;
        neverPlayed.checked = settings.neverPlayed;
        const nativeButton = 'DialogButton _DialogLayout cXzBZxhPBl7fZs9LODEnc R7OZbuJa9H3NPk-5gy3Is';
        const open = element(doc, 'button', nativeButton, 'Open game page');
        const spin = element(doc, 'button', nativeButton + ' Primary gr-spin', 'Spin');
        const spinIcon = element(doc, 'span', 'gr-spin-icon');
        spinIcon.setAttribute('aria-hidden', 'true');
        footer.append(outcome, filters, open, spin);
        dialog.append(head, field, footer);
        doc.body.append(dialog);

        const drawnBySelection = new Map();
        let preparedSpin;
        const selectionKey = () => JSON.stringify([collection.m_strId || collection.id || collection.m_strName, installed.checked, neverPlayed.checked]);
        const prepareSpin = games => {
            preparedSpin = undefined;
            if (!settings.hltb || !games.length) return;
            const selection = selectionKey();
            const drawn = drawnBySelection.get(selection);
            const remaining = games.filter(game => !drawn?.has(game.appid));
            const eligible = remaining.length ? remaining : games;
            const game = random(eligible);
            preparedSpin = {
                selection, game, eligibleIds: new Set(eligible.map(item => item.appid)),
                request: getCompletionTimes(game),
            };
        };
        let winner = null;
        const clearWinnerArt = () => {
            delete footer.dataset.winnerBanner;
            footer.style.removeProperty('--gr-winner-art');
        };
        let timingRequest;
        let timingTimer;
        const clearTimes = () => {
            clearTimeout(timingTimer);
            timingRequest = undefined;
            times.hidden = true;
            times.replaceChildren();
        };
        let landingOffset = 0;
        let motion;
        let audio;
        const draw = games => {
            track.style.transform = '';
            track.replaceChildren(...games.map(game => makeCard(doc, game)));
        };
        const updateCardDepth = () => {
            const [first, second] = track.children;
            const viewport = reel.getBoundingClientRect();
            if (!first || !viewport.width) return;
            const trackBounds = track.getBoundingClientRect();
            const zoom = trackBounds.width / track.offsetWidth;
            const width = first.offsetWidth * zoom;
            const step = second ? (second.offsetLeft - first.offsetLeft) * zoom : width;
            const firstCenter = trackBounds.left + first.offsetLeft * zoom + width / 2;
            const viewportCenter = viewport.left + viewport.width / 2;
            for (const [index, card] of Array.from(track.children).entries()) {
                const distance = Math.abs(firstCenter + step * index - viewportCenter) / viewport.width;
                const edge = Math.max(0, Math.min(1, (distance - .30) / .20));
                const falloff = edge * edge * (3 - 2 * edge);
                const scale = (1 - falloff * .0125).toFixed(4);
                if (card.style.getPropertyValue('--gr-card-scale') !== scale) card.style.setProperty('--gr-card-scale', scale);
            }
        };
        const center = card => reel.clientWidth / 2 - card.offsetLeft - card.offsetWidth / 2;
        const place = (target, offset = 0) => 'translateX(' + (center(target) + offset * target.offsetWidth) + 'px)';
        const centerPreview = () => {
            const initial = track.children[Math.min(3, track.children.length - 1)];
            if (!initial) return;
            track.style.transform = track.offsetWidth <= reel.clientWidth
                ? 'translateX(' + (reel.clientWidth - track.offsetWidth) / 2 + 'px)'
                : place(initial);
        };
        const reset = () => {
            landingOffset = 0;
            winner = null;
            clearTimes();
            clearWinnerArt();
            delete result.dataset.winner;
            const games = gamesIn(collection, installed.checked, neverPlayed.checked);
            subtitle.textContent = chooser ? '' : collectionName(collection);
            open.hidden = true;
            spin.textContent = 'Spin';
            spin.disabled = !games.length;
            result.textContent = games.length ? 'Eligible games: ' + games.length.toLocaleString('en-US') : '';
            empty.textContent = collection ? 'No eligible games in this collection' : 'No Steam collections available';
            empty.hidden = Boolean(games.length);
            reel.hidden = !games.length;
            field.querySelector('.gr-pointer').hidden = !games.length;
            draw(games.slice(0, 9));
            centerPreview();
            updateCardDepth();
            prepareSpin(games);
        };

        close.addEventListener('click', () => dialog.close());
        dialog.addEventListener('close', () => {
            clearTimes();
            motion?.cancel();
            if (audio) void audio.close().catch(() => {});
            resize?.disconnect();
            dialog.remove();
            if (currentDialog.get(doc) === dialog) currentDialog.delete(doc);
            if (trigger.isConnected) trigger.focus({preventScroll: true});
        });
        filters.addEventListener('change', () => {
            settings.installed = installed.checked;
            settings.neverPlayed = neverPlayed.checked;
            saveSettings();
            reset();
        });
        chooser?.addEventListener('change', () => {
            collection = choices.find(choice => choice.m_strId === chooser.value);
            if (collection) {
                settings.collectionId = collection.m_strId;
                saveSettings();
            }
            reset();
        });
        open.addEventListener('click', () => {
            if (!winner) return;
            const appid = winner.appid;
            dialog.close();
            window.SteamUIStore.Navigate('/library/app/' + appid);
        });

        spin.addEventListener('click', async () => {
            const games = gamesIn(collection, installed.checked, neverPlayed.checked);
            if (!games.length) { reset(); return; }
            const selection = selectionKey();
            let drawn = drawnBySelection.get(selection);
            if (!drawn) {
                drawn = new Set();
                drawnBySelection.set(selection, drawn);
            }
            let eligible = games.filter(game => !drawn.has(game.appid));
            if (!eligible.length) {
                drawn.clear();
                eligible = games;
            }
            const prepared = settings.hltb && preparedSpin?.selection === selection
                && preparedSpin.eligibleIds.size === eligible.length
                && eligible.every(game => preparedSpin.eligibleIds.has(game.appid)) ? preparedSpin : undefined;
            preparedSpin = undefined;
            const selected = prepared ? eligible.find(game => game.appid === prepared.game.appid) : random(eligible);
            const request = settings.hltb ? prepared?.request ?? getCompletionTimes(selected) : undefined;
            const bannerRequest = settings.winnerBanner ? loadArtwork(doc, selected, 'banner') : undefined;
            const logoRequest = showLegacyWinnerLogo && settings.winnerLogo ? loadArtwork(doc, selected, 'logo') : undefined;
            const iconRequest = !logoRequest && !settings.hideWinnerIcon ? loadArtwork(doc, selected, 'icon') : undefined;
            winner = null;
            clearTimes();
            clearWinnerArt();
            spin.disabled = true;
            installed.disabled = true;
            neverPlayed.disabled = true;
            if (chooser) chooser.disabled = true;
            open.hidden = true;
            delete result.dataset.winner;
            result.textContent = 'Spinning…';

            const reduced = doc.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const duration = reduced || games.length === 1 ? 0 : nextSpinDuration();
            const travel = Math.round(duration / 240);
            const previousCard = duration ? track.querySelector('.gr-winner') : null;
            let firstIndex = 3;
            let prefixIds = [];
            if (previousCard) {
                // Keep the visible covers and reuse the exact stopping point of the last roll.
                const before = Array.from(track.children);
                const previousIndex = before.indexOf(previousCard);
                const pruneCount = Math.max(0, previousIndex - 6);
                before.slice(0, pruneCount).forEach(card => card.remove());
                firstIndex = previousIndex - pruneCount;
                prefixIds = before.slice(pruneCount).map(card => card.dataset.appid);
            }
            const {cards, winnerIndex} = buildSpinCards(games, selected, prefixIds, firstIndex + travel);
            if (previousCard) {
                track.append(...cards.map(game => makeCard(doc, game)));
                previousCard.classList.remove('gr-winner');
            } else {
                draw(cards);
            }
            const start = place(track.children[firstIndex], previousCard ? landingOffset : 0);
            const winningCard = track.children[winnerIndex];
            // Keep the pointer inside the chosen card, even on close finishes.
            const landing = duration ? Math.random() : 0.5;
            landingOffset = landing < 0.15 ? -0.45 : landing > 0.85 ? 0.45 : 0;
            const finish = place(winningCard, landingOffset);
            track.style.transform = finish;
            timingRequest = request;
            if (duration) {
                reel.dataset.spinning = '';
                motion = track.animate([{transform: start}, {transform: finish}], {
                    duration, easing: 'cubic-bezier(.22,.30,.64,.94)'
                });
                let depthFrame;
                const animateDepth = () => {
                    updateCardDepth();
                    if (motion.playState === 'running') depthFrame = view.requestAnimationFrame(animateDepth);
                };
                animateDepth();
                if (settings.sound) {
                    try {
                        audio ||= new doc.defaultView.AudioContext();
                        if (audio.state === 'suspended') void audio.resume().catch(() => {});
                    } catch {}
                }
                const stopSound = watchReelSound(doc.defaultView, reel, track, settings.sound ? audio : null);
                try { await motion.finished; } catch { return; } finally {
                    delete reel.dataset.spinning;
                    view.cancelAnimationFrame(depthFrame);
                    stopSound();
                }
            }
            if (!dialog.open) return;
            track.style.transform = place(winningCard, landingOffset);
            winningCard.classList.add('gr-winner');
            updateCardDepth();
            const showArt = (image, banner) => {
                if (!image || !dialog.open || !track.contains(winningCard) || !winningCard.classList.contains('gr-winner')) return;
                if (banner ? !settings.winnerBanner : footer.hasAttribute('data-winner-banner')) return;
                footer.toggleAttribute('data-winner-banner', banner);
                footer.style.setProperty('--gr-winner-art', 'url(' + JSON.stringify(image.src) + ')');
            };
            void loadArtwork(doc, selected).then(cover => showArt(cover, false));
            void bannerRequest?.then(banner => showArt(banner, true));
            if (duration) playSpinTone(audio, true);
            winner = selected;
            drawn.add(selected.appid);
            result.dataset.winner = '';
            showWinnerTitle(doc, result, selected.display_name);
            const isCurrentWinner = () => dialog.open && winner === selected &&
                track.contains(winningCard) && winningCard.classList.contains('gr-winner');
            void iconRequest?.then(icon => {
                if (!icon || settings.hideWinnerIcon || !isCurrentWinner()) return;
                const image = icon.cloneNode();
                image.className = 'gr-winner-icon';
                image.alt = '';
                const name = element(doc, 'span', 'gr-winner-name');
                name.append(...result.childNodes);
                result.append(image, name);
            });
            void logoRequest?.then(logo => {
                if (!logo || !settings.winnerLogo || !isCurrentWinner()) return;
                const {bounds, ratio, displayWidth} = logo;
                const image = logo.image.cloneNode();
                image.alt = '';
                const frame = element(doc, 'span', 'gr-winner-logo');
                frame.style.inlineSize = displayWidth + 'px';
                frame.style.aspectRatio = String(ratio);
                image.style.width = 100 / bounds.width + '%';
                image.style.height = 100 / bounds.height + '%';
                image.style.left = -100 * bounds.x / bounds.width + '%';
                image.style.top = -100 * bounds.y / bounds.height + '%';
                frame.append(image);
                const caption = element(doc, 'span', 'gr-winner-caption');
                caption.append(...result.childNodes);
                result.append(frame, caption);
            });
            if (request) {
                times.replaceChildren(element(doc, 'span', 'gr-times-loading', 'Loading time…'));
                times.hidden = false;
                timingTimer = setTimeout(() => {
                    if (!dialog.open || timingRequest !== request) return;
                    times.textContent = 'HLTB is taking longer than usual.';
                }, 6000);
                void request.then(completion => {
                    if (!dialog.open || timingRequest !== request) return;
                    clearTimeout(timingTimer);
                    times.replaceChildren();
                    const values = completion?.values ?? [];
                    times.hidden = !values.length;
                    for (const [label, hours] of values) {
                        const metric = element(doc, 'span', '', label);
                        metric.append(' ', element(doc, 'strong', '', hours.toLocaleString('en-US', {maximumFractionDigits: 1}) + ' h'));
                        times.append(metric);
                    }
                    if (settings.hltb) void completion?.refresh?.();
                });
            }
            installed.disabled = false;
            neverPlayed.disabled = false;
            if (chooser) chooser.disabled = false;
            spin.disabled = false;
            spin.replaceChildren(spinIcon, 'Spin again');
            open.hidden = false;
            spin.focus({preventScroll: true});
            prepareSpin(gamesIn(collection, installed.checked, neverPlayed.checked));
        });
        const resize = new doc.defaultView.ResizeObserver(() => {
            if (!dialog.open || motion?.playState === "running") return;
            if (winner) {
                const target = track.querySelector('.gr-winner');
                if (target) track.style.transform = place(target, landingOffset);
            } else centerPreview();
            updateCardDepth();
        });
        resize.observe(reel);
        currentDialog.set(doc, dialog);
        dialog.showModal();
        reset();
        (spin.disabled ? close : spin).focus();
    }

    function attach(doc) {
        if (!doc?.body || attached.has(doc)) return;
        attached.add(doc);
        doc.head.append(element(doc, 'style', '', styles));
        if (fontBase64) {
            const fontBytes = Uint8Array.from(atob(fontBase64), char => char.charCodeAt(0));
            const face = new doc.defaultView.FontFace('Germania One', fontBytes);
            doc.fonts.add(face);
            void face.load().catch(() => doc.fonts.delete(face));
        }
        let queued = false;
        const mount = () => {
            queued = false;
            const existing = doc.querySelector('.gr-roulette-item');
            if (!libraryPath().startsWith('/library/')) {
                existing?.remove();
                currentDialog.get(doc)?.close();
                return;
            }

            const link = doc.querySelector('a[href$="/library/collections"]');
            const nativeItem = link?.closest('._2CEKFex6JMsAse2lqMMjUp');
            if (!nativeItem || existing?.previousElementSibling === nativeItem) return;
            existing?.remove();

            const item = element(doc, 'div', nativeItem.className + ' gr-roulette-item');
            const surface = element(doc, 'div', link.parentElement.className);
            const classes = [...link.classList].filter(name => name !== 'eNLOx4LVceeMwRvTVWh3' && name !== 'Selected');
            const trigger = element(doc, 'button', [...classes, 'gr-trigger'].join(' '));
            trigger.type = 'button';
            trigger.title = 'Game Roulette';
            trigger.setAttribute('aria-label', 'Game Roulette');
            const glyph = element(doc, 'span', 'gr-glyph');
            glyph.setAttribute('aria-hidden', 'true');
            trigger.append(glyph);
            trigger.addEventListener('click', () => openRoulette(doc, collectionRoute(), trigger));
            surface.append(trigger);
            item.append(surface);
            nativeItem.after(item);
        };
        const schedule = () => {
            if (queued) return;
            queued = true;
            doc.defaultView.requestAnimationFrame(mount);
        };
        new doc.defaultView.MutationObserver(schedule).observe(doc.body, {subtree: true, childList: true});
        const browser = window.MainWindowBrowserManager?.m_browser;
        browser?.on?.('finished-request', schedule);
        mount();
    }

    console.info("Game Roulette frontend ready");
    Millennium.AddWindowCreateHook?.(view => {
        if (view.m_strName?.startsWith('SP ') && !view.m_strName.includes('BPM')) {
            attach(view.m_popup?.document);
        }
    });

    const react = window.SP_REACT;
    const api = window.MILLENNIUM_API;
    if (!react || !api?.Field || !api?.Toggle || !api.IconsModule?.Settings) return;

    const h = react.createElement;
    function SettingsToggle({name, label, description}) {
        const [value, setValue] = react.useState(settings[name]);
        return h(api.Field, {label, description, bottomSeparator: 'standard', focusable: true},
            h(api.Toggle, {
                value,
                onChange(next) {
                    settings[name] = next;
                    setValue(next);
                    saveSettings();
                },
            })
        );
    }

    return {
        title: 'Game Roulette',
        icon: h(api.IconsModule.Settings),
        content: h(react.Fragment, null,
            h(SettingsToggle, {name: 'hltb', label: 'HLTB Support', description: 'Show Main Story and 100% times from the HLTB plugin.'}),
            h(SettingsToggle, {name: 'sound', label: 'Sound', description: 'Play sounds during the spin and when a game is picked.'}),
            h(SettingsToggle, {name: 'winnerBanner', label: 'Winner Banner', description: 'Show the winning game’s banner behind the result.'}),
            showLegacyWinnerLogo
                ? h(SettingsToggle, {name: 'winnerLogo', label: 'Показывать логотип', description: 'Показывает логотип над названием игры, если доступен качественный логотип с прозрачным фоном.'})
                : h(SettingsToggle, {name: 'hideWinnerIcon', label: 'Скрыть значок', description: 'Скрывает значок игры рядом с названием победителя.'})
        ),
    };
}
