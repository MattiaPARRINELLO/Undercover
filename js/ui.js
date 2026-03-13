/* ============================================================
   UNDERCOVER — UI Layer
   ============================================================ */

'use strict';

const CATEGORY_LABELS = {
  nourriture: 'Nourriture',
  animaux: 'Animaux',
  lieux: 'Lieux',
  objets: 'Objets',
  metiers: 'Metiers',
  sport: 'Sport',
  cinema: 'Cinema & Series',
  musique: 'Musique',
  technologie: 'Technologie',
  quotidien: 'Vie quotidienne',
  concepts: 'Concepts abstraits',
  celebrites: 'Personnages celebres',
  custom: 'Mots personnalises'
};

const ROLE_BRIEF = {
  lover: {
    icon: '',
    name: 'Amoureux',
    text: 'Deux joueurs sont secretement lies. Si l un est elimine, l autre tombe aussi. Derniers survivants ensemble = victoire partagee.'
  },
  ghost: {
    icon: '',
    name: 'Fantome',
    text: 'Le premier elimine revient hanter les votes avec une voix d outre-tombe (vote a demi-puissance).'
  },
  vengeful: {
    icon: '',
    name: 'Vengeuse',
    text: 'Si elle est eliminee, elle emporte un joueur de son choix dans sa chute.'
  },
  boomerang: {
    icon: '',
    name: 'Boomerang',
    text: 'Si ce joueur est le plus vote, il survit. Le 2e plus vote est elimine a sa place. Usage unique.'
  },
  goddess: {
    icon: '',
    name: 'Deesse de la Justice',
    text: 'En cas d egalite, elle seule decide qui sera elimine.'
  }
};

const SPECIAL_ROLE_ICON_CLASSES = {
  lover: 'icon-role-lover',
  ghost: 'icon-role-ghost',
  vengeful: 'icon-role-vengeful',
  boomerang: 'icon-role-boomerang',
  goddess: 'icon-role-goddess'
};

class UI {
  constructor() {
    this.selectedVoteTargetId = null;
    this.bindWordsEvents();
  }

  clearSensitiveUI() {
    const word = document.getElementById('distribute-word');
    const roleLabel = document.getElementById('distribute-role-label');
    const hint = document.getElementById('distribute-hint');
    const specialInfo = document.getElementById('distribute-special-info');

    if (word) word.textContent = '';
    if (roleLabel) roleLabel.textContent = '';
    if (hint) hint.textContent = '';
    if (specialInfo) {
      specialInfo.textContent = '';
      specialInfo.hidden = true;
    }
  }

  renderBriefing(game) {
    const cards = document.getElementById('briefing-cards');
    cards.innerHTML = '';

    game.getActiveSpecialRolesList().forEach((key) => {
      const data = ROLE_BRIEF[key];
      if (!data) return;

      const card = document.createElement('article');
      card.className = 'briefing-card';

      const title = document.createElement('h4');
      const roleIcon = document.createElement('span');
      roleIcon.className = 'role-icon role-icon-md ' + (SPECIAL_ROLE_ICON_CLASSES[key] || '');
      roleIcon.setAttribute('aria-hidden', 'true');
      title.appendChild(roleIcon);
      title.appendChild(document.createTextNode(data.name));

      const text = document.createElement('p');
      text.textContent = data.text;

      card.appendChild(title);
      card.appendChild(text);
      cards.appendChild(card);
    });
  }

