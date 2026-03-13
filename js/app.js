/* ============================================================
   UNDERCOVER — App Controller
   ============================================================ */

'use strict';

const SCREENS = [
  'screen-home',
  'screen-setup',
  'screen-briefing',
  'screen-distribute',
  'screen-turn',
  'screen-vote',
  'screen-vote-result',
  'screen-tie',
  'screen-victory',
  'screen-rules',
  'screen-settings',
  'screen-words'
];

const PRESETS = {
  classic: {
    id: 'classic',
    name: 'Classique',
    icon: 'icon-preset-classic',
    minPlayers: 3,
    roles: { lover: false, ghost: false, vengeful: false, boomerang: false, goddess: false },
    description: 'Le mode pur et dur. Pas de fioritures, que du bluff et de la déduction.'
  },
  haunted: {
    id: 'haunted',
    name: 'Hanté',
    icon: 'icon-preset-haunted',
    minPlayers: 4,
    roles: { lover: false, ghost: true, vengeful: false, boomerang: false, goddess: false },
    description: 'Un joueur éliminé revient murmurer depuis l\'au-delà... Méfiance.'
  },
  love: {
    id: 'love',
    name: 'Love Story',
    icon: 'icon-preset-love',
    minPlayers: 5,
    roles: { lover: true, ghost: false, vengeful: false, boomerang: false, goddess: true },
    description: 'Deux âmes liées par le destin. Si l\'un tombe, l\'autre suit.'
  },
  strategic: {
    id: 'strategic',
    name: 'Stratégique',
    icon: 'icon-preset-strategic',
    minPlayers: 5,
    roles: { lover: false, ghost: false, vengeful: true, boomerang: true, goddess: true },
    description: 'Chaque vote compte double. Réfléchis avant de pointer du doigt.'
  },
  vendetta: {
    id: 'vendetta',
    name: 'Vendetta',
    icon: 'icon-preset-vendetta',
    minPlayers: 5,
    roles: { lover: false, ghost: false, vengeful: true, boomerang: true, goddess: false },
    description: 'Tu votes contre moi ? Mauvaise idée. Ici, la vengeance est reine.'
  },
  drama: {
    id: 'drama',
    name: 'Drama',
    icon: 'icon-preset-drama',
    minPlayers: 6,
    roles: { lover: true, ghost: true, vengeful: true, boomerang: false, goddess: false },
    description: 'Amour, mort et vengeance. Un cocktail explosif.'
  },
  mindgames: {
    id: 'mindgames',
    name: 'Mind Games',
    icon: 'icon-preset-mindgames',
    minPlayers: 6,
    roles: { lover: false, ghost: true, vengeful: false, boomerang: true, goddess: true },
    description: 'Rien n\'est ce qu\'il semble. Les morts parlent et les votes mentent.'
  },
  fulldrama: {
    id: 'fulldrama',
    name: 'Full Drama',
    icon: 'icon-preset-fulldrama',
    minPlayers: 7,
    roles: { lover: true, ghost: true, vengeful: true, boomerang: false, goddess: true },
    description: 'Toutes les cartes sur la table... sauf celles qu\'on te cache.'
  },
  chaos: {
    id: 'chaos',
    name: 'Chaos Total',
    icon: 'icon-preset-chaos',
    minPlayers: 8,
    roles: { lover: true, ghost: true, vengeful: true, boomerang: true, goddess: true },
    description: 'Aucune règle n\'a de sens. Personne n\'est en sécurité.'
  },
  custom: {
    id: 'custom',
    name: 'Personnalisé',
    icon: 'icon-preset-custom',
    minPlayers: 3,
    roles: { lover: false, ghost: false, vengeful: false, boomerang: false, goddess: false },
    description: 'Ta partie, tes règles. Active ce que tu veux.'
  }
};


const DEFAULT_SETTINGS = {
  showVotes: true,
  tieRule: 'nobody',
  vibration: true
};

const STORAGE_KEYS = {
  settings: 'undercover_settings',
  lastPreset: 'undercover_last_preset',
  customRoles: 'undercover_custom_roles'
};

