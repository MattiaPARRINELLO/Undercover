/* ============================================================
   UNDERCOVER — Game Engine
   ============================================================ */

'use strict';

const CUSTOM_WORDS_STORAGE_KEY = 'undercover_custom_words';

function buildDefaultWordPairs() {
  if (typeof window !== 'undefined' && window.WORDS_DB_DATA && window.WORDS_DB_DATA.categories) {
    const out = {};
    Object.keys(window.WORDS_DB_DATA.categories).forEach(function (categoryKey) {
      const category = window.WORDS_DB_DATA.categories[categoryKey];
      if (!category || !Array.isArray(category.pairs)) return;
      out[categoryKey] = category.pairs
        .filter(function (pair) { return Array.isArray(pair) && pair.length >= 2; })
        .map(function (pair) { return [String(pair[0]), String(pair[1])]; });
    });
    if (Object.keys(out).length) return out;
  }

  return {
    nourriture: [['Pizza', 'Quiche'], ['Chocolat', 'Caramel'], ['Sushi', 'Maki'], ['Croissant', 'Brioche']],
    animaux: [['Chien', 'Loup'], ['Chat', 'Tigre'], ['Lion', 'Guepard'], ['Aigle', 'Faucon']],
    lieux: [['Plage', 'Piscine'], ['Montagne', 'Colline'], ['Paris', 'Londres'], ['Cinema', 'Theatre']],
    objets: [['Telephone', 'Tablette'], ['Montre', 'Bracelet'], ['Miroir', 'Vitre'], ['Livre', 'Cahier']],
    metiers: [['Medecin', 'Infirmier'], ['Avocat', 'Juge'], ['Architecte', 'Ingenieur'], ['Musicien', 'Chanteur']],
    sport: [['Football', 'Rugby'], ['Tennis', 'Badminton'], ['Boxe', 'Karate'], ['Surf', 'Bodyboard']],
    cinema: [['Batman', 'Superman'], ['Star Wars', 'Star Trek'], ['Matrix', 'Inception'], ['Shrek', 'Madagascar']],
    musique: [['Guitare', 'Ukulele'], ['Piano', 'Orgue'], ['Jazz', 'Blues'], ['Techno', 'House']],
    technologie: [['iPhone', 'Android'], ['Google', 'Bing'], ['WiFi', 'Bluetooth'], ['Clavier', 'Souris']]
  };
}

class Game {
  constructor() {
    this.resetAll();
    this.customWords = [];
    this.loadCustomWords();
  }

  resetAll() {
    this.config = null;
    this.players = [];
    this.currentTurn = 0;
    this.phase = 'idle';

    this.distributionOrder = [];
    this.distributionCursor = 0;

    this.speakingOrder = [];
    this.speakingCursor = 0;

    this.voteOrder = [];
    this.voteCursor = 0;
    this.votes = {};

    this.revoteTargetIds = null;
    this.civilWord = '';
    this.undercoverWord = '';

    this.lastEliminatedId = null;
    this.ghostId = null;
    this.firstEliminationDone = false;

    this.winner = null;
    this.winnerMessage = '';
    this.mrWhiteWon = false;
  }

  init(config) {
    this.resetAll();
    this.config = {
      playerCount: Number(config.playerCount),
      playerNames: config.playerNames.slice(0),
      undercoverCount: Number(config.undercoverCount),
      mrWhite: !!config.mrWhite,
      category: config.category || 'all',
      presetId: config.presetId || 'classic',
      specialRoles: Object.assign({ lover: false, ghost: false, vengeful: false, boomerang: false, goddess: false }, config.specialRoles || {})
    };
    this.phase = 'setup';
  }

