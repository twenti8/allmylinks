import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GOOGLE_SCRIPT_URL,
  POST_SAVE_GET_COOLDOWN_MS,
  PROFILE_LOGO_MAX_CHARS,
  PROFILE_LOGO_MAX_PX,
  PROFILE_LOGO_QUALITY,
  buildCacheBustedScriptUrl,
  buildGoogleAppsScriptCode,
  buildStandaloneHtml,
  buildWebAppManifest,
  calculateContainedDimensions,
  computeProgressPercent,
  computeSeekTimeFromPercent,
  createDefaultHubData,
  extractHostname,
  extractUniqueCategories,
  extractUpdatedDataFromPostResponse,
  extractYouTubeId,
  filterLinksByCategory,
  formatLinkDecoration,
  formatPlaybackTime,
  formatProfileFrame,
  getFaviconUrl,
  isImageSource,
  isNonEmptyCloudPayload,
  normalizeUrl,
  parseLinkDecoration,
  parseProfileFrame,
  reorderLinks,
  sanitizeAndParseHubData,
  shouldSuppressCloudPull,
  syncMusicFields,
  validatePasscode,
} from './hubLogic';
import { buildCustomThemePalette, resolveActivePalette } from './themes';

test('extractYouTubeId parses watch, short, embed, shorts, and raw IDs', () => {
  assert.equal(extractYouTubeId('https://www.youtube.com/watch?v=jfKfPfyJRdk'), 'jfKfPfyJRdk');
  assert.equal(extractYouTubeId('https://youtu.be/5qap5aO4i9A?t=30'), '5qap5aO4i9A');
  assert.equal(extractYouTubeId('https://youtube.com/shorts/abcDEF12345'), 'abcDEF12345');
  assert.equal(extractYouTubeId('https://www.youtube.com/embed/jfKfPfyJRdk'), 'jfKfPfyJRdk');
  assert.equal(extractYouTubeId('jfKfPfyJRdk'), 'jfKfPfyJRdk');
  assert.equal(extractYouTubeId('not-a-valid-url'), null);
  assert.equal(extractYouTubeId(''), null);
});

test('filterLinksByCategory filters correctly for all and named categories', () => {
  const data = createDefaultHubData();
  assert.equal(filterLinksByCategory(data.links, 'all').length, data.links.length);
  const finedae = filterLinksByCategory(data.links, ' finedae ');
  assert.equal(finedae.length, 2);
  assert.ok(finedae.every((l) => l.category === 'finedae'));
});

test('extractUniqueCategories trims whitespace, deduplicates, and ignores empty categories', () => {
  const cats = extractUniqueCategories([
    { id: '1', title: 'A', url: 'https://a.com', category: '  finedae  ', icon: '🔗' },
    { id: '2', title: 'B', url: 'https://b.com', category: 'finedae', icon: '🔗' },
    { id: '3', title: 'C', url: 'https://c.com', category: '   ', icon: '🔗' },
    { id: '4', title: 'D', url: 'https://d.com', category: 'โซเชียล', icon: '🔗' },
    { id: '5', title: 'E', url: 'https://e.com', category: '', icon: '🔗' },
  ]);
  assert.deepEqual(cats, ['finedae', 'โซเชียล']);
  assert.deepEqual(
    extractUniqueCategories([
      { id: '1', title: 'No cat', url: 'https://a.com', category: '', icon: '🔗' },
    ]),
    []
  );
});

test('reorderLinks moves items up and down without mutating original array', () => {
  const data = createDefaultHubData();
  const originalFirstId = data.links[0].id;
  const originalSecondId = data.links[1].id;

  const movedDown = reorderLinks(data.links, 0, 'down');
  assert.equal(movedDown[0].id, originalSecondId);
  assert.equal(movedDown[1].id, originalFirstId);
  assert.equal(data.links[0].id, originalFirstId);

  const outOfBounds = reorderLinks(data.links, 0, 'up');
  assert.equal(outOfBounds[0].id, originalFirstId);
});

test('validatePasscode matches exact trimmed passcode and rejects wrong codes', () => {
  assert.equal(validatePasscode('1234', '1234'), true);
  assert.equal(validatePasscode(' 1234 ', '1234'), true);
  assert.equal(validatePasscode('0000', '1234'), false);
  assert.equal(validatePasscode('', '1234'), false);
});

test('normalizeUrl prepends https when protocol is omitted', () => {
  assert.equal(normalizeUrl('example.com'), 'https://example.com');
  assert.equal(normalizeUrl('https://google.com'), 'https://google.com');
  assert.equal(normalizeUrl('mailto:hi@test.com'), 'mailto:hi@test.com');
});