const App = {
  currentScreen: 'screen-home',
  settings: Object.assign({}, DEFAULT_SETTINGS),
  selectedPreset: 'classic',
  customRoles: { lover: false, ghost: false, vengeful: false, boomerang: false, goddess: false },
  game: null,
  ui: null
};

let CURRENT_LANG = null;

function loadJsonResource(path) {
  return fetch(path, { cache: 'no-cache' }).then(function (response) {
    if (!response.ok) throw new Error('HTTP ' + String(response.status) + ' on ' + path);
    return response.json();
  });
}

function loadExternalData() {
  return Promise.all([
    loadJsonResource('lang.json').catch(function () { return null; }),
    loadJsonResource('words.json').catch(function () { return null; })
  ]).then(function (results) {
    const lang = results[0];
    const words = results[1];

    CURRENT_LANG = lang;
    window.LANG_FR_DATA = lang;
    window.WORDS_DB_DATA = words;
  });
}

function resolveI18nPath(source, key) {
  if (!source || !key) return undefined;
  return String(key).split('.').reduce(function (acc, chunk) {
    if (acc && Object.prototype.hasOwnProperty.call(acc, chunk)) return acc[chunk];
    return undefined;
  }, source);
}

function interpolateI18n(template, params) {
  const data = params || {};
  return String(template).replace(/\{\s*([^{}\s]+)\s*\}/g, function (_match, token) {
    if (Object.prototype.hasOwnProperty.call(data, token)) {
      const value = data[token];
      return value == null ? '' : String(value);
    }
    return '{' + token + '}';
  });
}

function t(key, params) {
  const value = resolveI18nPath(CURRENT_LANG, key);
  if (typeof value === 'string') return interpolateI18n(value, params);
  return key;
}

function initI18n(rootElement) {
  const root = rootElement || document;
  if (!root || !CURRENT_LANG) return;

  root.querySelectorAll('[data-i18n]').forEach(function (node) {
    const key = node.getAttribute('data-i18n');
    if (!key) return;
    node.textContent = t(key);
  });

  root.querySelectorAll('[data-i18n-placeholder]').forEach(function (node) {
    const key = node.getAttribute('data-i18n-placeholder');
    if (!key) return;
    node.setAttribute('placeholder', t(key));
  });
}

window.t = t;
window.initI18n = initI18n;

function vibrate(duration) {
  const ms = typeof duration === 'number' ? duration : 12;
  if (App.settings.vibration && navigator.vibrate) navigator.vibrate(ms);
}

function navigateTo(screenId) {
  if (!SCREENS.includes(screenId)) return;

  const target = document.getElementById(screenId);
  const current = document.getElementById(App.currentScreen);
  if (!target) return;

  if (!current || current === target) {
    document.querySelectorAll('.screen.active').forEach(function (el) {
      el.classList.remove('active');
    });
    target.classList.add('active');
    App.currentScreen = screenId;
    onScreenChange(screenId);
    return;
  }

  current.style.opacity = '0';
  current.style.transform = 'translateY(-10px)';
  setTimeout(function () {
    current.classList.remove('active');
    current.style.opacity = '';
    current.style.transform = '';

    target.classList.add('screen-entering');
    void target.offsetHeight;
    target.classList.remove('screen-entering');
    target.classList.add('active');

    App.currentScreen = screenId;
    onScreenChange(screenId);
  }, 220);
}

function onScreenChange(screenId) {
  if (!App.ui) return;
  const screen = document.getElementById(screenId);
  if (screen) initI18n(screen);
  if (screenId === 'screen-words') App.ui.renderWords(App.game);
  if (screenId === 'screen-settings') applySettingsToUI();
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    if (raw) App.settings = Object.assign({}, DEFAULT_SETTINGS, JSON.parse(raw));
  } catch (_err) {
    App.settings = Object.assign({}, DEFAULT_SETTINGS);
  }

  try {
    const preset = localStorage.getItem(STORAGE_KEYS.lastPreset);
    if (preset && PRESETS[preset]) App.selectedPreset = preset;
  } catch (_err) {
    App.selectedPreset = 'classic';
  }

  try {
    const custom = localStorage.getItem(STORAGE_KEYS.customRoles);
    if (custom) {
      const parsed = JSON.parse(custom);
      App.customRoles = Object.assign({}, App.customRoles, parsed);
    }
  } catch (_err) {
    App.customRoles = { lover: false, ghost: false, vengeful: false, boomerang: false, goddess: false };
  }
}

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(App.settings));
  } catch (_err) {
    // ignore
  }
}

