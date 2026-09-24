// ============================================================
// common.js — 全ページ共通ロジック
// index.html / thread.html の両方から import される
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, deleteDoc, getDocs,
  collection, query, where, orderBy, limit, writeBatch
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
  setPersistence, browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ------------------------------------------------------------
// Firebase 初期化
// ------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBAqWSds8_tub6EQTFZDSXv0fzV8_agbOY",
  authDomain: "dongrikyouiku.firebaseapp.com",
  projectId: "dongrikyouiku",
  storageBucket: "dongrikyouiku.firebasestorage.app",
  messagingSenderId: "823517253864",
  appId: "1:823517253864:web:281ac2b5ce90bde048795d",
  measurementId: "G-6R28GJ1DN8"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('永続化設定失敗:', err);
});

// ------------------------------------------------------------
// コレクション名
// ------------------------------------------------------------
export const COL = {
  threads: 'manabi_threads',
  knownUsers: 'manabi_knownUsers',
  bannedUsers: 'manabi_bannedUsers',
  deviceBans: 'manabi_deviceBans',
  customBadges: 'manabi_customBadges',
  badgeFeatures: 'manabi_badgeFeatures',
  nicknames: 'manabi_nicknames',
  userDevices: 'manabi_userDevices',
  officialUsers: 'manabi_officialUsers',
  threadLikes: 'manabi_threadLikes',
  announcements: 'manabi_announcements',
  contactChats: 'manabi_contactChats',
  contactMessages: 'manabi_contactMessages',
  contactAdmins: 'manabi_contactAdmins'
};

// ------------------------------------------------------------
// 教科
// ------------------------------------------------------------
export const SUBJECTS = {
  math:     { id: 'math',     label: '数学',   icon: 'M' },
  science:  { id: 'science',  label: '理科',   icon: 'R' },
  social:   { id: 'social',   label: '社会',   icon: 'S' },
  japanese: { id: 'japanese', label: '国語',   icon: 'K' },
  english:  { id: 'english',  label: '英語',   icon: 'E' },
  other:    { id: 'other',    label: 'その他', icon: 'O' }
};
export function getSubjectInfo(id) {
  return SUBJECTS[id] || SUBJECTS.other;
}
export function subjectBadgeHtml(subjectId, showLabel = true) {
  const s = getSubjectInfo(subjectId);
  return `<span class="subject-badge ${s.id}">${s.icon}${showLabel ? ' ' + s.label : ''}</span>`;
}

// ------------------------------------------------------------
// ロール定数
// ------------------------------------------------------------
export const ROLE_ADMIN_EMAIL = "katou.noel114514@gmail.com";
export const ROLE_OWNER_EMAIL = "18107@v.nakijin.ed.jp";
export const ROLE_VIP_EMAILS = [
  "18104@v.nakijin.ed.jp",
  "setsu.setsuna1229@gmail.com",
  "roblox.2026.20th@gmail.com"
];

export function roleFromEmail(email) {
  if (email === ROLE_ADMIN_EMAIL) return 'admin';
  if (email === ROLE_OWNER_EMAIL) return 'owner';
  if (ROLE_VIP_EMAILS.includes(email)) return 'vip';
  return null;
}
export function isProtectedEmail(email) {
  if (!email) return false;
  const e = email.toLowerCase().trim();
  return e === ROLE_ADMIN_EMAIL.toLowerCase() || e === ROLE_OWNER_EMAIL.toLowerCase();
}

// ------------------------------------------------------------
// 画像
// ------------------------------------------------------------
export const IMAGE_MAX_WIDTH = 1280;
export const IMAGE_QUALITY = 0.75;
export const IMAGE_MAX_BASE64_SIZE = 200 * 1024;

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