test('sanitizeAndParseHubData falls back safely on malformed fields', () => {
  const parsed = sanitizeAndParseHubData({
    profileName: 'Ayino',
    theme: 'custom',
    customTheme: { bg: '#ffe4ec', cardBg: '#ffffff', accent: '#9e2a54' },
    links: [{ title: 'Shop', url: 'https://shop.test', icon: '🛍️' }],
    music: { volume: 180, autoplay: true },
  });
  assert.ok(parsed);
  assert.equal(parsed.profileName, 'Ayino');
  assert.equal(parsed.theme, 'custom');
  assert.equal(parsed.customTheme.bg, '#FFE4EC');
  assert.equal(parsed.customTheme.accent, '#9E2A54');
  assert.equal(parsed.links.length, 1);
  assert.equal(parsed.music.volume, 100);
  assert.equal(parsed.music.autoplay, true);
  assert.equal(parsed.passcode, '1234');
  assert.equal(sanitizeAndParseHubData(null), null);
});

test('buildCustomThemePalette and resolveActivePalette generate valid contrast palette', () => {
  const palette = buildCustomThemePalette({ bg: '#E6F7FF', cardBg: '#FFFFFF', accent: '#124E78' });
  assert.equal(palette.bg, '#E6F7FF');
  assert.equal(palette.cardBg, '#FFFFFF');
  assert.equal(palette.text, '#124E78');
  assert.equal(palette.accentText, '#FFFFFF');

  const lightAccent = resolveActivePalette('custom', {
    bg: '#FFFFFF',
    cardBg: '#FFFFFF',
    accent: '#FFD1DC',
  });
  assert.equal(lightAccent.accentText, '#2B2118');
});

test('buildGoogleAppsScriptCode includes doGet and doPost handlers with chunking', () => {
  const code = buildGoogleAppsScriptCode();
  assert.ok(code.includes('function doGet(e)'));
  assert.ok(code.includes('function doPost(e)'));
  assert.ok(code.includes('CHUNK_SIZE'));
});

test('buildStandaloneHtml embeds profile name, hardcoded GOOGLE_SCRIPT_URL, and serialized links cleanly', () => {
  const data = createDefaultHubData();
  const html = buildStandaloneHtml(data);
  assert.ok(html.includes('<!doctype html>'));
  assert.ok(html.includes('moogrob'));
  assert.ok(html.includes(GOOGLE_SCRIPT_URL));
});

test('buildWebAppManifest reflects profile icon, app name, and caramel theme colors', () => {
  const data = createDefaultHubData();
  const manifest = buildWebAppManifest(data);
  assert.equal(manifest.name, 'Pastel Link Hub');
  assert.equal(manifest.background_color, '#FDF8E7');
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length === 1);
});

test('parseProfileFrame and formatProfileFrame round-trip decoration cleanly without double-wrapping', () => {
  const decorated = formatProfileFrame('moogrob', 'bow');
  assert.equal(decorated, '୨୧ ₊⁺₊⁺° moogrob °₊⁺₊ ୨୧');
  const parsed = parseProfileFrame(decorated);
  assert.equal(parsed.coreName, 'moogrob');
  assert.equal(parsed.frameId, 'bow');
  assert.equal(formatProfileFrame(parsed.coreName, 'heart'), '♡ ₊⁺⋆ moogrob ⋆⁺₊ ♡');
});

test('parseLinkDecoration and formatLinkDecoration avoid double wrapping and handle favicons', () => {
  const formatted = formatLinkDecoration('review finedaeivibe', 'ดูรีวิวเลย', true);
  assert.equal(formatted.title, '♡･ﾟ review finedaeivibe ﾟ･♡');
  assert.equal(formatted.subtitle, '~ ✿ ดูรีวิวเลย ✿ ~');

  const parsed = parseLinkDecoration(formatted.title, formatted.subtitle);
  assert.equal(parsed.coreTitle, 'review finedaeivibe');
  assert.equal(parsed.coreSubtitle, 'ดูรีวิวเลย');
  assert.equal(parsed.decorated, true);

  assert.equal(extractHostname('https://www.instagram.com/test'), 'instagram.com');
  assert.ok(getFaviconUrl('https://github.com').includes('domain=github.com'));
});

test('HubData serialization uses exact "passcode" JSON key and preserves updated value', () => {
  const base = createDefaultHubData();
  const next = { ...base, passcode: '9988' };
  const serialized = JSON.stringify({ data: next });
  const parsedJson = JSON.parse(serialized);
  assert.equal(parsedJson.data.passcode, '9988');
  const hydrated = sanitizeAndParseHubData(parsedJson.data);
  assert.ok(hydrated);
  assert.equal(hydrated.passcode, '9988');
});