  renderDistribute(game) {
    navigateTo('screen-distribute');

    const transition = document.getElementById('distribute-transition');
    const reveal = document.getElementById('distribute-reveal');
    const targetName = document.getElementById('distribute-target-name');
    const btnName = document.getElementById('distribute-btn-name');
    const btnIam = document.getElementById('btn-i-am-player');
    const btnSeen = document.getElementById('btn-word-seen');

    const renderCurrent = () => {
      this.clearSensitiveUI();
      const current = game.getCurrentPlayer();
      if (!current) {
        game.startTurn();
        this.renderTurn(game);
        return;
      }

      transition.hidden = false;
      reveal.hidden = true;
      targetName.textContent = current.name;
      btnName.textContent = current.name;
    };

    btnIam.onclick = () => {
      const player = game.getCurrentPlayer();
      if (!player) return;
      this.renderDistributionReveal(game, player);
      vibrate(12);
    };

    btnSeen.onclick = () => {
      this.clearSensitiveUI();
      const next = game.nextPlayer();
      if (!next) {
        game.startTurn();
        this.renderTurn(game);
      } else {
        renderCurrent();
      }
      vibrate(10);
    };

    renderCurrent();
  }

  renderDistributionReveal(game, player) {
    const transition = document.getElementById('distribute-transition');
    const reveal = document.getElementById('distribute-reveal');
    const roleLabel = document.getElementById('distribute-role-label');
    const word = document.getElementById('distribute-word');
    const hint = document.getElementById('distribute-hint');
    const specialInfo = document.getElementById('distribute-special-info');

    transition.hidden = true;
    reveal.hidden = false;

    if (player.baseRole === 'mrwhite') {
      roleLabel.textContent = '';
      word.textContent = 'Tu es Mr. White  Tu n as pas de mot. Ecoute bien et improvise.';
      hint.textContent = 'Reste discret et adapte-toi aux indices des autres.';
    } else {
      roleLabel.textContent = 'Ton mot :';
      word.textContent = player.word;
      hint.textContent = 'Memorise-le bien, ne le montre a personne.';
    }

    const specialText = game.getSpecialDistributionText(player);
    if (specialText) {
      specialInfo.hidden = false;
      specialInfo.textContent = specialText;
    } else {
      specialInfo.hidden = true;
      specialInfo.textContent = '';
    }
  }

  renderTurn(game) {
    navigateTo('screen-turn');

    const state = game.getGameState();
    const current = game.getCurrentPlayer();
    const title = document.getElementById('turn-title');
    const list = document.getElementById('players-turn-list');
    const nextBtn = document.getElementById('btn-next-speaker');
    const voteBtn = document.getElementById('btn-go-vote');

    title.textContent = 'Tour ' + String(state.currentTurn);
    list.innerHTML = '';

    state.players
      .filter(function (p) { return !p.isGhost; })
      .forEach((player) => {
        const row = document.createElement('div');
        row.className = 'player-item';

        if (!player.alive) row.classList.add('eliminated');
        if (current && player.id === current.id) row.classList.add('speaking');

        const avatar = document.createElement('div');
        avatar.className = 'player-item-avatar';
        avatar.textContent = player.name.charAt(0).toUpperCase();

        const name = document.createElement('span');
        name.className = 'player-item-name';
        name.textContent = player.name;

        const status = document.createElement('span');
        status.className = 'player-item-status';
        if (!player.alive) status.textContent = 'Elimine';
        else if (current && player.id === current.id) status.textContent = 'A toi';
        else status.textContent = 'En vie';

        row.appendChild(avatar);
        row.appendChild(name);
        row.appendChild(status);
        list.appendChild(row);
      });

    if (!current) {
      nextBtn.hidden = true;
      voteBtn.hidden = false;
      voteBtn.onclick = () => {
        game.startVote();
        this.renderVote(game);
      };
      return;
    }

    nextBtn.hidden = false;
    voteBtn.hidden = true;
    nextBtn.onclick = () => {
      game.nextPlayer();
      this.renderTurn(game);
      vibrate(10);
    };
  }