export function fileToBase64Image(file) {
  return new Promise((resolve, reject) => {
    if (!file) { resolve(null); return; }
    if (!file.type.startsWith('image/')) {
      reject(new Error('画像ファイルを選択してください'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
      img.onload = () => {
        let { width, height } = img;
        if (width > IMAGE_MAX_WIDTH) {
          height = Math.round(height * (IMAGE_MAX_WIDTH / width));
          width = IMAGE_MAX_WIDTH;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        let quality = IMAGE_QUALITY;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > IMAGE_MAX_BASE64_SIZE && quality > 0.3) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        if (dataUrl.length > IMAGE_MAX_BASE64_SIZE) {
          reject(new Error('画像が大きすぎます。'));
          return;
        }
        resolve({
          dataUrl,
          name: file.name,
          type: 'image/jpeg',
          width,
          height,
          size: dataUrl.length
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export function buildFileHtml(file) {
  if (!file || !file.dataUrl) return '';
  const name = file.name || '添付画像';
  const dataUrl = file.dataUrl;
  return `
    <div class="post-file">
      <a href="${dataUrl}" target="_blank" rel="noopener noreferrer">
        <img src="${dataUrl}" alt="${escapeHtml(name)}" loading="lazy">
      </a>
      <a href="${dataUrl}" download="${escapeHtml(name)}">添付: ${escapeHtml(name)}（${formatSize(file.size)}）</a>
    </div>`;
}

// ------------------------------------------------------------
// リッチテキスト（サニタイズ / 自動リンク / 表示用変換）
// ------------------------------------------------------------
const ALLOWED_STYLE_PROPS = ['color', 'background-color', 'background'];

export function sanitizeRichHtml(html) {
  if (!html) return '';
  const temp = document.createElement('div');
  temp.innerHTML = html;

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) return;
    if (node.nodeType !== Node.ELEMENT_NODE) {
      node.remove();
      return;
    }
    const tag = node.tagName.toLowerCase();
    if (['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta'].includes(tag)) {
      node.remove();
      return;
    }
    if (!['span', 'br', 'div', 'p'].includes(tag)) {
      const parent = node.parentNode;
      while (node.firstChild) parent.insertBefore(node.firstChild, node);
      parent.removeChild(node);
      return;
    }
    const attrs = Array.from(node.attributes);
    attrs.forEach(attr => {
      const name = attr.name.toLowerCase();
      if (name !== 'style') {
        node.removeAttribute(attr.name);
        return;
      }
      const styleText = attr.value;
      const safeStyles = [];
      styleText.split(';').forEach(part => {
        const [propRaw, valRaw] = part.split(':').map(s => (s || '').trim());
        if (!propRaw || !valRaw) return;
        const prop = propRaw.toLowerCase();
        if (!ALLOWED_STYLE_PROPS.includes(prop)) return;
        if (!/^[#a-zA-Z0-9(),.%\s\-]+$/.test(valRaw)) return;
        if (/javascript|expression|url\s*\(/i.test(valRaw)) return;
        safeStyles.push(`${prop}: ${valRaw}`);
      });
      if (safeStyles.length > 0) {
        node.setAttribute('style', safeStyles.join('; '));
      } else {
        node.removeAttribute('style');
      }
    });
    Array.from(node.childNodes).forEach(walk);
  }

  Array.from(temp.childNodes).forEach(walk);
  let result = temp.innerHTML;
  result = result.replace(/<div[^>]*>/gi, '\n').replace(/<\/div>/gi, '');
  result = result.replace(/<p[^>]*>/gi, '\n').replace(/<\/p>/gi, '');
  result = result.replace(/\n{3,}/g, '\n\n');
  return result.trim();
}

export function autoLinkInHtml(html) {
  if (!html) return '';
  const temp = document.createElement('div');
  temp.innerHTML = html;

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue;
      const urlRegex = /(https?:\/\/[^\s<]+)/g;
      if (urlRegex.test(text)) {
        const frag = document.createDocumentFragment();
        let lastIndex = 0;
        text.replace(urlRegex, (url, _p, offset) => {
          if (offset > lastIndex) {
            frag.appendChild(document.createTextNode(text.substring(lastIndex, offset)));
          }
          const a = document.createElement('a');
          a.href = url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.className = 'text-blue-600 underline break-all';
          a.textContent = url;
          frag.appendChild(a);
          lastIndex = offset + url.length;
          return url;
        });
        if (lastIndex < text.length) {
          frag.appendChild(document.createTextNode(text.substring(lastIndex)));
        }
        node.parentNode.replaceChild(frag, node);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      Array.from(node.childNodes).forEach(walk);
    }
  }
  Array.from(temp.childNodes).forEach(walk);
  return temp.innerHTML;
}

export function renderRichContent(html) {
  if (!html) return '';
  return autoLinkInHtml(sanitizeRichHtml(html));
}

export function stripRichHtml(html) {
  if (!html) return '';
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return (temp.textContent || temp.innerText || '').replace(/\s+/g, ' ').trim();
}

export function formatContent(str) {
  if (!str) return '';
  return escapeHtml(str).replace(/\n/g, '<br>');
}

// ------------------------------------------------------------
// リッチエディタ
// ------------------------------------------------------------
const PRESET_TEXT_COLORS = [
  { color: '#dc2626', title: '赤' },
  { color: '#ea580c', title: 'オレンジ' },
  { color: '#ca8a04', title: '黄色' },
  { color: '#16a34a', title: '緑' },
  { color: '#0891b2', title: '水色' },
  { color: '#1d4ed8', title: '青' },
  { color: '#7c3aed', title: '紫' },
  { color: '#db2777', title: 'ピンク' },
  { color: '#78350f', title: '茶' },
  { color: '#4b5563', title: 'グレー' },
  { color: '#000000', title: '黒' }
];
const PRESET_HL_COLORS = [
  { color: '#fef08a', title: '黄色' },
  { color: '#fbcfe8', title: 'ピンク' },
  { color: '#bbf7d0', title: '緑' },
  { color: '#bfdbfe', title: '青' },
  { color: '#fed7aa', title: 'オレンジ' },
  { color: '#e9d5ff', title: '紫' },
  { color: '#fecaca', title: '赤' },
  { color: '#ccfbf1', title: 'ミント' }
];

function applyTextColor(wrapper, color) {
  const editor = wrapper.querySelector('.rich-editor');
  if (!editor) return;
  editor.focus();
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  if (range.collapsed) {
    const span = document.createElement('span');
    span.style.color = color;
    span.appendChild(document.createTextNode('\u200b'));
    range.insertNode(span);
    const nr = document.createRange();
    nr.selectNodeContents(span);
    nr.collapse(false);
    selection.removeAllRanges();
    selection.addRange(nr);
  } else {
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('foreColor', false, color);
  }
}

function applyHighlight(wrapper, color) {
  const editor = wrapper.querySelector('.rich-editor');
  if (!editor) return;
  editor.focus();
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  if (range.collapsed) {
    const span = document.createElement('span');
    span.style.backgroundColor = color;
    span.appendChild(document.createTextNode('\u200b'));
    range.insertNode(span);
    const nr = document.createRange();
    nr.selectNodeContents(span);
    nr.collapse(false);
    selection.removeAllRanges();
    selection.addRange(nr);
  } else {
    try {
      const span = document.createElement('span');
      span.style.backgroundColor = color;
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
      selection.removeAllRanges();
      const nr = document.createRange();
      nr.selectNodeContents(span);
      selection.addRange(nr);
    } catch (e) {
      document.execCommand('hiliteColor', false, color);
    }
  }
}

function removeFormatting(wrapper) {
  const editor = wrapper.querySelector('.rich-editor');
  if (!editor) return;
  editor.focus();
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  if (range.collapsed) {
    let node = range.startContainer;
    while (node && node !== editor) {
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SPAN') {
        node.style.color = '';
        node.style.backgroundColor = '';
        if (!node.style.cssText) {
          const p = node.parentNode;
          while (node.firstChild) p.insertBefore(node.firstChild, node);
          p.removeChild(node);
        }
        break;
      }
      node = node.parentNode;
    }
  } else {
    const contents = range.extractContents();
    const walker = document.createTreeWalker(contents, NodeFilter.SHOW_ELEMENT);
    const unwrap = [];
    let n;
    while ((n = walker.nextNode())) {
      if (n.tagName === 'SPAN') {
        n.style.color = '';
        n.style.backgroundColor = '';
        if (!n.style.cssText) unwrap.push(n);
      }
    }
    unwrap.forEach(span => {
      const p = span.parentNode;
      while (span.firstChild) p.insertBefore(span.firstChild, span);
      p.removeChild(span);
    });
    range.insertNode(contents);
  }
}

export function createRichEditor(wrapper, placeholder = '', initialHtml = '') {
  wrapper.innerHTML = '';

  const toolbar = document.createElement('div');
  toolbar.className = 'rich-toolbar';

  // 文字色グループ
  const textGroup = document.createElement('div');
  textGroup.className = 'rich-toolbar-group';
  const tLabel = document.createElement('span');
  tLabel.className = 'rich-toolbar-label';
  tLabel.textContent = '文字色:';
  textGroup.appendChild(tLabel);

  PRESET_TEXT_COLORS.forEach(preset => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rich-color-btn';
    btn.style.background = preset.color;
    btn.title = preset.title;
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      applyTextColor(wrapper, preset.color);
    });
    textGroup.appendChild(btn);
  });

  const customTextWrap = document.createElement('div');
  customTextWrap.className = 'rich-color-picker-wrap';
  customTextWrap.style.marginLeft = '4px';
  const customTextLabel = document.createElement('label');
  customTextLabel.textContent = '自由色';
  customTextLabel.title = '自由な色（文字）';
  const customTextInput = document.createElement('input');
  customTextInput.type = 'color';
  customTextInput.value = '#dc2626';
  customTextInput.title = '自由な色を選ぶ';
  customTextInput.addEventListener('input', () => {
    applyTextColor(wrapper, customTextInput.value);
  });
  customTextWrap.appendChild(customTextLabel);
  customTextWrap.appendChild(customTextInput);
  textGroup.appendChild(customTextWrap);
  toolbar.appendChild(textGroup);

  // 蛍光グループ
  const hlGroup = document.createElement('div');
  hlGroup.className = 'rich-toolbar-group';
  const hlLabel = document.createElement('span');
  hlLabel.className = 'rich-toolbar-label';
  hlLabel.textContent = '蛍光:';
  hlGroup.appendChild(hlLabel);

  PRESET_HL_COLORS.forEach(preset => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rich-color-btn';
    btn.style.background = preset.color;
    btn.title = preset.title + '（蛍光）';
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      applyHighlight(wrapper, preset.color);
    });
    hlGroup.appendChild(btn);
  });

  const customHlWrap = document.createElement('div');
  customHlWrap.className = 'rich-color-picker-wrap';
  customHlWrap.style.marginLeft = '4px';
  const customHlLabel = document.createElement('label');
  customHlLabel.textContent = '蛍光自由';
  customHlLabel.title = '自由な色（蛍光）';
  const customHlInput = document.createElement('input');
  customHlInput.type = 'color';
  customHlInput.value = '#fef08a';
  customHlInput.title = '自由な蛍光色を選ぶ';
  customHlInput.addEventListener('input', () => {
    applyHighlight(wrapper, customHlInput.value);
  });
  customHlWrap.appendChild(customHlLabel);
  customHlWrap.appendChild(customHlInput);
  hlGroup.appendChild(customHlWrap);
  toolbar.appendChild(hlGroup);

  // 装飾解除グループ
  const clearGroup = document.createElement('div');
  clearGroup.className = 'rich-toolbar-group';
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'rich-toolbar-btn clear';
  clearBtn.innerHTML = '✕ 装飾を解除';
  clearBtn.title = '選択範囲の色・蛍光を解除';
  clearBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    removeFormatting(wrapper);
  });
  clearGroup.appendChild(clearBtn);
  toolbar.appendChild(clearGroup);

  wrapper.appendChild(toolbar);

  const editor = document.createElement('div');
  editor.className = 'rich-editor';
  editor.contentEditable = 'true';
  editor.setAttribute('data-placeholder', placeholder);
  if (initialHtml) editor.innerHTML = initialHtml;
  wrapper.appendChild(editor);

  // ペースト時のサニタイズ
  editor.addEventListener('paste', (e) => {
    e.preventDefault();
    const html = (e.clipboardData || window.clipboardData).getData('text/html');
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    if (html) {
      const sanitized = sanitizeRichHtml(html);
      document.execCommand('insertHTML', false, sanitized);
    } else if (text) {
      document.execCommand('insertText', false, text);
    }
  });

  return editor;
}

