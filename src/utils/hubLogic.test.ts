import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SCRIPT_URL,
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
  extractYouTubeId,
  filterLinksByCategory,
  formatLinkDecoration,
  formatPlaybackTime,
  formatProfileFrame,
  getFaviconUrl,
  isNonEmptyCloudPayload,
  isValidScriptUrl,
  normalizeUrl,
  parseLinkDecoration,
  parseProfileFrame,
  reorderLinks,
  resolveScriptUrl,
  sanitizeAndParseHubData,
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

test('buildStandaloneHtml embeds profile name and serialized links cleanly', () => {
  const data = createDefaultHubData();
  const html = buildStandaloneHtml(data, 'https://script.google.com/macros/s/test/exec');
  assert.ok(html.includes('<!doctype html>'));
  assert.ok(html.includes('moogrob'));
  assert.ok(html.includes('https://script.google.com/macros/s/test/exec'));
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

test('DEFAULT_SCRIPT_URL, resolveScriptUrl, and buildCacheBustedScriptUrl handle cross-device auto-sync', () => {
  assert.equal(typeof DEFAULT_SCRIPT_URL, 'string');
  assert.equal(isValidScriptUrl(DEFAULT_SCRIPT_URL), false);
  assert.equal(isValidScriptUrl(''), false);
  assert.equal(isValidScriptUrl('https://script.google.com/macros/s/abc123/exec'), true);

  // New device with empty localStorage uses valid defaultUrl automatically
  assert.equal(
    resolveScriptUrl('', 'https://script.google.com/macros/s/default-id/exec'),
    'https://script.google.com/macros/s/default-id/exec'
  );
  // Explicit localStorage override wins over defaultUrl
  assert.equal(
    resolveScriptUrl(
      'https://script.google.com/macros/s/local-id/exec',
      'https://script.google.com/macros/s/default-id/exec'
    ),
    'https://script.google.com/macros/s/local-id/exec'
  );
  // Placeholder defaultUrl stays safe (no broken fetch)
  assert.equal(resolveScriptUrl('', DEFAULT_SCRIPT_URL), '');

  // Cache-busting ?t= query string
  assert.equal(
    buildCacheBustedScriptUrl('https://script.google.com/macros/s/abc/exec', 1700000000000),
    'https://script.google.com/macros/s/abc/exec?t=1700000000000'
  );
  assert.equal(
    buildCacheBustedScriptUrl('https://script.google.com/macros/s/abc/exec?v=1', 1700000000000),
    'https://script.google.com/macros/s/abc/exec?v=1&t=1700000000000'
  );
});

test('buildStandaloneHtml embeds ?t= cache buster and visibilitychange/focus auto-sync listeners', () => {
  const data = createDefaultHubData();
  const html = buildStandaloneHtml(data, 'https://script.google.com/macros/s/test/exec');
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

test('calculateContainedDimensions caps profile logos to 180x180 and profileImage key round-trips identically', () => {
  assert.equal(PROFILE_LOGO_MAX_PX, 180);
  assert.equal(PROFILE_LOGO_QUALITY, 0.75);
  assert.equal(PROFILE_LOGO_MAX_CHARS, 30000);

  assert.deepEqual(calculateContainedDimensions(1200, 800, 180), { width: 180, height: 120 });
  assert.deepEqual(calculateContainedDimensions(600, 1200, 180), { width: 90, height: 180 });
  assert.deepEqual(calculateContainedDimensions(120, 100, 180), { width: 120, height: 100 });

  const sampleData = {
    ...createDefaultHubData(),
    profileImage: 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4',
  };
  const postedPayload = JSON.parse(JSON.stringify({ data: sampleData }));
  assert.equal(postedPayload.data.profileImage, 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4');
  const hydrated = sanitizeAndParseHubData(postedPayload.data);
  assert.ok(hydrated);
  assert.equal(hydrated.profileImage, postedPayload.data.profileImage);
});