  distributeRoles() {
    const names = this.config.playerNames;
    this.players = names.map(function (name, i) {
      return {
        id: i,
        name: name,
        baseRole: 'civil',
        specialRole: null,
        word: null,
        alive: true,
        isGhost: false,
        loverPartner: null,
        boomerangUsed: false,
        votes: 0
      };
    });

    const ids = this.players.map(function (p) { return p.id; });
    this.shuffle(ids);

    for (let i = 0; i < this.config.undercoverCount; i += 1) {
      this.players[ids[i]].baseRole = 'undercover';
    }

    if (this.config.mrWhite) {
      const id = ids[this.config.undercoverCount];
      this.players[id].baseRole = 'mrwhite';
    }

    const pair = this.pickWordPair(this.config.category);
    this.civilWord = pair.civil;
    this.undercoverWord = pair.undercover;

    this.players.forEach((player) => {
      if (player.baseRole === 'civil') player.word = this.civilWord;
      if (player.baseRole === 'undercover') player.word = this.undercoverWord;
      if (player.baseRole === 'mrwhite') player.word = null;
    });

    this.distributionOrder = this.players.map(function (p) { return p.id; });
    this.distributionCursor = 0;
    this.phase = 'distribution';
  }

  distributeSpecialRoles() {
    if (!this.config || !this.config.specialRoles) return;

    const specials = this.config.specialRoles;
    const assigned = new Set();

    this.players.forEach(function (p) {
      p.specialRole = null;
      p.loverPartner = null;
      p.boomerangUsed = false;
    });

    if (specials.lover) {
      let success = false;
      for (let tries = 0; tries < 50 && !success; tries += 1) {
        const pool = this.players.map(function (p) { return p.id; });
        this.shuffle(pool);
        const a = this.players[pool[0]];
        const b = this.players[pool[1]];
        const bothUndercover = a.baseRole === 'undercover' && b.baseRole === 'undercover';
        if (!bothUndercover) {
          a.specialRole = 'lover';
          b.specialRole = 'lover';
          a.loverPartner = b.id;
          b.loverPartner = a.id;
          assigned.add(a.id);
          assigned.add(b.id);
          success = true;
        }
      }
    }

    const maybeAssignOne = (roleName) => {
      const available = this.players.filter(function (p) {
        return !assigned.has(p.id);
      });
      if (!available.length) return;
      const pick = available[Math.floor(Math.random() * available.length)];
      pick.specialRole = roleName;
      assigned.add(pick.id);
    };

    if (specials.vengeful) maybeAssignOne('vengeful');
    if (specials.boomerang) maybeAssignOne('boomerang');
    if (specials.goddess) maybeAssignOne('goddess');
  }

  hasSpecialRoleActive(name) {
    return !!(this.config && this.config.specialRoles && this.config.specialRoles[name]);
  }

  getCurrentPlayer() {
    const id = this.getCurrentPlayerId();
    return typeof id === 'number' ? this.getPlayerById(id) : null;
  }

  getCurrentPlayerId() {
    if (this.phase === 'distribution') return this.distributionOrder[this.distributionCursor] ?? null;
    if (this.phase === 'turn') return this.speakingOrder[this.speakingCursor] ?? null;
    if (this.phase === 'vote') return this.voteOrder[this.voteCursor] ?? null;
    return null;
  }

  nextPlayer() {
    if (this.phase === 'distribution') {
      this.distributionCursor += 1;
      return this.getCurrentPlayer();
    }
    if (this.phase === 'turn') {
      this.speakingCursor += 1;
      return this.getCurrentPlayer();
    }
    if (this.phase === 'vote') {
      this.voteCursor += 1;
      return this.getCurrentPlayer();
    }
    return null;
  }

  startTurn() {
    this.currentTurn += 1;
    this.phase = 'turn';
    this.votes = {};
    this.revoteTargetIds = null;

    if (this.currentTurn === 1) {
      this.speakingOrder = this.getSpeakablePlayers().map(function (p) { return p.id; });
      this.shuffle(this.speakingOrder);
    } else {
      this.speakingOrder = this.computeClockwiseOrder();
    }
    this.speakingCursor = 0;
  }

  startVote(revoteTargetIds) {
    this.phase = 'vote';
    this.votes = {};

    const aliveVoters = this.getAlivePlayers().map(function (p) { return p.id; });
    if (typeof this.ghostId === 'number') aliveVoters.push(this.ghostId);

    this.voteOrder = aliveVoters;
    this.voteCursor = 0;

    if (Array.isArray(revoteTargetIds) && revoteTargetIds.length > 1) {
      this.revoteTargetIds = Array.from(new Set(revoteTargetIds));
    } else {
      this.revoteTargetIds = null;
    }
  }