export function getEditorHtml(wrapper) {
  const e = wrapper.querySelector('.rich-editor');
  return e ? sanitizeRichHtml(e.innerHTML) : '';
}
export function getEditorText(wrapper) {
  const e = wrapper.querySelector('.rich-editor');
  return e ? (e.textContent || '').replace(/\u200b/g, '').trim() : '';
}
export function clearEditor(wrapper) {
  const e = wrapper.querySelector('.rich-editor');
  if (e) e.innerHTML = '';
}
export function setEditorHtml(wrapper, html) {
  const e = wrapper.querySelector('.rich-editor');
  if (e) e.innerHTML = html || '';
}

// ------------------------------------------------------------
// 検索トークン
// ------------------------------------------------------------
export function tokenizeQuery(query) {
  if (!query) return [];
  const n = query.replace(/　/g, ' ').toLowerCase().trim();
  if (!n) return [];
  return n.split(/\s+/).filter(t => t.length > 0);
}

export function matchesAllTokens(text, tokens) {
  if (!text || tokens.length === 0) return false;
  const l = text.toLowerCase();
  return tokens.every(tok => l.includes(tok));
}

export function countTokenHits(text, tokens) {
  if (!text) return 0;
  const l = text.toLowerCase();
  return tokens.filter(tok => l.includes(tok)).length;
}