function savePresetPreferences() {
  try {
    localStorage.setItem(STORAGE_KEYS.lastPreset, App.selectedPreset);
    localStorage.setItem(STORAGE_KEYS.customRoles, JSON.stringify(App.customRoles));
  } catch (_err) {
    // ignore
  }
}

function applySettingsToUI() {
  const showVotes = document.getElementById('setting-show-votes');
  const tieRule = document.getElementById('setting-tie-rule');
  const vibrationToggle = document.getElementById('setting-vibration');
  if (showVotes) showVotes.checked = !!App.settings.showVotes;
  if (tieRule) tieRule.value = App.settings.tieRule;
  if (vibrationToggle) vibrationToggle.checked = !!App.settings.vibration;
}

function initSettingsScreen() {
  const showVotes = document.getElementById('setting-show-votes');
  const tieRule = document.getElementById('setting-tie-rule');
  const vibrationToggle = document.getElementById('setting-vibration');
  const resetBtn = document.getElementById('btn-reset-settings');

  showVotes.addEventListener('change', function () {
    App.settings.showVotes = !!showVotes.checked;
    saveSettings();
  });

  tieRule.addEventListener('change', function () {
    App.settings.tieRule = tieRule.value === 'revote' ? 'revote' : 'nobody';
    saveSettings();
  });

  vibrationToggle.addEventListener('change', function () {
    App.settings.vibration = !!vibrationToggle.checked;
    saveSettings();
  });

  resetBtn.addEventListener('click', function () {
    App.settings = Object.assign({}, DEFAULT_SETTINGS);
    applySettingsToUI();
    saveSettings();
    vibrate(20);
  });
}

function initNavigation() {
  document.addEventListener('click', function (event) {
    const nav = event.target.closest('[data-navigate]');
    if (!nav) return;
    const target = nav.dataset.navigate;
    if (!target) return;
    navigateTo(target);
    vibrate(8);
  });
}

function getPresetRoles() {
  if (App.selectedPreset === 'custom') {
    return Object.assign({}, App.customRoles);
  }
  return Object.assign({}, PRESETS[App.selectedPreset].roles);
}

function hasAnySpecialRole(roles) {
  return !!(roles.lover || roles.ghost || roles.vengeful || roles.boomerang || roles.goddess);
}

function renderPresetCards() {
  const grid = document.getElementById('preset-grid');
  grid.innerHTML = '';

  Object.keys(PRESETS).forEach(function (key) {
    const preset = PRESETS[key];
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'preset-card';
    if (key === App.selectedPreset) card.classList.add('active');

    const title = document.createElement('span');
    title.className = 'preset-title';
    if (preset.icon) {
      const icon = document.createElement('span');
      icon.className = 'preset-icon ' + preset.icon;
      icon.setAttribute('aria-hidden', 'true');
      title.appendChild(icon);
    }
    title.appendChild(document.createTextNode(preset.name));

    const desc = document.createElement('span');
    desc.className = 'preset-desc';
    desc.textContent = preset.description;

    card.appendChild(title);
    card.appendChild(desc);
    card.addEventListener('click', function () {
      App.selectedPreset = key;
      savePresetPreferences();
      renderPresetCards();
      updatePresetValidation();
      updateCustomRoleVisibility();
      vibrate(8);
    });
    grid.appendChild(card);
  });
}

function updateCustomRoleVisibility() {
  const wrap = document.getElementById('custom-roles-wrap');
  const isCustom = App.selectedPreset === 'custom';
  wrap.hidden = !isCustom;
}