  vote(voterId, targetId) {
    const voter = this.getPlayerById(voterId);
    const target = this.getPlayerById(targetId);
    if (!voter || !target) return false;

    const voterCanVote = voter.alive || voter.isGhost;
    if (!voterCanVote) return false;
    if (!target.alive) return false;
    if (voter.id === target.id) return false;

    const allowedTargets = this.getVoteTargetsFor(voterId);
    if (!allowedTargets.some(function (p) { return p.id === targetId; })) return false;

    this.votes[String(voterId)] = targetId;
    return true;
  }

  tallyVotes() {
    const totals = {};
    let ghostVoteWeight = 0;

    Object.keys(this.votes).forEach((key) => {
      const voterId = Number(key);
      const targetId = Number(this.votes[key]);
      const voter = this.getPlayerById(voterId);
      const target = this.getPlayerById(targetId);
      if (!voter || !target || !target.alive) return;

      const weight = voter.isGhost ? 0.5 : 1;
      if (voter.isGhost) ghostVoteWeight += weight;

      const k = String(targetId);
      totals[k] = (totals[k] || 0) + weight;
    });

    const ranked = Object.keys(totals)
      .map(function (k) { return { id: Number(k), score: totals[k] }; })
      .sort(function (a, b) { return b.score - a.score; });

    const topScore = ranked.length ? ranked[0].score : 0;
    const topIds = ranked.filter(function (e) { return e.score === topScore; }).map(function (e) { return e.id; });

    return {
      totals: totals,
      ranked: ranked,
      rankedIds: ranked.map(function (e) { return e.id; }),
      topIds: topIds,
      topId: topIds.length === 1 ? topIds[0] : null,
      secondId: ranked.length > 1 ? ranked[1].id : null,
      isTie: topIds.length > 1,
      ghostVoteWeight: ghostVoteWeight
    };
  }

  resolveBoomerang(topId, rankedIds) {
    const player = this.getPlayerById(topId);
    if (!player) return { mode: 'normal', eliminateId: topId, boomerangId: null };

    if (player.specialRole === 'boomerang' && !player.boomerangUsed) {
      player.boomerangUsed = true;
      player.specialRole = null;

      const second = rankedIds.find(function (id) {
        return id !== topId;
      }) || null;

      if (second === null) {
        return { mode: 'bounce-none', eliminateId: null, boomerangId: topId };
      }
      return { mode: 'bounce', eliminateId: second, boomerangId: topId };
    }

    return { mode: 'normal', eliminateId: topId, boomerangId: null };
  }

  eliminate(playerId) {
    const player = this.getPlayerById(playerId);
    if (!player) return null;
    if (player.isGhost) return null;
    if (!player.alive) return null;

    player.alive = false;
    this.lastEliminatedId = player.id;
    return player;
  }

  assignGhostIfNeeded(playerId) {
    if (!this.hasSpecialRoleActive('ghost')) return null;
    if (this.firstEliminationDone) return null;
    const player = this.getPlayerById(playerId);
    if (!player) return null;

    this.firstEliminationDone = true;
    this.ghostId = player.id;
    player.isGhost = true;
    player.alive = false;
    return player;
  }

  getAliveGoddess() {
    return this.players.find(function (p) {
      return p.alive && p.specialRole === 'goddess';
    }) || null;
  }

  getVoteTargetsFor(voterId) {
    const voter = this.getPlayerById(voterId);
    if (!voter) return [];

    let targets = this.players.filter(function (p) {
      return p.alive;
    });

    targets = targets.filter(function (p) {
      return p.id !== voterId;
    });

    if (Array.isArray(this.revoteTargetIds) && this.revoteTargetIds.length > 1) {
      const set = new Set(this.revoteTargetIds);
      targets = targets.filter(function (p) {
        return set.has(p.id);
      });
    }

    return targets;
  }

  getSpeakablePlayers() {
    return this.players.filter(function (p) {
      return p.alive && !p.isGhost;
    });
  }

  computeClockwiseOrder() {
    if (!this.players.length) return [];
    const start = typeof this.lastEliminatedId === 'number'
      ? (this.lastEliminatedId + 1) % this.players.length
      : 0;

    const order = [];
    for (let i = 0; i < this.players.length; i += 1) {
      const idx = (start + i) % this.players.length;
      const p = this.players[idx];
      if (p.alive && !p.isGhost) order.push(p.id);
    }
    return order;
  }