export function highlightTokens(escapedHtml, tokens) {
  if (!escapedHtml || tokens.length === 0) return escapedHtml;
  let result = escapedHtml;
  const sorted = [...tokens].sort((a, b) => b.length - a.length);
  sorted.forEach(tok => {
    if (!tok) return;
    const escapedTok = tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escapedTok, 'gi');
    result = result.replace(re, (match) => `<mark class="hl">${match}</mark>`);
  });
  return result;
}

// ------------------------------------------------------------
// BANユーティリティ
// ------------------------------------------------------------
export function emailToKey(email) {
  if (!email) return '';
  const lower = email.toLowerCase().trim();
  let h1 = 0x811c9dc5;
  for (let i = 0; i < lower.length; i++) {
    h1 ^= lower.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  return 'em_' + (h1 >>> 0).toString(16).padStart(8, '0');
}

export function generateFingerprint() {
  const parts = [
    navigator.userAgent,
    navigator.language,
    (navigator.languages || []).join(','),
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.platform || '',
    navigator.hardwareConcurrency || '',
    navigator.deviceMemory || '',
    navigator.maxTouchPoints || 0
  ];
  const raw = parts.join('|');
  function hash(str) {
    let h1 = 0x811c9dc5, h2 = 0xcbf29ce4;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      h1 ^= c;
      h1 = Math.imul(h1, 0x01000193);
      h2 ^= c;
      h2 = Math.imul(h2, 0x01000193);
    }
    return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
  }
  return 'fp_' + hash(raw);
}