test('formatPlaybackTime, computeProgressPercent, and computeSeekTimeFromPercent handle bounds safely', () => {
  assert.equal(formatPlaybackTime(0), '0:00');
  assert.equal(formatPlaybackTime(65), '1:05');
  assert.equal(formatPlaybackTime(3661), '1:01:01');
  assert.equal(formatPlaybackTime(-5), '0:00');
  assert.equal(formatPlaybackTime(Number.NaN), '0:00');

  assert.equal(computeProgressPercent(30, 120), 25);
  assert.equal(computeProgressPercent(150, 120), 100);
  assert.equal(computeProgressPercent(10, 0), 0);

  assert.equal(computeSeekTimeFromPercent(50, 200), 100);
  assert.equal(computeSeekTimeFromPercent(120, 200), 200);
  assert.equal(computeSeekTimeFromPercent(50, 0), 0);
});

test('GOOGLE_SCRIPT_URL and buildCacheBustedScriptUrl enforce hardcoded cross-device auto-sync', () => {
  assert.equal(
    GOOGLE_SCRIPT_URL,
    'https://script.google.com/macros/s/AKfycbzGGsKII9wIZExoBB038USbMOC2O3Im6FkgK6szNsFiO70gViDiNKnR-GS6gIk1akMq/exec'
  );

  // Cache-busting ?t= query string defaults to GOOGLE_SCRIPT_URL
  assert.equal(
    buildCacheBustedScriptUrl(undefined, 1700000000000),
    `${GOOGLE_SCRIPT_URL}?t=1700000000000`
  );
  assert.equal(
    buildCacheBustedScriptUrl('https://script.google.com/macros/s/abc/exec?v=1', 1700000000000),
    'https://script.google.com/macros/s/abc/exec?v=1&t=1700000000000'
  );
});

test('buildStandaloneHtml embeds ?t= cache buster and visibilitychange/focus auto-sync listeners', () => {
  const data = createDefaultHubData();
  const html = buildStandaloneHtml(data);
  assert.ok(html.includes("'t=' + Date.now()"));
  assert.ok(html.includes('visibilitychange'));
  assert.ok(html.includes("'focus'"));
});

test('isNonEmptyCloudPayload rejects {} and empty values while sanitizeAndParseHubData syncs profileImage', () => {
  assert.equal(isNonEmptyCloudPayload({}), false);
  assert.equal(isNonEmptyCloudPayload(null), false);
  assert.equal(isNonEmptyCloudPayload([]), false);
  assert.equal(isNonEmptyCloudPayload({ profileName: 'Moogrob' }), true);

  const cloudParsed = sanitizeAndParseHubData({
    profileImage: '  https://cdn.example.com/logo.png  ',
    passcode: '5678',
  });
  assert.ok(cloudParsed);
  assert.equal(cloudParsed.profileImage, 'https://cdn.example.com/logo.png');
  assert.equal(cloudParsed.iosConfig.appIcon, 'https://cdn.example.com/logo.png');
  assert.equal(cloudParsed.passcode, '5678');
});

test('calculateContainedDimensions caps all uploaded images to 140x140 JPEG 0.7 and isImageSource supports data:image/ and URLs', () => {
  assert.equal(PROFILE_LOGO_MAX_PX, 140);
  assert.equal(PROFILE_LOGO_QUALITY, 0.7);
  assert.equal(PROFILE_LOGO_MAX_CHARS, 30000);

  assert.deepEqual(calculateContainedDimensions(1200, 800, 140), { width: 140, height: 93 });
  assert.deepEqual(calculateContainedDimensions(600, 1200, 140), { width: 70, height: 140 });
  assert.deepEqual(calculateContainedDimensions(120, 100, 140), { width: 120, height: 100 });

  assert.equal(isImageSource('data:image/jpeg;base64,/9j/4AAQ'), true);
  assert.equal(isImageSource('data:image/png;base64,iVBOR'), true);
  assert.equal(isImageSource('data:image/svg+xml;utf8,<svg/>'), true);
  assert.equal(isImageSource('https://example.com/pic.jpg'), true);
  assert.equal(isImageSource('http://example.com/pic.png'), true);
  assert.equal(isImageSource('/assets/logo.png'), true);
  assert.equal(isImageSource('🥞'), false);
  assert.equal(isImageSource(''), false);

  const sampleJpeg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/';
  const base = createDefaultHubData();
  const sampleData = {
    ...base,
    profileImage: sampleJpeg,
    links: [{ ...base.links[0], icon: sampleJpeg }],
    music: { ...base.music, coverImage: sampleJpeg },
  };
  const postedPayload = JSON.parse(JSON.stringify({ data: sampleData }));
  assert.equal(postedPayload.data.profileImage, sampleJpeg);
  assert.equal(postedPayload.data.links[0].icon, sampleJpeg);
  assert.equal(postedPayload.data.music.coverImage, sampleJpeg);
  const hydrated = sanitizeAndParseHubData(postedPayload.data);
  assert.ok(hydrated);
  assert.equal(hydrated.profileImage, sampleJpeg);
  assert.equal(hydrated.links[0].icon, sampleJpeg);
  assert.equal(hydrated.music.coverImage, sampleJpeg);
});