function bindCustomRoleToggles() {
  const map = {
    lover: document.getElementById('custom-role-lover'),
    ghost: document.getElementById('custom-role-ghost'),
    vengeful: document.getElementById('custom-role-vengeful'),
    boomerang: document.getElementById('custom-role-boomerang'),
    goddess: document.getElementById('custom-role-goddess')
  };

  Object.keys(map).forEach(function (key) {
    const input = map[key];
    input.checked = !!App.customRoles[key];
    input.addEventListener('change', function () {
      App.customRoles[key] = !!input.checked;
      savePresetPreferences();
      updatePresetValidation();
    });
  });
}

function updatePresetValidation() {
  const players = parseInt(document.getElementById('player-count').value, 10);
  const startBtn = document.getElementById('btn-start-game');
  const msg = document.getElementById('preset-min-players-msg');
  const preset = PRESETS[App.selectedPreset];

  let minPlayers = preset.minPlayers;
  if (App.selectedPreset === 'custom') {
    const roles = getPresetRoles();
    if (roles.lover || roles.vengeful || roles.goddess || roles.boomerang) minPlayers = Math.max(minPlayers, 5);
    if (roles.lover && roles.ghost && roles.vengeful) minPlayers = Math.max(minPlayers, 6);
    if (roles.lover && roles.ghost && roles.vengeful && roles.goddess && roles.boomerang) minPlayers = Math.max(minPlayers, 8);
  }

  if (players < minPlayers) {
    msg.hidden = false;
    msg.textContent = 'Ce mode necessite au minimum ' + String(minPlayers) + ' joueurs.';
    startBtn.disabled = true;
  } else {
    msg.hidden = true;
    msg.textContent = '';
    startBtn.disabled = false;
  }
}