  renderVote(game) {
    navigateTo('screen-vote');

    const transition = document.getElementById('vote-transition');
    const choice = document.getElementById('vote-choice');
    const voterName = document.getElementById('vote-target-name');
    const voterBtnName = document.getElementById('vote-btn-name');
    const btnIam = document.getElementById('btn-i-am-voter');

    const renderCurrent = () => {
      this.selectedVoteTargetId = null;
      const voter = game.getCurrentPlayer();

      if (!voter) {
        this.resolveVoteFlow(game);
        return;
      }

      transition.hidden = false;
      choice.hidden = true;
      voterName.textContent = voter.name + (voter.isGhost ? ' ' : '');
      voterBtnName.textContent = voter.name;
      voterName.style.fontStyle = voter.isGhost ? 'italic' : 'normal';
      voterName.style.opacity = voter.isGhost ? '0.7' : '1';
    };

    btnIam.onclick = () => {
      const voter = game.getCurrentPlayer();
      if (!voter) return;
      this.renderVoteChoice(game, voter.id);
      vibrate(12);
    };

    renderCurrent();
  }

  renderVoteChoice(game, voterId) {
    const transition = document.getElementById('vote-transition');
    const choice = document.getElementById('vote-choice');
    const list = document.getElementById('vote-candidates');
    const confirmBox = document.getElementById('vote-confirm');
    const confirmName = document.getElementById('vote-confirm-name');
    const confirmBtn = document.getElementById('btn-confirm-vote');
    const cancelBtn = document.getElementById('btn-cancel-vote');

    transition.hidden = true;
    choice.hidden = false;
    list.innerHTML = '';
    confirmBox.hidden = true;

    const targets = game.getVoteTargetsFor(voterId);

    targets.forEach((target) => {
      const btn = document.createElement('button');
      btn.className = 'vote-candidate-btn';

      const avatar = document.createElement('div');
      avatar.className = 'player-item-avatar';
      avatar.textContent = target.name.charAt(0).toUpperCase();

      const name = document.createElement('span');
      name.textContent = target.name;

      btn.appendChild(avatar);
      btn.appendChild(name);
      btn.addEventListener('click', () => {
        list.querySelectorAll('.vote-candidate-btn').forEach(function (n) {
          n.classList.remove('selected');
        });
        btn.classList.add('selected');
        this.selectedVoteTargetId = target.id;
        confirmName.textContent = target.name;
        confirmBox.hidden = false;
      });

      list.appendChild(btn);
    });

    confirmBtn.onclick = () => {
      if (typeof this.selectedVoteTargetId !== 'number') return;
      const ok = game.vote(voterId, this.selectedVoteTargetId);
      if (!ok) return;
      const next = game.nextPlayer();
      if (!next) {
        this.resolveVoteFlow(game);
      } else {
        this.renderVote(game);
      }
      vibrate(14);
    };

    cancelBtn.onclick = () => {
      this.selectedVoteTargetId = null;
      confirmBox.hidden = true;
      list.querySelectorAll('.vote-candidate-btn').forEach(function (n) {
        n.classList.remove('selected');
      });
    };
  }