// ------------------------------------------------------------
// localStorage ユーティリティ
// ------------------------------------------------------------
export function badgeStorageKey(email) {
  return 'manabi_badgeVisible_' + (email || 'anonymous');
}
export function loadBadgeVisibility(email) {
  const v = localStorage.getItem(badgeStorageKey(email));
  return v === null ? true : v === 'true';
}
export function saveBadgeVisibility(email, visible) {
  localStorage.setItem(badgeStorageKey(email), visible ? 'true' : 'false');
}

export function emailStorageKey(email) {
  return 'manabi_emailVisible_' + (email || 'anonymous');
}
export function loadEmailVisibility(email) {
  const v = localStorage.getItem(emailStorageKey(email));
  return v === null ? true : v === 'true';
}
export function saveEmailVisibility(email, visible) {
  localStorage.setItem(emailStorageKey(email), visible ? 'true' : 'false');
}

export function subjectStorageKey() { return 'manabi_subjectFilter'; }
export function loadSubjectFilter() {
  return localStorage.getItem(subjectStorageKey()) || 'all';
}
export function saveSubjectFilter(s) {
  localStorage.setItem(subjectStorageKey(), s);
}

export function newMarkSettingKey(uid) {
  return 'manabi_newMarkEnabled_' + (uid || 'anonymous');
}
export function loadNewMarkSetting(uid) {
  const v = localStorage.getItem(newMarkSettingKey(uid));
  return v === null ? true : v === 'true';
}
export function saveNewMarkSetting(uid, enabled) {
  localStorage.setItem(newMarkSettingKey(uid), enabled ? 'true' : 'false');
}