function initSetupScreen() {
  const playerCountSlider = document.getElementById('player-count');
  const playerCountValue = document.getElementById('player-count-value');
  const undercoverSlider = document.getElementById('undercover-count');
  const undercoverValue = document.getElementById('undercover-count-value');
  const mrWhiteToggle = document.getElementById('mr-white-toggle');
  const namesContainer = document.getElementById('player-names-container');
  const startButton = document.getElementById('btn-start-game');
  const errorBox = document.getElementById('setup-error');
  const briefingStartBtn = document.getElementById('btn-briefing-start');
  const briefingTopBtn = document.getElementById('btn-briefing-top');

  function showError(message) {
    errorBox.hidden = false;
    errorBox.textContent = message;
  }

  function hideError() {
    errorBox.hidden = true;
    errorBox.textContent = '';
  }

  function updateUndercoverRange() {
    const playerCount = parseInt(playerCountSlider.value, 10);
    const withMrWhite = mrWhiteToggle.checked ? 1 : 0;
    const maxByRule = Math.floor(playerCount / 3);
    const maxByRemainingCivils = playerCount - withMrWhite - 2;
    const max = Math.max(1, Math.min(maxByRule, maxByRemainingCivils));

    undercoverSlider.max = String(max);
    if (parseInt(undercoverSlider.value, 10) > max) undercoverSlider.value = String(max);
    undercoverValue.textContent = undercoverSlider.value;
  }

  function renderPlayerNameInputs() {
    const count = parseInt(playerCountSlider.value, 10);
    const oldValues = Array.from(namesContainer.querySelectorAll('input')).map(function (input) {
      return input.value;
    });

    playerCountValue.textContent = String(count);
    namesContainer.innerHTML = '';

    for (let i = 0; i < count; i += 1) {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'player-name-input';
      input.maxLength = 24;
      input.autocomplete = 'off';
      input.placeholder = 'Joueur ' + String(i + 1);
      input.value = oldValues[i] || '';
      namesContainer.appendChild(input);
    }

    updateUndercoverRange();
    updatePresetValidation();
  }

  function readSetupConfig() {
    const playerCount = parseInt(playerCountSlider.value, 10);
    const undercoverCount = parseInt(undercoverSlider.value, 10);
    const mrWhite = !!mrWhiteToggle.checked;
    const category = document.getElementById('word-category').value;

    const names = [];
    const used = new Set();
    namesContainer.querySelectorAll('.player-name-input').forEach(function (input, index) {
      const base = input.value.trim() || ('Joueur ' + String(index + 1));
      let name = base;
      let i = 2;
      while (used.has(name.toLowerCase())) {
        name = base + ' (' + String(i) + ')';
        i += 1;
      }
      used.add(name.toLowerCase());
      names.push(name);
    });

    const civilCount = playerCount - undercoverCount - (mrWhite ? 1 : 0);
    if (playerCount < 3) return { ok: false, message: 'Il faut au moins 3 joueurs.' };
    if (civilCount < 2) return { ok: false, message: 'Il faut au moins 2 Civils.' };

    const specialRoles = getPresetRoles();

    return {
      ok: true,
      config: {
        playerCount: playerCount,
        playerNames: names,
        undercoverCount: undercoverCount,
        mrWhite: mrWhite,
        category: category,
        presetId: App.selectedPreset,
        specialRoles: specialRoles
      }
    };
  }

  function launchFromSetup() {
    if (!App.game || !App.ui) return;
    const setup = readSetupConfig();
    if (!setup.ok) {
      showError(setup.message);
      return;
    }

    hideError();
    App.game.init(setup.config);
    App.game.distributeRoles();
    App.game.distributeSpecialRoles();

    if (hasAnySpecialRole(setup.config.specialRoles)) {
      App.ui.renderBriefing(App.game);
      navigateTo('screen-briefing');
    } else {
      App.ui.renderDistribute(App.game);
    }

    vibrate(18);
  }

  briefingStartBtn.addEventListener('click', function () {
    if (!App.game || !App.ui) return;
    App.ui.renderDistribute(App.game);
    vibrate(12);
  });

  briefingTopBtn.addEventListener('click', function () {
    if (!App.ui || !App.game) return;

    // Re-render pour rejouer l'explication puis recentrer la vue en haut.
    App.ui.renderBriefing(App.game);
    navigateTo('screen-briefing');

    const content = document.querySelector('#screen-briefing .screen-content');
    if (content && typeof content.scrollTo === 'function') {
      content.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const cards = document.getElementById('briefing-cards');
    if (cards) {
      cards.classList.remove('briefing-cards-flash');
      void cards.offsetWidth;
      cards.classList.add('briefing-cards-flash');
      setTimeout(function () {
        cards.classList.remove('briefing-cards-flash');
      }, 520);
    }

    vibrate(8);
  });

  startButton.addEventListener('click', launchFromSetup);
  playerCountSlider.addEventListener('input', renderPlayerNameInputs);
  undercoverSlider.addEventListener('input', function () {
    undercoverValue.textContent = undercoverSlider.value;
  });
  mrWhiteToggle.addEventListener('change', function () {
    updateUndercoverRange();
    updatePresetValidation();
  });

  renderPresetCards();
  bindCustomRoleToggles();
  updateCustomRoleVisibility();
  renderPlayerNameInputs();
}

function initGlobalButtons() {
  const replay = document.getElementById('btn-replay');
  replay.addEventListener('click', function () {
    if (!App.game || !App.game.config || !App.ui) return;
    App.game.init(App.game.config);
    App.game.distributeRoles();
    App.game.distributeSpecialRoles();
    if (hasAnySpecialRole(App.game.config.specialRoles)) {
      App.ui.renderBriefing(App.game);
      navigateTo('screen-briefing');
    } else {
      App.ui.renderDistribute(App.game);
    }
    vibrate(18);
  });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').catch(function () {
    // ignore
  });
}

document.addEventListener('DOMContentLoaded', function () {
  loadExternalData().then(function () {
    initI18n(document);

    loadSettings();

    App.game = new Game();
    App.ui = new UI();

    initNavigation();
    initSettingsScreen();
    initSetupScreen();
    initGlobalButtons();
    applySettingsToUI();
    registerServiceWorker();

    document.querySelectorAll('.screen.active').forEach(function (node) {
      node.classList.remove('active');
    });
    document.getElementById('screen-home').classList.add('active');
    App.currentScreen = 'screen-home';
  });
});