  applyLoverChain(initialIds) {
    const eliminated = [];
    const queue = initialIds.slice(0);
    const seen = new Set();

    while (queue.length) {
      const id = queue.shift();
      if (seen.has(id)) continue;
      seen.add(id);

      const p = this.getPlayerById(id);
      if (!p) continue;

      if (p.specialRole === 'lover' && typeof p.loverPartner === 'number') {
        const partner = this.getPlayerById(p.loverPartner);
        if (partner && partner.alive) {
          this.eliminate(partner.id);
          eliminated.push(partner.id);
          queue.push(partner.id);
        }
      }
    }

    return eliminated;
  }

  checkVictory() {
    if (this.mrWhiteWon) {
      return { winner: 'mrwhite', message: 'Mr. White gagne en devinant le mot.' };
    }

    const alive = this.getAlivePlayers();

    if (alive.length === 2) {
      const a = alive[0];
      const b = alive[1];
      const loversWin = a.specialRole === 'lover' && b.specialRole === 'lover' && a.loverPartner === b.id && b.loverPartner === a.id;
      if (loversWin) {
        return { winner: 'lovers', message: 'Les Amoureux gagnent ! ' };
      }
    }

    const civils = alive.filter(function (p) { return p.baseRole === 'civil'; }).length;
    const undercovers = alive.filter(function (p) { return p.baseRole === 'undercover'; }).length;
    const mrWhiteAlive = alive.filter(function (p) { return p.baseRole === 'mrwhite'; }).length;

    if (undercovers === 0 && mrWhiteAlive === 0) {
      return { winner: 'civils', message: 'Les Civils ont gagne.' };
    }

    if (undercovers > 0 && undercovers >= civils) {
      return { winner: 'undercovers', message: 'Les Undercovers ont gagne.' };
    }

    return null;
  }

  mrWhiteGuess(word) {
    const guess = this.normalizeWord(word);
    const target = this.normalizeWord(this.civilWord);
    const ok = !!guess && guess === target;
    if (ok) this.mrWhiteWon = true;
    return ok;
  }

  getSpecialDistributionText(player) {
    if (!player || !player.specialRole) return null;

    if (player.specialRole === 'lover') {
      const partner = this.getPlayerById(player.loverPartner);
      return ' Tu es Amoureux/Amoureuse — Tu es lie(e) a ' + (partner ? partner.name : '?') + '. Si l un tombe, l autre suit.';
    }
    if (player.specialRole === 'vengeful') {
      return ' Tu es la Vengeuse — Si tu es eliminee, tu emportes quelqu un avec toi.';
    }
    if (player.specialRole === 'boomerang') {
      return ' Tu as le Boomerang — Si tu es le plus vote, tu survis (usage unique).';
    }
    if (player.specialRole === 'goddess') {
      return 'Tu es la Deesse de la Justice — En cas d egalite, tu choisiras qui eliminer.';
    }
    return null;
  }

  getActiveSpecialRolesList() {
    const s = this.config.specialRoles;
    const out = [];
    if (s.lover) out.push('lover');
    if (s.ghost) out.push('ghost');
    if (s.vengeful) out.push('vengeful');
    if (s.boomerang) out.push('boomerang');
    if (s.goddess) out.push('goddess');
    return out;
  }

  getGameState() {
    return {
      currentTurn: this.currentTurn,
      phase: this.phase,
      players: this.players.map(function (p) {
        return {
          id: p.id,
          name: p.name,
          baseRole: p.baseRole,
          specialRole: p.specialRole,
          word: p.word,
          alive: p.alive,
          isGhost: p.isGhost,
          loverPartner: p.loverPartner,
          boomerangUsed: p.boomerangUsed
        };
      }),
      votes: Object.assign({}, this.votes),
      voteOrder: this.voteOrder.slice(0),
      speakingOrder: this.speakingOrder.slice(0),
      ghostId: this.ghostId
    };
  }