export function readThreadsKey(uid) {
  return 'manabi_readThreads_' + (uid || 'anonymous');
}
export function loadReadThreads(uid) {
  try {
    const v = localStorage.getItem(readThreadsKey(uid));
    const parsed = v ? JSON.parse(v) : {};
    const cleaned = {};
    Object.entries(parsed).forEach(([tid, ts]) => {
      if (typeof ts === 'number' && !isNaN(ts) && ts > 0) cleaned[tid] = ts;
    });
    return cleaned;
  } catch (e) {
    return {};
  }
}
export function saveReadThreads(uid, data) {
  try {
    localStorage.setItem(readThreadsKey(uid), JSON.stringify(data));
  } catch (e) {
    console.warn('既読記録の保存に失敗:', e);
  }
}

// ------------------------------------------------------------
// ステータスバナー
// ------------------------------------------------------------
let bannerTimer = null;
export function showBanner(msg, isError = true) {
  const b = document.getElementById('statusBanner');
  if (!b) return;
  b.textContent = msg;
  b.className = (isError ? 'bg-red-600' : 'bg-green-600') + ' text-white show';
  b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;text-align:center;padding:6px;font-size:12px;transform:translateY(0);';
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => {
    b.style.transform = 'translateY(-100%)';
  }, 4000);
}

// ------------------------------------------------------------
// 権限ヘルパー（現在のユーザー / role をまとめて判定）
// ------------------------------------------------------------
export function createPermissionHelpers(getUser, getRole, getBadgeFeatures) {
  function canDo(feature) {
    const role = getRole();
    if (role === 'admin' || role === 'owner') return true;
    if (role === 'vip' && (feature === 'canDeletePost' || feature === 'canDeleteThread')) return true;
    const u = getUser();
    if (u && u.uid) {
      const perms = getBadgeFeatures();
      if (perms[u.uid] && perms[u.uid][feature]) return true;
    }
    return false;
  }
  return {
    canDelete: () => {
      const r = getRole();
      return r === 'admin' || r === 'owner' || r === 'vip';
    },
    canBackup: () => {
      const r = getRole();
      if (r === 'admin' || r === 'owner') return true;
      return canDo('canBackup');
    },
    canManageBadge: () => {
      const r = getRole();
      if (r === 'admin' || r === 'owner') return true;
      return canDo('canManageBadge');
    },
    canBan: () => {
      const r = getRole();
      if (r === 'admin' || r === 'owner') return true;
      return canDo('canBan');
    },
    canViewEmail: () => {
      const r = getRole();
      if (r === 'admin' || r === 'owner') return true;
      return canDo('canViewEmail');
    },
    canDo
  };
}