  resolveVoteFlow(game, chosenIdFromGoddess, forcedTally) {
    const tally = forcedTally || game.tallyVotes();

    if (chosenIdFromGoddess == null && tally.isTie) {
      const goddess = game.getAliveGoddess();
      if (goddess && game.hasSpecialRoleActive('goddess')) {
        this.renderGoddessChoice(game, goddess, tally.topIds, function (chosenId) {
          this.resolveVoteFlow(game, chosenId, tally);
        }.bind(this));
        return;
      }

      if (App.settings.tieRule === 'revote') {
        game.startVote(tally.topIds);
        this.renderVote(game);
      } else {
        this.renderTie(game, tally.topIds.map(function (id) { return game.getPlayerById(id); }));
      }
      return;
    }

    let topId = chosenIdFromGoddess;
    if (topId == null) topId = tally.topId;
    if (topId == null) {
      this.renderTie(game, game.getAlivePlayers());
      return;
    }

    const logs = [];

    const boomerang = game.resolveBoomerang(topId, tally.rankedIds);
    if (boomerang.mode === 'bounce') {
      const b = game.getPlayerById(boomerang.boomerangId);
      logs.push(' ' + b.name + ' avait le Boomerang ! Le vote rebondit.');
      topId = boomerang.eliminateId;
    } else if (boomerang.mode === 'bounce-none') {
      const b = game.getPlayerById(boomerang.boomerangId);
      logs.push(' ' + b.name + ' avait le Boomerang ! Aucun 2e plus vote, personne n est elimine.');
      this.renderVoteOutcome(game, [], logs, tally.ghostVoteWeight);
      return;
    }

    const eliminatedIds = [];
    const primary = game.eliminate(topId);
    if (!primary) {
      this.renderVoteOutcome(game, [], logs, tally.ghostVoteWeight);
      return;
    }

    eliminatedIds.push(primary.id);

    const becameGhost = game.assignGhostIfNeeded(primary.id);
    if (becameGhost) {
      logs.push(' ' + becameGhost.name + ' revient hanter la partie.');
    }

    const continueAfterVengeful = () => {
      const loverExtra = game.applyLoverChain(eliminatedIds);
      loverExtra.forEach((id) => {
        const p = game.getPlayerById(id);
        const partner = p && p.loverPartner != null ? game.getPlayerById(p.loverPartner) : null;
        logs.push(' ' + p.name + ' ne peut pas vivre sans ' + (partner ? partner.name : 'son partenaire') + '.');
        if (!eliminatedIds.includes(id)) eliminatedIds.push(id);
      });

      this.renderVoteOutcome(game, eliminatedIds, logs, tally.ghostVoteWeight);
    };

    if (primary.specialRole === 'vengeful' && game.hasSpecialRoleActive('vengeful')) {
      this.renderVengefulChoice(game, primary, function (targetId) {
        const target = game.eliminate(targetId);
        if (target) {
          eliminatedIds.push(target.id);
          logs.push(' ' + primary.name + ' etait la Vengeuse et emporte ' + target.name + '.');
        }
        continueAfterVengeful();
      });
      return;
    }

    continueAfterVengeful();
  }

  renderGoddessChoice(game, goddess, tiedIds, onChoose) {
    navigateTo('screen-tie');

    const msg = document.getElementById('tie-message');
    const players = document.getElementById('tie-players');
    const resolution = document.getElementById('tie-resolution');
    const btn = document.getElementById('btn-tie-continue');

    msg.textContent = goddess.name + ' est la Deesse de la Justice !';
    resolution.textContent = 'Choisis qui sera elimine parmi les joueurs a egalite.';
    players.innerHTML = '';
    btn.hidden = true;

    tiedIds.forEach((id) => {
      const p = game.getPlayerById(id);
      if (!p) return;
      const b = document.createElement('button');
      b.className = 'btn btn-secondary';
      b.style.width = '100%';
      b.textContent = p.name;
      b.addEventListener('click', () => {
        btn.hidden = false;
        btn.textContent = 'Valider: ' + p.name;
        btn.onclick = () => onChoose(p.id);
      });
      players.appendChild(b);
    });
  }

  renderVengefulChoice(game, vengefulPlayer, onChoose) {
    navigateTo('screen-tie');

    const msg = document.getElementById('tie-message');
    const players = document.getElementById('tie-players');
    const resolution = document.getElementById('tie-resolution');
    const btn = document.getElementById('btn-tie-continue');

    msg.textContent = ' ' + vengefulPlayer.name + ' etait la Vengeuse !';
    resolution.textContent = 'Elle emporte quelqu un dans sa chute...';
    players.innerHTML = '';
    btn.hidden = true;

    game.getAlivePlayers().forEach((p) => {
      if (p.id === vengefulPlayer.id) return;
      const b = document.createElement('button');
      b.className = 'btn btn-secondary';
      b.style.width = '100%';
      b.textContent = p.name;
      b.addEventListener('click', () => {
        btn.hidden = false;
        btn.textContent = 'Valider: ' + p.name;
        btn.onclick = () => onChoose(p.id);
      });
      players.appendChild(b);
    });
  }

