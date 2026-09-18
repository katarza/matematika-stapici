(function(){
  var UNIT = 28; // px po jedinici dužine — 1 = tačno jedan kvadratić mreže, isto svuda

  var ROD_META = [
    {len:1,  bg:'#B5E61D', text:'#4a5a08'},
    {len:2,  bg:'#FF4757', text:'#ffffff'},
    {len:3,  bg:'#2ED573', text:'#145c31'},
    {len:4,  bg:'#FF6FB5', text:'#7a1145'},
    {len:5,  bg:'#FFD93D', text:'#6b4e00'},
    {len:6,  bg:'#17C3B2', text:'#ffffff'},
    {len:7,  bg:'#6C5CE7', text:'#ffffff'},
    {len:8,  bg:'#FF7F50', text:'#6b2400'},
    {len:9,  bg:'#3B82F6', text:'#ffffff'},
    {len:10, bg:'#FF9F1C', text:'#6b3900'}
  ];

  var CONFETTI_COLORS = ['#FF4757','#2ED573','#FFD93D','#3B82F6','#FF9F1C','#6C5CE7','#17C3B2','#FF6FB5'];
  var LABEL_COLOR = '#ffffff'; // ista boja brojeva na svim štapićima

  var ICON_EYE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
  var ICON_EYE_OFF = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.9 17.9A10.8 10.8 0 0 1 12 19c-7 0-11-7-11-7a20.6 20.6 0 0 1 5-5.9M9.9 4.24A10.9 10.9 0 0 1 12 4c7 0 11 7 11 7a20.6 20.6 0 0 1-2.2 3.2"></path><path d="M14.1 14.1a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
  var ICON_TRASH = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>';

  var state = {
    mode: 'free',
    exerciseType: 'add',
    rods: [],
    given: [],
    target: 0,
    nextId: 1,
    showNumbers: false,
    solved: 0,
    cursorX: 28,
    cursorY: 28
  };

  var el = {
    modeFreeBtn: document.getElementById('modeFreeBtn'),
    modeExerciseBtn: document.getElementById('modeExerciseBtn'),
    exercisePanel: document.getElementById('exercisePanel'),
    freePanel: document.getElementById('freePanel'),
    typeAddBtn: document.getElementById('typeAddBtn'),
    typeSubBtn: document.getElementById('typeSubBtn'),
    solvedLabel: document.getElementById('solvedLabel'),
    taskText: document.getElementById('taskText'),
    sumValue: document.getElementById('sumValue'),
    freeTotal: document.getElementById('freeTotal'),
    feedback: document.getElementById('feedback'),
    checkBtn: document.getElementById('checkBtn'),
    newProblemBtn: document.getElementById('newProblemBtn'),
    showNumbersBtn: document.getElementById('showNumbersBtn'),
    showNumbersIcon: document.getElementById('showNumbersIcon'),
    clearBtn: document.getElementById('clearBtn'),
    clearIcon: document.getElementById('clearIcon'),
    palette: document.getElementById('palette'),
    workspace: document.getElementById('workspace'),
    givenPanel: document.getElementById('givenPanel'),
    givenRods: document.getElementById('givenRods')
  };

  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh){
    return ax < bx+bw && ax+aw > bx && ay < by+bh && ay+ah > by;
  }

  function hasCollision(x, y, w, excludeId){
    return state.rods.some(function(r){
      if(r.id === excludeId) return false;
      return rectsOverlap(x, y, w, UNIT, r.x, r.y, r.len*UNIT, UNIT);
    });
  }

  function clampToGrid(x, y, w, wsRect){
    x = Math.max(0, Math.min(x, Math.max(0, wsRect.width - w)));
    y = Math.max(0, Math.min(y, Math.max(0, wsRect.height - UNIT)));
    return { x: Math.round(x/UNIT)*UNIT, y: Math.round(y/UNIT)*UNIT };
  }

  // Тражи најближе слободно место на мрежи ако жељена позиција преклапа неки штапић.
  function findFreePosition(w, wsRect, prefX, prefY, excludeId){
    var p = clampToGrid(prefX, prefY, w, wsRect);
    if(!hasCollision(p.x, p.y, w, excludeId)) return p;
    var maxRadius = Math.ceil(Math.max(wsRect.width, wsRect.height) / UNIT) + 2;
    for(var radius = 1; radius <= maxRadius; radius++){
      for(var dy = -radius; dy <= radius; dy++){
        for(var dx = -radius; dx <= radius; dx++){
          if(Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
          var c = clampToGrid(p.x + dx*UNIT, p.y + dy*UNIT, w, wsRect);
          if(!hasCollision(c.x, c.y, w, excludeId)) return c;
        }
      }
    }
    return null;
  }

  function buildPalette(){
    el.palette.innerHTML = '';
    ROD_META.forEach(function(m){
      var tile = document.createElement('div');
      tile.className = 'rod-tile';
      tile.style.width = (m.len*UNIT) + 'px';
      tile.style.background = m.bg;
      tile.style.color = LABEL_COLOR;
      tile.textContent = state.showNumbers ? m.len : '';
      tile.setAttribute('role','button');
      tile.setAttribute('tabindex','0');
      tile.setAttribute('aria-label', 'Додај штапић дужине ' + m.len);
      tile.addEventListener('click', function(){
        if(Date.now() - lastSpawnDragEnd < 300) return;
        addRod(m.len);
      });
      tile.addEventListener('keydown', function(e){
        if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); addRod(m.len); }
      });
      tile.addEventListener('pointerdown', function(e){ startSpawnDrag(e, m); });
      el.palette.appendChild(tile);
    });
  }

  var spawnDrag = null;
  var lastSpawnDragEnd = 0;

  function startSpawnDrag(e, m){
    e.preventDefault();
    var ghost = document.createElement('div');
    ghost.className = 'rod-tile spawn-ghost';
    ghost.style.width = (m.len*UNIT) + 'px';
    ghost.style.height = UNIT + 'px';
    ghost.style.background = m.bg;
    ghost.style.color = LABEL_COLOR;
    ghost.textContent = state.showNumbers ? m.len : '';
    document.body.appendChild(ghost);
    spawnDrag = { meta: m, startX: e.clientX, startY: e.clientY, moved: false, ghost: ghost };
    positionGhost(e.clientX, e.clientY);
    window.addEventListener('pointermove', onSpawnMove);
    window.addEventListener('pointerup', onSpawnEnd);
    window.addEventListener('pointercancel', onSpawnCancel);
  }

  function positionGhost(clientX, clientY){
    if(!spawnDrag) return;
    var w = spawnDrag.meta.len*UNIT;
    spawnDrag.ghost.style.left = (clientX - w/2) + 'px';
    spawnDrag.ghost.style.top = (clientY - UNIT/2) + 'px';
  }

  function isOverWorkspace(clientX, clientY){
    var r = el.workspace.getBoundingClientRect();
    return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
  }

  function onSpawnMove(e){
    if(!spawnDrag) return;
    var dx = e.clientX - spawnDrag.startX;
    var dy = e.clientY - spawnDrag.startY;
    if(Math.abs(dx) > 4 || Math.abs(dy) > 4){ spawnDrag.moved = true; }
    positionGhost(e.clientX, e.clientY);
    el.workspace.classList.toggle('drop-hover', isOverWorkspace(e.clientX, e.clientY));
  }

  function onSpawnEnd(e){
    if(!spawnDrag) return;
    if(spawnDrag.moved && isOverWorkspace(e.clientX, e.clientY)){
      var len = spawnDrag.meta.len;
      var w = len*UNIT;
      var wsRect = el.workspace.getBoundingClientRect();
      var x = e.clientX - wsRect.left - w/2;
      var y = e.clientY - wsRect.top - UNIT/2;
      var pos = findFreePosition(w, wsRect, x, y, null);
      if(pos){
        state.rods.push({id: state.nextId++, len: len, x:pos.x, y:pos.y});
        renderWorkspace();
        updateTotals();
      }
    }
    if(spawnDrag.moved){ lastSpawnDragEnd = Date.now(); }
    cleanupSpawn();
  }

  function onSpawnCancel(){ cleanupSpawn(); }

  function cleanupSpawn(){
    if(spawnDrag && spawnDrag.ghost){ spawnDrag.ghost.remove(); }
    el.workspace.classList.remove('drop-hover');
    window.removeEventListener('pointermove', onSpawnMove);
    window.removeEventListener('pointerup', onSpawnEnd);
    window.removeEventListener('pointercancel', onSpawnCancel);
    spawnDrag = null;
  }

  // Штапићи додати кликом ређају се уредно, један за другим, без преклапања.
  function resetCursor(){
    state.cursorX = UNIT;
    state.cursorY = UNIT;
  }

  function addRod(len){
    var wsRect = el.workspace.getBoundingClientRect();
    var w = len*UNIT;
    if(state.cursorX + w > wsRect.width - UNIT){
      state.cursorX = UNIT;
      state.cursorY += UNIT*2;
    }
    if(state.cursorY + UNIT > wsRect.height - UNIT){
      state.cursorX = UNIT;
      state.cursorY = UNIT;
    }
    var pos = findFreePosition(w, wsRect, state.cursorX, state.cursorY, null);
    if(!pos) return;
    state.rods.push({id: state.nextId++, len: len, x: pos.x, y: pos.y});
    state.cursorX = pos.x + w + UNIT;
    state.cursorY = pos.y;
    renderWorkspace();
    updateTotals();
  }

  function removeRod(id){
    state.rods = state.rods.filter(function(r){ return r.id !== id; });
    renderWorkspace();
    updateTotals();
  }

  function clearRods(){
    state.rods = [];
    resetCursor();
    hideFeedback();
    renderWorkspace();
    updateTotals();
  }

  var drag = null;

  function renderWorkspace(){
    el.workspace.innerHTML = '';
    state.rods.forEach(function(r){
      var meta = ROD_META[r.len-1];
      var div = document.createElement('div');
      div.className = 'rod';
      div.style.left = r.x + 'px';
      div.style.top = r.y + 'px';
      div.style.width = (r.len*UNIT) + 'px';
      div.style.height = UNIT + 'px';
      div.style.background = meta.bg;
      div.style.color = LABEL_COLOR;
      if(state.showNumbers){ div.textContent = r.len; }
      div.addEventListener('pointerdown', function(e){ startDrag(e, r.id); });
      div.addEventListener('dblclick', function(){ removeRod(r.id); });
      var touchTimer = null;
      div.addEventListener('touchstart', function(){
        touchTimer = setTimeout(function(){ removeRod(r.id); }, 600);
      }, {passive:true});
      div.addEventListener('touchend', function(){ if(touchTimer) clearTimeout(touchTimer); });
      div.addEventListener('touchmove', function(){ if(touchTimer) clearTimeout(touchTimer); });
      el.workspace.appendChild(div);
    });
  }

  function startDrag(e, id){
    var rod = state.rods.find(function(r){ return r.id === id; });
    if(!rod) return;
    e.preventDefault();
    var target = e.currentTarget;
    drag = {
      id: id,
      startX: e.clientX, startY: e.clientY,
      origX: rod.x, origY: rod.y,
      el: target
    };
    target.classList.add('dragging');
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd);
    window.addEventListener('pointercancel', onDragEnd);
  }

  function onDragMove(e){
    if(!drag) return;
    var rod = state.rods.find(function(r){ return r.id === drag.id; });
    if(!rod) return;
    var dx = e.clientX - drag.startX;
    var dy = e.clientY - drag.startY;
    var nx = drag.origX + dx;
    var ny = drag.origY + dy;
    var wsRect = el.workspace.getBoundingClientRect();
    var w = rod.len*UNIT;
    nx = Math.round(nx / UNIT) * UNIT;
    ny = Math.round(ny / UNIT) * UNIT;
    nx = Math.max(0, Math.min(nx, wsRect.width - w));
    ny = Math.max(0, Math.min(ny, wsRect.height - UNIT));
    if(hasCollision(nx, ny, w, rod.id)) return;
    rod.x = nx; rod.y = ny;
    drag.el.style.left = nx + 'px';
    drag.el.style.top = ny + 'px';
  }

  function onDragEnd(){
    if(!drag) return;
    var dragEl = drag.el;
    dragEl.classList.remove('dragging');
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragEnd);
    window.removeEventListener('pointercancel', onDragEnd);
    drag = null;
    updateTotals();
  }

  function renderGiven(){
    el.givenRods.innerHTML = '';
    if(state.given.length === 0){ el.givenPanel.hidden = true; return; }
    el.givenPanel.hidden = false;
    state.given.forEach(function(g, i){
      var meta = ROD_META[g.len-1];
      var div = document.createElement('div');
      div.className = 'given-rod';
      div.style.top = (i*(UNIT+4)) + 'px';
      div.style.height = UNIT + 'px';
      div.style.width = (g.len*UNIT) + 'px';
      div.style.background = meta.bg;
      div.style.color = LABEL_COLOR;
      div.textContent = state.showNumbers ? g.len : '';
      el.givenRods.appendChild(div);
    });
  }

  function updateTotals(){
    var total = state.rods.reduce(function(s,r){ return s+r.len; }, 0);
    el.sumValue.textContent = total;
    el.freeTotal.textContent = total;
  }

  function setMode(mode){
    state.mode = mode;
    el.modeFreeBtn.classList.toggle('active', mode==='free');
    el.modeExerciseBtn.classList.toggle('active', mode==='exercise');
    el.exercisePanel.hidden = mode !== 'exercise';
    el.freePanel.hidden = mode !== 'free';
    if(mode === 'exercise'){
      generateProblem(state.exerciseType);
    } else {
      state.rods = [];
      state.given = [];
      resetCursor();
      hideFeedback();
      renderWorkspace();
      renderGiven();
      updateTotals();
    }
  }

  function generateProblem(type){
    state.exerciseType = type;
    el.typeAddBtn.classList.toggle('active', type==='add');
    el.typeSubBtn.classList.toggle('active', type==='sub');
    state.rods = [];
    resetCursor();
    hideFeedback();
    if(type === 'sub'){
      var a = 4 + Math.floor(Math.random()*7);
      var b = 1 + Math.floor(Math.random()*(a-1));
      state.target = a - b;
      state.given = [{len:a},{len:b}];
    } else {
      state.target = 3 + Math.floor(Math.random()*16);
      state.given = [];
    }
    renderTaskText();
    renderWorkspace();
    renderGiven();
    updateTotals();
  }

  function renderTaskText(){
    if(state.exerciseType === 'sub' && state.given.length === 2){
      el.taskText.innerHTML = 'Колико је <span class="num-badge">'+state.given[0].len+'</span> − <span class="num-badge">'+state.given[1].len+'</span>?';
    } else {
      el.taskText.innerHTML = 'Сложи штапиће тако да њихов збир буде тачно <span class="target-badge">'+state.target+'</span>.';
    }
  }

  function checkAnswer(){
    var total = state.rods.reduce(function(s,r){ return s+r.len; }, 0);
    if(total === state.target){
      state.solved++;
      el.solvedLabel.textContent = 'Решено: ' + state.solved;
      showFeedback(true, 'Тачно! Одличан посао! 🎉');
    } else {
      showFeedback(false, 'Твој збир је ' + total + ', а треба ' + state.target + '. Пробај поново! 💪');
    }
  }

  function showFeedback(success, text){
    el.feedback.hidden = false;
    el.feedback.textContent = text;
    el.feedback.className = 'feedback';
    void el.feedback.offsetWidth;
    if(success){
      el.feedback.classList.add('fb-success','pop');
      launchConfetti();
    } else {
      el.feedback.classList.add('fb-error','shake');
    }
  }
  function hideFeedback(){ el.feedback.hidden = true; el.feedback.className = 'feedback'; }

  function launchConfetti(){
    for(var i=0;i<28;i++){
      var p = document.createElement('div');
      p.className = 'confetti-piece';
      p.style.left = (Math.random()*100) + 'vw';
      p.style.background = CONFETTI_COLORS[Math.floor(Math.random()*CONFETTI_COLORS.length)];
      p.style.animationDuration = (1.2 + Math.random()*1.2) + 's';
      p.style.animationDelay = (Math.random()*0.3) + 's';
      p.style.transform = 'rotate(' + Math.floor(Math.random()*360) + 'deg)';
      document.body.appendChild(p);
      (function(node){ setTimeout(function(){ node.remove(); }, 3000); })(p);
    }
  }

  el.modeFreeBtn.addEventListener('click', function(){ setMode('free'); });
  el.modeExerciseBtn.addEventListener('click', function(){ setMode('exercise'); });
  el.typeAddBtn.addEventListener('click', function(){ generateProblem('add'); });
  el.typeSubBtn.addEventListener('click', function(){ generateProblem('sub'); });
  el.checkBtn.addEventListener('click', checkAnswer);
  el.newProblemBtn.addEventListener('click', function(){ generateProblem(state.exerciseType); });
  el.clearBtn.addEventListener('click', clearRods);
  el.clearIcon.innerHTML = ICON_TRASH;
  el.showNumbersIcon.innerHTML = state.showNumbers ? ICON_EYE : ICON_EYE_OFF;
  el.showNumbersBtn.addEventListener('click', function(){
    state.showNumbers = !state.showNumbers;
    el.showNumbersBtn.classList.toggle('active', state.showNumbers);
    el.showNumbersBtn.setAttribute('aria-pressed', String(state.showNumbers));
    el.showNumbersIcon.innerHTML = state.showNumbers ? ICON_EYE : ICON_EYE_OFF;
    renderWorkspace();
    renderGiven();
    renderTaskText();
    buildPalette();
  });

  buildPalette();
  renderWorkspace();
  updateTotals();
})();
