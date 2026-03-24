// ==UserScript==
// @name         FreeStyle Musinsa Bridge
// @namespace    https://freestyle-six.vercel.app/
// @version      0.1.0
// @description  Capture Musinsa product URLs and open FreeStyle Studio with a bridge payload.
// @match        https://www.musinsa.com/*
// @match        https://musinsa.com/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const DEFAULT_FREESTYLE_STUDIO_ORIGIN = "https://freestyle-six.vercel.app";
  const BRIDGE_QUERY_PARAM = "musinsa_bridge";
  const MAX_ITEMS = 40;
  const BUTTON_ID = "freestyle-musinsa-bridge-button";
  const STYLE_ID = "freestyle-musinsa-bridge-style";
  const STUDIO_ORIGIN_STORAGE_KEY = "freestyle:musinsa-bridge-origin";

  const normalizeStudioOrigin = (value) => {
    if (!value || typeof value !== "string") return null;

    try {
      const parsed = new URL(value.trim());
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
      return parsed.origin;
    } catch {
      return null;
    }
  };

  const getStudioOrigin = () =>
    normalizeStudioOrigin(window.localStorage.getItem(STUDIO_ORIGIN_STORAGE_KEY)) ||
    DEFAULT_FREESTYLE_STUDIO_ORIGIN;

  const configureStudioOrigin = () => {
    const nextOrigin = window.prompt("FreeStyle Studio origin", getStudioOrigin());
    if (nextOrigin === null) return null;

    const normalizedOrigin = normalizeStudioOrigin(nextOrigin);
    if (!normalizedOrigin) {
      window.alert("Please enter a valid http(s) origin.");
      return null;
    }

    window.localStorage.setItem(STUDIO_ORIGIN_STORAGE_KEY, normalizedOrigin);
    return normalizedOrigin;
  };

  const encodePayload = (payload) => {
    const json = JSON.stringify(payload);

    if (typeof TextEncoder !== "undefined") {
      const bytes = new TextEncoder().encode(json);
      let binary = "";
      for (const byte of bytes) {
        binary += String.fromCharCode(byte);
      }
      return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    }

    return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  };

  const toAbsoluteUrl = (value) => {
    try {
      const parsed = new URL(value, window.location.href);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
      if (!parsed.hostname.includes("musinsa.com")) return null;
      if (!/^\/products\/\d+/.test(parsed.pathname)) return null;
      parsed.search = "";
      parsed.hash = "";
      return parsed.toString();
    } catch {
      return null;
    }
  };

  const normalizeTitle = (value) => {
    if (!value || typeof value !== "string") return undefined;
    const trimmed = value.replace(/\s+/g, " ").trim();
    return trimmed ? trimmed : undefined;
  };

  const collectProductItems = () => {
    const items = [];
    const seen = new Set();
    const anchors = Array.from(document.querySelectorAll('a[href*="/products/"]'));
    const pushItem = (url, title) => {
      if (!url || seen.has(url)) return;
      seen.add(url);
      items.push({
        url,
        title: normalizeTitle(title),
      });
    };

    if (window.location.pathname.includes("/products/")) {
      const currentUrl = toAbsoluteUrl(window.location.href);
      if (currentUrl) {
        pushItem(currentUrl, document.title);
      }
    }

    for (const anchor of anchors) {
      const href = anchor.getAttribute("href");
      if (!href) continue;
      const absolute = toAbsoluteUrl(href);
      if (!absolute) continue;
      pushItem(absolute, anchor.textContent);
      if (items.length >= MAX_ITEMS) break;
    }

    return items;
  };

  const buildPayload = () => {
    const items = collectProductItems();
    if (items.length === 0) return null;

    return {
      source: "musinsa-bridge",
      originUrl: window.location.href,
      capturedAt: new Date().toISOString(),
      items,
    };
  };

  const openStudio = (event) => {
    const payload = buildPayload();
    if (!payload) {
      window.alert("No Musinsa product URLs were found on this page.");
      return;
    }

    const studioOrigin = event && event.shiftKey ? configureStudioOrigin() : getStudioOrigin();
    if (!studioOrigin) return;

    const studioUrl = new URL("/studio", studioOrigin);
    studioUrl.searchParams.set(BRIDGE_QUERY_PARAM, encodePayload(payload));
    window.open(studioUrl.toString(), "_blank", "noopener,noreferrer");
  };

  const addStyles = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${BUTTON_ID} {
        position: fixed;
        right: 20px;
        bottom: 20px;
        z-index: 2147483647;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: 0;
        border-radius: 9999px;
        background: #111111;
        color: #ffffff;
        padding: 12px 16px;
        font: 700 13px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        letter-spacing: 0.02em;
        box-shadow: 0 18px 40px rgba(0, 0, 0, 0.24);
        cursor: pointer;
      }
      #${BUTTON_ID}:hover {
        background: #000000;
      }
      #${BUTTON_ID} span {
        opacity: 0.7;
        font-size: 11px;
        font-weight: 800;
      }
    `;
    document.head.appendChild(style);
  };

  const addButton = () => {
    if (document.getElementById(BUTTON_ID)) return;
    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.title = "Send captured Musinsa products to FreeStyle. Shift-click to change the Studio target.";
    button.textContent = "FreeStyle";

    const badge = document.createElement("span");
    badge.textContent = "Musinsa bridge";
    button.appendChild(badge);

    button.addEventListener("click", openStudio);
    document.body.appendChild(button);
  };

  const init = () => {
    addStyles();
    addButton();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
