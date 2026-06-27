kick-videoad.js text/javascript
(function() {
    if ( /(^|\.)kick\.com$/.test(document.location.hostname) === false ) { return; }
    'use strict';
    var ourKickAdFreeVersion = 1;
    if (typeof window.kickAdFreeVersion !== 'undefined' && window.kickAdFreeVersion >= ourKickAdFreeVersion) { window.kickAdFreeVersion = ourKickAdFreeVersion; return; }
    window.kickAdFreeVersion = ourKickAdFreeVersion;
  var PLAYBACK_RE = /\/api\/v\d+\/stream\/[0-9a-f-]+\/playback/i;
  var AD_HOSTS = [
    'securepubads.g.doubleclick.net',
    'pagead2.googlesyndication.com',
    'googlesyndication.com',
    'googleadservices.com',
    'tpc.googlesyndication.com',
    'imasdk.googleapis.com',
    'ad.doubleclick.net',
    'cm.g.doubleclick.net',
    'adservice.google.com',
    'kickproduction.api.useinsider.com',
  ];
  var LOG = true;
  function log() {
    if (!LOG) return;
    try { console.log.apply(console, ['%c[KAF]', 'color:#53fc18;font-weight:bold'].concat([].slice.call(arguments))); } catch (e) {}
  }
  function hostMatches(url) {
    if (!url) return false;
    var u = String(url);
    for (var i = 0; i < AD_HOSTS.length; i++) {
      if (u.indexOf(AD_HOSTS[i]) !== -1) return true;
    }
    return false;
  }
  var __kafBannerTimer = null;
  function kafPlayerRoot() {
    var v = document.querySelector('video');
    if (!v) return null;
    var el = v.parentElement;
    for (var i = 0; i < 5 && el && el.parentElement; i++) {
      if (el.clientWidth >= 320 && el.clientHeight >= 180) break;
      el = el.parentElement;
    }
    return el || v.parentElement;
  }
  function kafEnsureBanner() {
    var root = kafPlayerRoot();
    if (!root) return null;
    var div = root.querySelector(':scope > .kaf-adblock-overlay');
    if (!div) {
      try { if (getComputedStyle(root).position === 'static') root.style.position = 'relative'; } catch (e) {}
      div = document.createElement('div');
      div.className = 'kaf-adblock-overlay';
      div.innerHTML = '<div style="color:#fff;background:rgba(0,0,0,0.8);position:absolute;top:8px;left:8px;padding:4px 9px;font:600 12px/1.4 Inter,Arial,sans-serif;border-radius:4px;z-index:2147483647;pointer-events:none;display:flex;align-items:center;gap:6px;"><span style="color:#53fc18;font-size:10px;">●</span><span class="kaf-txt"></span></div>';
      div.style.display = 'none';
      div.__txt = div.querySelector('.kaf-txt');
      root.appendChild(div);
    }
    return div;
  }
  function kafSetBanner(show, label) {
    var div = kafEnsureBanner();
    if (!div) return;
    if (show && div.__txt) div.__txt.textContent = label || 'Blocking ads';
    div.style.display = show ? 'block' : 'none';
  }
  function flagAdBlocking(label) {
    kafSetBanner(true, label);
    if (__kafBannerTimer) clearTimeout(__kafBannerTimer);
    __kafBannerTimer = setTimeout(function () { kafSetBanner(false); }, 8000);
  }
  function neutralizePlayback(json) {
    if (!json || typeof json !== 'object') return false;
    var changed = [];
    var vp = json.video_player;
    if (vp) {
      ['google_ads_sdk', 'pal_sdk'].forEach(function (k) {
        var sdk = vp[k];
        if (sdk) {
          if (sdk.initiate_sdk) { sdk.initiate_sdk = false; changed.push(k + '.initiate_sdk'); }
          if (sdk.sdk_available) { sdk.sdk_available = false; changed.push(k + '.sdk_available'); }
        }
      });
    }
    var vs = json.video_session;
    if (vs && vs.auto_ads_enabled) { vs.auto_ads_enabled = false; changed.push('auto_ads_enabled'); }
    if (changed.length) log('playback flags disabled:', changed.join(', '));
    return changed.length > 0;
  }
  function scrubHls(text) {
    if (text.indexOf('#EXT-X-CUE-OUT') === -1 && text.indexOf('stitched-ad') === -1) {
      return null;
    }
    var lines = text.split('\n');
    var out = [];
    var skipping = false;
    var changed = false;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var t = line.trim();
      if (!skipping) {
        if (t === '#EXT-X-CUE-OUT' || t.indexOf('#EXT-X-CUE-OUT:') === 0) {
          skipping = 'cue';
          changed = true;
          if (out.length && out[out.length - 1].trim() === '#EXT-X-DISCONTINUITY') out.pop();
          continue;
        }
        if (t.indexOf('#EXT-X-DATERANGE') === 0 && t.indexOf('stitched-ad-break-start') !== -1) {
          skipping = 'ssai';
          changed = true;
          if (out.length && out[out.length - 1].trim() === '#EXT-X-DISCONTINUITY') out.pop();
          continue;
        }
        out.push(line);
      } else {
        if (skipping === 'cue' && t === '#EXT-X-CUE-IN') {
          skipping = false;
        } else if (skipping === 'ssai' && t.indexOf('stitched-ad-break-end') !== -1) {
          if (i + 1 < lines.length && lines[i + 1].trim() === '#EXT-X-DISCONTINUITY') i++;
          skipping = false;
        }
      }
    }
    if (!changed) return null;
    log('scrubbed stitched ad break from manifest');
    try { flagAdBlocking(); } catch (e) {}
    return out.join('\n');
  }
  function rebuildHeaders(response) {
    var h = new Headers();
    try {
      response.headers.forEach(function (v, k) {
        if (k.toLowerCase() !== 'content-length') h.append(k, v);
      });
    } catch (e) {}
    return h;
  }
  var origFetch = window.fetch;
  window.fetch = function (input, init) {
    var reqUrl = typeof input === 'string' ? input : (input && input.url) || '';
    if (hostMatches(reqUrl)) {
      log('blocked fetch:', reqUrl);
      return Promise.resolve(new Response('', { status: 204, statusText: 'No Content' }));
    }
    return origFetch.call(this, input, init).then(function (response) {
      var url = response.url || reqUrl;
      if (PLAYBACK_RE.test(url)) {
        return response.clone().json().then(function (json) {
          if (!neutralizePlayback(json)) return response;
          return new Response(JSON.stringify(json), {
            status: response.status, statusText: response.statusText, headers: rebuildHeaders(response),
          });
        }).catch(function () { return response; });
      }
      if (url.indexOf('.m3u8') !== -1) {
        return response.clone().text().then(function (text) {
          var scrubbed = scrubHls(text);
          if (scrubbed == null) return response;
          return new Response(scrubbed, {
            status: response.status, statusText: response.statusText, headers: rebuildHeaders(response),
          });
        }).catch(function () { return response; });
      }
      return response;
    });
  };
  var origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__kaf_url = typeof url === 'string' ? url : String(url);
    this.__kaf_blocked = hostMatches(this.__kaf_url);
    this.__kaf_scrubbed = null;
    return origOpen.apply(this, arguments);
  };
  var origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function () {
    if (this.__kaf_blocked) {
      log('blocked XHR:', this.__kaf_url);
      return;
    }
    return origSend.apply(this, arguments);
  };
  var rt = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'responseText');
  if (rt && rt.get) {
    Object.defineProperty(XMLHttpRequest.prototype, 'responseText', {
      configurable: true,
      get: function () {
        var orig = rt.get.call(this);
        var u = this.__kaf_url || '';
        if (PLAYBACK_RE.test(u)) {
          try {
            var json = JSON.parse(orig);
            if (neutralizePlayback(json)) return JSON.stringify(json);
          } catch (e) {}
          return orig;
        }
        if (u.indexOf('.m3u8') !== -1) {
          if (this.__kaf_scrubbed && this.__kaf_scrubbed.orig === orig) {
            return this.__kaf_scrubbed.text;
          }
          var scrubbed = scrubHls(orig);
          var finalText = scrubbed == null ? orig : scrubbed;
          this.__kaf_scrubbed = { orig: orig, text: finalText };
          return finalText;
        }
        return orig;
      },
    });
  }
  function freeze(obj) { try { Object.freeze(obj); } catch (e) {} return obj; }
  try {
    var noop = function () {};
    var fakeGoogletag = {
      cmd: { push: function (fn) { try { typeof fn === 'function' && fn(); } catch (e) {} return 0; } },
      pubads: function () {
        return {
          addEventListener: noop, removeEventListener: noop, refresh: noop,
          enableSingleRequest: noop, setTargeting: noop, disableInitialLoad: noop,
          collapseEmptyDivs: noop, getSlots: function () { return []; },
        };
      },
      defineSlot: function () { return fakeGoogletag.pubads(); },
      defineOutOfPageSlot: function () { return fakeGoogletag.pubads(); },
      enableServices: noop, display: noop, destroySlots: noop,
      apiReady: true, pubadsReady: true,
      sizeMapping: function () { return { addSize: function () { return this; }, build: function () { return []; } }; },
    };
    Object.defineProperty(window, 'googletag', {
      configurable: false, enumerable: true, writable: false, value: freeze(fakeGoogletag),
    });
  } catch (e) {}
  try {
    var fakeIma = {
      AdDisplayContainer: function () { this.initialize = function () {}; },
      AdsLoader: function () {
        this.addEventListener = function () {}; this.removeEventListener = function () {};
        this.requestAds = function () {}; this.getSettings = function () { return {}; }; this.destroy = function () {};
      },
      AdsManagerLoadedEvent: { Type: { ADS_MANAGER_LOADED: 'adsManagerLoaded' } },
      AdErrorEvent: { Type: { AD_ERROR: 'adError' } },
      AdsRequest: function () {},
      AdsRenderingSettings: function () {},
      ViewMode: { NORMAL: 'normal', FULLSCREEN: 'fullscreen' },
      settings: { setDisableCustomPlaybackForIOS10Plus: function () {}, setLocale: function () {} },
    };
    var g = window.google || {};
    g.ima = freeze(fakeIma);
    Object.defineProperty(window, 'google', { configurable: true, enumerable: true, value: g });
  } catch (e) {}
  var HIDE_CSS = [
    'iframe[src*="doubleclick"]',
    'iframe[src*="googlesyndication"]',
    'iframe[src*="imasdk"]',
    'ins.adsbygoogle',
    '[id^="google_ads_"]',
    '[id*="-ad-"]',
    '[class*="ad-banner"]',
    '[class*="ad-container"]',
    '[class*="advertisement"]',
    '[data-ad]',
  ].join(',') + '{display:none!important;height:0!important;width:0!important;}';
  function injectCss() {
    try {
      var s = document.createElement('style');
      s.textContent = HIDE_CSS;
      (document.head || document.documentElement).appendChild(s);
    } catch (e) {}
  }
  if (document.head || document.documentElement) injectCss();
  else document.addEventListener('readystatechange', function once() {
    if (document.head || document.documentElement) { injectCss(); document.removeEventListener('readystatechange', once); }
  });
  function pruneNode(node) {
    if (!node || node.nodeType !== 1) return;
    var src = node.src || (node.getAttribute && node.getAttribute('src'));
    if (src && hostMatches(src) && (node.tagName === 'SCRIPT' || node.tagName === 'IFRAME')) {
      try { node.remove(); log('removed ad element:', node.tagName, src); } catch (e) {}
    }
  }
  function startObserver() {
    try {
      var mo = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var added = muts[i].addedNodes;
          for (var j = 0; j < added.length; j++) pruneNode(added[j]);
        }
      });
      mo.observe(document.documentElement || document, { childList: true, subtree: true });
    } catch (e) {}
  }
  if (document.documentElement) startObserver();
  else document.addEventListener('readystatechange', function once() {
    if (document.documentElement) { startObserver(); document.removeEventListener('readystatechange', once); }
  });
  log('initialized on', location.host);
})();