  renderVoteOutcome(game, eliminatedIds, logs, ghostVoteWeight) {
    navigateTo('screen-vote-result');

    const eliminatedName = document.getElementById('eliminated-name');
    const badge = document.getElementById('eliminated-role-badge');
    const role = document.getElementById('eliminated-role');
    const details = document.getElementById('vote-details');
    const detailsList = document.getElementById('vote-details-list');
    const guessBox = document.getElementById('mr-white-guess');
    const guessInput = document.getElementById('mr-white-input');
    const guessBtn = document.getElementById('btn-mr-white-guess');
    const actions = document.getElementById('vote-result-actions');
    const nextBtn = document.getElementById('btn-next-turn');

    guessBox.hidden = true;
    actions.hidden = false;

    if (!eliminatedIds.length) {
      eliminatedName.textContent = 'Personne';
      role.textContent = 'Aucune elimination';
      badge.className = 'eliminated-role-badge';
    } else {
      const first = game.getPlayerById(eliminatedIds[0]);
      eliminatedName.textContent = first.name;
      role.textContent = this.formatRoleReveal(first);
      badge.className = 'eliminated-role-badge role-undercover';
    }

    details.hidden = false;
    detailsList.innerHTML = '';

    logs.forEach((line) => {
      const li = document.createElement('li');
      li.textContent = line;
      detailsList.appendChild(li);
    });

    if (App.settings.showVotes) {
      Object.keys(game.votes).forEach((voterId) => {
        const voter = game.getPlayerById(Number(voterId));
        const target = game.getPlayerById(Number(game.votes[voterId]));
        if (!voter || !target) return;
        const li = document.createElement('li');
        li.textContent = voter.name + ' -> ' + target.name + (voter.isGhost ? ' (vote fantome 0.5)' : '');
        detailsList.appendChild(li);
      });
    }

    if (ghostVoteWeight > 0) {
      const li = document.createElement('li');
      li.className = 'vote-ghost-note';
      li.textContent = '(dont ' + ghostVoteWeight + ' vote fantome)';
      detailsList.appendChild(li);
    }

    const mrWhiteEliminated = eliminatedIds
      .map(function (id) { return game.getPlayerById(id); })
      .filter(Boolean)
      .find(function (p) { return p.baseRole === 'mrwhite'; });

    if (mrWhiteEliminated) {
      guessBox.hidden = false;
      actions.hidden = true;
      guessInput.value = '';
      guessBtn.onclick = () => {
        const guess = guessInput.value.trim();
        if (!guess) return;
        const ok = game.mrWhiteGuess(guess);
        guessBox.hidden = true;
        actions.hidden = false;
        if (ok) {
          this.renderVictory(game);
        } else {
          this.bindNextAfterVoteOutcome(game, nextBtn);
        }
      };
    } else {
      this.bindNextAfterVoteOutcome(game, nextBtn);
    }
  }

  bindNextAfterVoteOutcome(game, nextBtn) {
    const result = game.checkVictory();
    if (result) {
      nextBtn.textContent = 'Voir le resultat';
      nextBtn.onclick = () => this.renderVictory(game);
    } else {
      nextBtn.textContent = 'Tour suivant';
      nextBtn.onclick = () => {
        game.startTurn();
        this.renderTurn(game);
      };
    }
  }

  renderTie(game, tiedPlayers) {
    navigateTo('screen-tie');

    const msg = document.getElementById('tie-message');
    const players = document.getElementById('tie-players');
    const resolution = document.getElementById('tie-resolution');
    const btn = document.getElementById('btn-tie-continue');

    msg.textContent = 'Egalite !';
    resolution.textContent = App.settings.tieRule === 'revote'
      ? 'Revote entre les joueurs a egalite.'
      : 'Personne n est elimine ce tour.';

    players.innerHTML = '';
    tiedPlayers.forEach((p) => {
      const chip = document.createElement('span');
      chip.className = 'tie-player-chip';
      chip.textContent = p.name;
      players.appendChild(chip);
    });

    btn.hidden = false;
    btn.textContent = 'Continuer';
    btn.onclick = () => {
      if (App.settings.tieRule === 'revote') {
        game.startVote(tiedPlayers.map(function (p) { return p.id; }));
        this.renderVote(game);
      } else {
        game.startTurn();
        this.renderTurn(game);
      }
    };
  }

