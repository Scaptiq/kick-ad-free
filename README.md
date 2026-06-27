<div align="center">

# 🟢 Kick Ad Free

**Block ads on [kick.com](https://kick.com) — straight inside uBlock Origin.**

No userscript manager, no extra extensions. Add it once and forget about it.

![Platform](https://img.shields.io/badge/platform-kick.com-53fc18)
![uBlock Origin](https://img.shields.io/badge/uBlock_Origin-required-800000)
![Browser](https://img.shields.io/badge/browser-Firefox_%7C_Brave-orange)

</div>

---

## ✨ What you get

| | |
|---|---|
| 🎯 **No stream ads** | Removes the ads that play before and during live streams |
| 🚫 **No interruptions** | Stops Kick from starting an ad break in the first place |
| 🧹 **No banners** | Hides leftover display ads and ad boxes around the page |
| 🟢 **See it working** | A small **“● Blocking ads”** badge appears on the player while an ad is being skipped |

---

## 🚀 Setup

> [!IMPORTANT]
> Works with **full uBlock Origin** on **Firefox** or **Brave**.
> The slimmed-down **uBlock Origin Lite** (default on Chrome) won’t work.

**1 · Turn on advanced mode**
Open uBlock Origin’s **Dashboard → Settings** and tick **“I am an advanced user.”**

**2 · Add the source link**
Click the **advanced settings** link that appears, find **`userResourcesLocation`**, and paste this in:

```
https://raw.githubusercontent.com/Scaptiq/kick-ad-free/main/kick-videoad.js
```

*(If something’s already there, just add a space before the link.)*

**3 · Switch it on**
Go to **Dashboard → My filters** and add this line, then click **Apply changes**:

```
kick.com##+js(kick-videoad.js)
```

**4 · Load it**
Go to **Dashboard → Filter lists → Purge all caches**, then reload Kick.

That’s it — open any stream and the ads are gone. 🎉

---

## ✅ Is it working?

Watch a stream that would normally show ads. When an ad break would have played,
you’ll see a small **“● Blocking ads”** badge in the top-left of the player instead,
and the stream keeps going. No badge during normal viewing = working as intended.

---

## 🔄 Staying up to date

You never have to reinstall or change your settings — the link always points at the
newest version. If Kick changes something and ads briefly reappear, refresh it:

**Dashboard → Filter lists → Purge all caches**, then reload Kick.

---

## ⚠️ Good to know

- Kick tweaks its ads from time to time, so a fix can occasionally be a day or two
  behind. If ads slip through, refresh as above and they’ll be blocked again once the
  update lands.
- For personal ad-blocking use.