  pickWordPair(category) {
    const grouped = this.getAllWordsByCategory();
    let pool = [];

    if (category === 'all') {
      Object.keys(grouped).forEach(function (key) {
        pool = pool.concat(grouped[key]);
      });
    } else {
      pool = (grouped[category] || []).slice(0);
    }

    if (!pool.length) {
      Object.keys(grouped).forEach(function (key) {
        pool = pool.concat(grouped[key]);
      });
    }

    const pick = pool[Math.floor(Math.random() * pool.length)] || { civil: 'Pomme', undercover: 'Poire' };
    return { civil: pick.civil, undercover: pick.undercover };
  }

  getAlivePlayers() {
    return this.players.filter(function (p) { return p.alive; });
  }

  getPlayerById(id) {
    return this.players.find(function (p) { return p.id === id; }) || null;
  }

  normalizeWord(word) {
    return String(word || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  normalizeCustomEntry(entry) {
    if (!entry || typeof entry !== 'object') return null;
    const civil = String(entry.civil || '').trim();
    const undercover = String(entry.undercover || '').trim();
    const category = String(entry.category || 'custom').trim() || 'custom';
    if (!civil || !undercover) return null;
    return { civil: civil, undercover: undercover, category: category };
  }

  loadCustomWords() {
    try {
      const raw = localStorage.getItem(CUSTOM_WORDS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      this.customWords = Array.isArray(parsed)
        ? parsed.map((e) => this.normalizeCustomEntry(e)).filter(Boolean)
        : [];
      this.customWords = this.dedupCustom(this.customWords);
    } catch (_err) {
      this.customWords = [];
    }
  }

  saveCustomWords() {
    try {
      localStorage.setItem(CUSTOM_WORDS_STORAGE_KEY, JSON.stringify(this.customWords));
    } catch (_err) {
      // ignore
    }
  }

  dedupCustom(list) {
    const seen = new Set();
    const out = [];
    list.forEach((item) => {
      const key = this.normalizeWord(item.civil) + '|' + this.normalizeWord(item.undercover) + '|' + this.normalizeWord(item.category);
      if (seen.has(key)) return;
      seen.add(key);
      out.push(item);
    });
    return out;
  }

  addCustomWord(civil, undercover, category) {
    const entry = this.normalizeCustomEntry({ civil: civil, undercover: undercover, category: category });
    if (!entry) return false;

    const before = this.customWords.length;
    this.customWords = this.dedupCustom(this.customWords.concat([entry]));
    const changed = this.customWords.length > before;
    if (changed) this.saveCustomWords();
    return changed;
  }

  removeCustomWord(civil, undercover, category) {
    const key = this.normalizeWord(civil) + '|' + this.normalizeWord(undercover) + '|' + this.normalizeWord(category || 'custom');
    const old = this.customWords.length;
    this.customWords = this.customWords.filter((w) => {
      const k = this.normalizeWord(w.civil) + '|' + this.normalizeWord(w.undercover) + '|' + this.normalizeWord(w.category);
      return k !== key;
    });
    const changed = this.customWords.length !== old;
    if (changed) this.saveCustomWords();
    return changed;
  }

  importCustomWords(jsonString) {
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (_err) {
      return { ok: false, added: 0 };
    }

    if (!Array.isArray(parsed)) return { ok: false, added: 0 };

    const valid = parsed.map((e) => this.normalizeCustomEntry(e)).filter(Boolean);
    const before = this.customWords.length;
    this.customWords = this.dedupCustom(this.customWords.concat(valid));
    const added = this.customWords.length - before;
    if (added > 0) this.saveCustomWords();
    return { ok: true, added: added };
  }

  exportCustomWords() {
    return JSON.stringify(this.customWords, null, 2);
  }

  getAllWordsByCategory() {
    const defaultWordPairs = buildDefaultWordPairs();
    const out = {};
    Object.keys(defaultWordPairs).forEach(function (cat) {
      out[cat] = defaultWordPairs[cat].map(function (pair) {
        return { civil: pair[0], undercover: pair[1], category: cat, isDefault: true };
      });
    });

    this.customWords.forEach(function (entry) {
      const cat = entry.category || 'custom';
      if (!out[cat]) out[cat] = [];
      out[cat].push({ civil: entry.civil, undercover: entry.undercover, category: cat, isDefault: false });
    });

    return out;
  }
}