  formatRoleReveal(player) {
    const base = player.baseRole === 'civil' ? 'Civil' : player.baseRole === 'undercover' ? 'Undercover' : 'Mr. White';
    const special = player.specialRole
      ? (player.specialRole === 'lover' ? 'Amoureux' : player.specialRole === 'vengeful' ? 'Vengeuse' : player.specialRole === 'boomerang' ? 'Boomerang' : 'Deesse')
      : 'Aucun';
    return base + ' + ' + special;
  }

  renderVictory(game) {
    const result = game.checkVictory();
    if (!result) return;

    navigateTo('screen-victory');

    document.getElementById('victory-title').textContent =
      result.winner === 'lovers' ? 'Victoire des Amoureux' :
        result.winner === 'civils' ? 'Victoire des Civils' :
          result.winner === 'undercovers' ? 'Victoire des Undercovers' :
            'Victoire de Mr. White';

    document.getElementById('victory-message').textContent = result.message;

    const body = document.getElementById('recap-table-body');
    body.innerHTML = '';

    game.players.forEach((p) => {
      const tr = document.createElement('tr');

      const tdName = document.createElement('td');
      tdName.textContent = p.name;

      const tdBase = document.createElement('td');
      tdBase.textContent = p.baseRole === 'civil' ? 'Civil' : p.baseRole === 'undercover' ? 'Undercover' : 'Mr. White';

      const tdSpecial = document.createElement('td');
      if (!p.specialRole) {
        tdSpecial.textContent = '-';
      } else {
        const iconClass = SPECIAL_ROLE_ICON_CLASSES[p.specialRole] || '';
        const label = p.specialRole === 'lover'
          ? 'Amoureux'
          : p.specialRole === 'vengeful'
            ? 'Vengeuse'
            : p.specialRole === 'boomerang'
              ? 'Boomerang'
              : p.specialRole === 'ghost'
                ? 'Fantome'
                : 'Deesse';

        const icon = document.createElement('span');
        icon.className = 'role-icon role-icon-sm ' + iconClass;
        icon.setAttribute('aria-hidden', 'true');

        const txt = document.createElement('span');
        txt.textContent = label;

        tdSpecial.className = 'special-role-cell';
        tdSpecial.appendChild(icon);
        tdSpecial.appendChild(txt);
      }

      const tdWord = document.createElement('td');
      tdWord.textContent = p.word || '-';

      const tdStatus = document.createElement('td');
      tdStatus.textContent = p.alive ? 'En vie' : (p.isGhost ? 'Fantome' : 'Elimine');

      tr.appendChild(tdName);
      tr.appendChild(tdBase);
      tr.appendChild(tdSpecial);
      tr.appendChild(tdWord);
      tr.appendChild(tdStatus);

      body.appendChild(tr);
    });

    if (result.winner === 'lovers') this.launchHearts();
    else this.launchConfetti();
  }

  launchHearts() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const hearts = [];
    for (let i = 0; i < 70; i += 1) {
      hearts.push({
        x: Math.random() * canvas.width,
        y: canvas.height + Math.random() * canvas.height,
        s: 8 + Math.random() * 12,
        vy: 1 + Math.random() * 2,
        a: 0.4 + Math.random() * 0.6
      });
    }