test('extractUpdatedDataFromPostResponse extracts Google Drive updatedData cleanly and ignores empty responses', () => {
  assert.equal(extractUpdatedDataFromPostResponse({ ok: true }), null);
  assert.equal(extractUpdatedDataFromPostResponse({ ok: true, updatedData: {} }), null);
  assert.equal(extractUpdatedDataFromPostResponse(null), null);

  const driveUrl = 'https://lh3.googleusercontent.com/d/1AbCdEfGhIjK';
  const linkDriveUrl = 'https://lh3.googleusercontent.com/d/9ZyXwVuTsRqP';
  const parsed = extractUpdatedDataFromPostResponse({
    ok: true,
    updatedData: {
      profileName: 'Drive Synced Hub',
      profileImage: driveUrl,
      links: [
        {
          id: 'l-1',
          title: 'Shop',
          url: 'https://shop.test',
          category: 'store',
          icon: linkDriveUrl,
        },
      ],
    },
  });
  assert.ok(parsed);
  assert.equal(parsed.profileImage, driveUrl);
  assert.equal(parsed.links[0].icon, linkDriveUrl);

  // Wrapped { data: hubData } envelope unwraps cleanly instead of resetting to defaults
  const wrappedParsed = extractUpdatedDataFromPostResponse({
    status: 'success',
    updatedData: {
      data: {
        profileName: 'Wrapped Hub',
        theme: 'pink',
        links: [],
      },
    },
  });
  assert.ok(wrappedParsed);
  assert.equal(wrappedParsed.profileName, 'Wrapped Hub');
  assert.equal(wrappedParsed.theme, 'pink');

  // Non-HubData status object must return null rather than overwriting state with defaults
  assert.equal(
    extractUpdatedDataFromPostResponse({ status: 'success', updatedData: { status: 'saved' } }),
    null
  );
});

test('shouldSuppressCloudPull blocks GET while saving and within 5s post-save cooldown', () => {
  assert.equal(POST_SAVE_GET_COOLDOWN_MS, 5000);
  assert.equal(shouldSuppressCloudPull({ isSaving: true, lastSaveAt: 0, now: 10000 }), true);
  assert.equal(shouldSuppressCloudPull({ isSaving: false, lastSaveAt: 10000, now: 14999 }), true);
  assert.equal(shouldSuppressCloudPull({ isSaving: false, lastSaveAt: 10000, now: 15000 }), false);
  assert.equal(shouldSuppressCloudPull({ isSaving: false, lastSaveAt: 0, now: 10000 }), false);
});

test('syncMusicFields and sanitizeAndParseHubData preserve youtubeUrl, songTitle, musicCover, showPlayer, and autoPlay', () => {
  const base = createDefaultHubData();
  const synced = syncMusicFields({
    ...base,
    music: {
      ...base.music,
      enabled: false,
      youtubeUrl: 'https://youtu.be/5qap5aO4i9A',
      title: 'Chill Lofi Beats',
      coverImage: 'data:image/jpeg;base64,/9j/4AAQ',
      autoplay: true,
    },
  });

  assert.equal(synced.youtubeUrl, 'https://youtu.be/5qap5aO4i9A');
  assert.equal(synced.songTitle, 'Chill Lofi Beats');
  assert.equal(synced.musicCover, 'data:image/jpeg;base64,/9j/4AAQ');
  assert.equal(synced.showPlayer, false);
  assert.equal(synced.autoPlay, true);
  assert.equal(synced.music.songTitle, 'Chill Lofi Beats');
  assert.equal(synced.music.musicCover, 'data:image/jpeg;base64,/9j/4AAQ');
  assert.equal(synced.music.showPlayer, false);
  assert.equal(synced.music.autoPlay, true);

  // Hydrating from top-level alias keys alone also populates music cleanly
  const fromAliases = sanitizeAndParseHubData({
    youtubeUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    songTitle: 'Study Stream',
    musicCover: 'https://example.com/cover.jpg',
    showPlayer: true,
    autoPlay: true,
  });
  assert.ok(fromAliases);
  assert.equal(fromAliases.music.youtubeUrl, 'https://www.youtube.com/watch?v=jfKfPfyJRdk');
  assert.equal(fromAliases.music.title, 'Study Stream');
  assert.equal(fromAliases.music.coverImage, 'https://example.com/cover.jpg');
  assert.equal(fromAliases.music.enabled, true);
  assert.equal(fromAliases.music.autoplay, true);
});