    let frame = 0;
    const max = 320;
    const drawHeart = (x, y, size) => {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x - size / 2, y - size / 2, x - size, y + size / 3, x, y + size);
      ctx.bezierCurveTo(x + size, y + size / 3, x + size / 2, y - size / 2, x, y);
      ctx.fill();
    };

    const tick = () => {
      frame += 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hearts.forEach((h) => {
        h.y -= h.vy;
        ctx.globalAlpha = h.a;
        ctx.fillStyle = '#ff5aa5';
        drawHeart(h.x, h.y, h.s);
      });
      ctx.globalAlpha = 1;
      if (frame < max) requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    tick();
  }

  launchConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#c9a84c', '#8b5cf6', '#22c55e', '#e8e8e8'];
    for (let i = 0; i < 130; i += 1) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -Math.random() * canvas.height,
        w: 4 + Math.random() * 8,
        h: 3 + Math.random() * 7,
        vy: 1.5 + Math.random() * 3,
        vx: -1 + Math.random() * 2,
        a: Math.random() * Math.PI,
        va: -0.08 + Math.random() * 0.16,
        c: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    let frame = 0;
    const max = 280;

    const tick = () => {
      frame += 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.a += p.va;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.a);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (frame < max) requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    tick();
  }

  bindWordsEvents() {
    const addBtn = document.getElementById('btn-add-word');
    const importBtn = document.getElementById('btn-import-words');
    const exportBtn = document.getElementById('btn-export-words');
    const fileInput = document.getElementById('import-file-input');

    addBtn.addEventListener('click', () => {
      if (!App.game) return;
      const civil = document.getElementById('word-civil').value.trim();
      const undercover = document.getElementById('word-undercover').value.trim();
      const category = document.getElementById('word-new-category').value.trim() || 'custom';
      const ok = App.game.addCustomWord(civil, undercover, category);
      if (ok) {
        document.getElementById('word-civil').value = '';
        document.getElementById('word-undercover').value = '';
        document.getElementById('word-new-category').value = '';
        this.renderWords(App.game);
      }
    });

    exportBtn.addEventListener('click', () => {
      if (!App.game) return;
      const blob = new Blob([App.game.exportCustomWords()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'undercover_mots_custom.json';
      a.click();
      URL.revokeObjectURL(url);
    });

    importBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (!file || !App.game) return;
      const reader = new FileReader();
      reader.onload = () => {
        const result = App.game.importCustomWords(String(reader.result || ''));
        if (result.ok) this.renderWords(App.game);
      };
      reader.readAsText(file);
      fileInput.value = '';
    });
  }

  renderWords(game) {
    if (!game) return;

    const all = game.getAllWordsByCategory();
    const container = document.getElementById('words-categories-list');
    const datalist = document.getElementById('categories-datalist');

    container.innerHTML = '';
    datalist.innerHTML = '';

    Object.keys(all).forEach((cat) => {
      const opt = document.createElement('option');
      opt.value = cat;
      datalist.appendChild(opt);

      const item = document.createElement('div');
      item.className = 'word-category-item';

      const header = document.createElement('button');
      header.className = 'word-category-header';
      header.innerHTML = '<span>' + (CATEGORY_LABELS[cat] || cat) + ' <span class="category-count">(' + all[cat].length + ' paires)</span></span><span class="category-arrow">›</span>';

      const body = document.createElement('div');
      body.className = 'word-category-body';

      all[cat].forEach((pair) => {
        const row = document.createElement('div');
        row.className = 'word-pair-item' + (pair.isDefault ? ' readonly' : '');

        const words = document.createElement('div');
        words.className = 'word-pair-words';

        const a = document.createElement('span');
        a.className = 'word-pair-civil';
        a.textContent = pair.civil;
        const sep = document.createElement('span');
        sep.className = 'word-pair-separator';
        sep.textContent = '<->';
        const b = document.createElement('span');
        b.className = 'word-pair-undercover';
        b.textContent = pair.undercover;

        words.appendChild(a);
        words.appendChild(sep);
        words.appendChild(b);
        row.appendChild(words);

        if (!pair.isDefault) {
          const del = document.createElement('button');
          del.className = 'word-pair-delete';
          del.textContent = 'x';
          del.addEventListener('click', () => {
            const ok = game.removeCustomWord(pair.civil, pair.undercover, pair.category);
            if (ok) this.renderWords(game);
          });
          row.appendChild(del);
        }

        body.appendChild(row);
      });

      header.addEventListener('click', () => {
        header.classList.toggle('open');
        body.classList.toggle('open');
      });

      item.appendChild(header);
      item.appendChild(body);
      container.appendChild(item);
    });
  }
}
