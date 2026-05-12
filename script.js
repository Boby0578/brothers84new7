// --- CONFIGURATION & STATE ---
const POTION_TYPES = [
    { name: 'Potion S', stat: 'hp', val: 50 }, { name: 'Potion M', stat: 'hp', val: 100 }, { name: 'Potion X', stat: 'hp', val: 500 },
    { name: 'Mana S', stat: 'mp', val: 20 }, { name: 'Mana M', stat: 'mp', val: 50 }, { name: 'Mana X', stat: 'mp', val: 100 }
];
const SYMBOLS_EMOJI = ['🐉', '🔮', '⚔️', '🛡️', '🏰', '🌌', '💀', '👁️', '🌪️', '🔱', '🖤', '⚰️'];
const PREFIXES = ["Pyro", "Aqua", "Geo", "Aero", "Necro", "Cyber", "Veno", "Electro", "Cryo", "Umbr", "Chaos", "Mega", "Ultra", "Giga", "Shadow"];
const SUFFIXES = ["saurus", "wing", "fang", "claw", "mant", "fox", "bear", "slug", "drake", "spirit", "beast", "demon", "lord", "fiend", "golem"];
const SPELL_POOL = {
    fire: [{name:"Ember", cost:10, power:20, type:"fire"}, {name:"Fire Breath", cost:25, power:50, type:"fire"}, {name:"Inferno", cost:50, power:110, type:"fire"}, {name:"Magma", cost:80, power:180, type:"fire"}],
    water: [{name:"Splash", cost:10, power:20, type:"water"}, {name:"Tide", cost:25, power:50, type:"water"}, {name:"Blizzard", cost:50, power:110, type:"water"}, {name:"Tsunami", cost:80, power:180, type:"water"}],
    plant: [{name:"Vine", cost:10, power:20, type:"plant"}, {name:"Root", cost:25, power:50, type:"plant"}, {name:"Quake", cost:50, power:110, type:"plant"}, {name:"Forest", cost:80, power:180, type:"plant"}]
};

let player = null; let enemy = null; let worldMap = []; let currentBiome = 'plaine'; let mapCanvas, mapCtx;
let game_state = 'TITLE'; let audioCtx = null; let adsWatched = 0; let wallet = 0.0; let enemySeed = 0;
let atbPlayer = 0; let atbEnemy = 0; let atbInterval = null; let isPlayerTurn = false; let isEnemyAttacking = false;

function defaultPlayer() { return { name: 'Monster', type: 'fire', level: 1, xp: 0, xpNext: 5000, stats: { hp: 200, maxHp: 200, mp: 100, maxMp: 100, vit: 10, str: 10, int: 10, res: 10, agi: 10 }, inventory: { 'Potion S': 3, 'Mana S': 2 }, spells: [], symbols: [], x: 50, y: 50, templesBeaten: 0, finalBossActive: false }; }

// --- HARMONIOUS PROCEDURAL 8-BIT MUSIC ---
function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
function playNote(freq, duration, type='square', vol=0.03, startDelay=0) {
    if(!audioCtx || freq === 0) return; let t = audioCtx.currentTime + startDelay; let osc = audioCtx.createOscillator(); let gain = audioCtx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t); gain.gain.setValueAtTime(vol, t); gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain); gain.connect(audioCtx.destination); osc.start(t); osc.stop(t + duration);
}

// Musical Scales & Chord Progressions per Biome
const MUSIC_THEMES = {
    plaine:   { tempo: 0.2, scale: [262, 294, 330, 349, 392, 440, 494], chords: [[0,2,4], [5,0,2], [3,5,0], [4,6,1]], bass: [131, 147, 110, 123] },
    foret:    { tempo: 0.3, scale: [220, 247, 262, 294, 330, 349, 392], chords: [[0,2,4], [3,5,0], [4,6,1], [2,4,6]], bass: [110, 131, 147, 98] },
    desert:   { tempo: 0.25,scale: [294, 311, 349, 392, 415, 466, 494], chords: [[0,2,4], [1,3,5], [4,6,1], [3,5,0]], bass: [147, 156, 196, 175] },
    eau:      { tempo: 0.35,scale: [330, 370, 415, 440, 494, 554, 622], chords: [[0,2,4], [3,5,0], [1,3,5], [4,6,1]], bass: [165, 220, 185, 247] },
    glace:    { tempo: 0.4, scale: [262, 294, 330, 349, 392, 440, 494], chords: [[5,0,2], [4,6,1], [3,5,0], [0,2,4]], bass: [98, 110, 131, 147] },
    volcan:   { tempo: 0.15,scale: [220, 233, 262, 311, 330, 370, 415], chords: [[0,2,4], [1,3,5], [2,4,6], [5,0,2]], bass: [110, 117, 131, 185] },
    montagne: { tempo: 0.25,scale: [196, 220, 247, 262, 294, 330, 349], chords: [[0,2,4], [4,6,1], [5,0,2], [3,5,0]], bass: [98, 131, 110, 147] },
    battle:   { tempo: 0.12,scale: [220, 233, 262, 311, 330, 370, 415], chords: [[0,2,4], [1,3,5], [3,5,0], [4,6,1]], bass: [110, 117, 147, 165] }
};

let musicLoopTimeout = null;
function stopMusic() { if (musicLoopTimeout) clearTimeout(musicLoopTimeout); musicLoopTimeout = null; }

function playBiomeMusic(biome) {
    if (!audioCtx) return;
    stopMusic();
    let theme = MUSIC_THEMES[biome] || MUSIC_THEMES.plaine;
    let time = 0;
    
    // Play 4 chords progression (16 beats)
    for(let c=0; c<4; c++) {
        let chord = theme.chords[c];
        let bassNote = theme.bass[c];
        
        // Bass line (2 notes per chord)
        playNote(bassNote, theme.tempo*3.8, 'triangle', 0.06, time);
        playNote(bassNote*1.5, theme.tempo*3.8, 'triangle', 0.04, time + theme.tempo*4);
        
        // Arpeggio Chord (4 notes per chord)
        for(let i=0; i<4; i++) {
            let noteIndex = chord[i % chord.length];
            let freq = theme.scale[noteIndex % theme.scale.length];
            playNote(freq, theme.tempo*0.9, 'square', 0.03, time + theme.tempo*i);
            // Harmonic echo
            playNote(freq*2, theme.tempo*0.4, 'sine', 0.01, time + theme.tempo*i + theme.tempo*0.5);
        }
        
        // Melody (randomized within scale for variation)
        for(let i=0; i<4; i++) {
            if(Math.random() > 0.3) { // 70% chance to play a melody note for rhythm
                let melIdx = Math.floor(Math.random() * theme.scale.length);
                let freq = theme.scale[melIdx] * 2; // Higher octave
                let delay = theme.tempo * (i + Math.floor(Math.random()*2));
                playNote(freq, theme.tempo*0.5, 'square', 0.02, time + delay);
            }
        }
        time += theme.tempo * 4;
    }
    
    // Loop the section
    musicLoopTimeout = setTimeout(() => { if(game_state !== 'TITLE') playBiomeMusic(biome); }, time * 1000 + 100);
}

// --- AD & WALLET ---
function showAd(cb) { try { if (typeof show_10997672 === "function") { show_10997672().then(() => { wallet += 0.001; adsWatched++; if(cb) cb(); }); } else { wallet += 0.001; adsWatched++; if(cb) cb(); } } catch (e) { if(cb) cb(); } }
function updateWalletUI() { document.getElementById('w-ads').innerText = adsWatched; document.getElementById('w-money').innerText = wallet.toFixed(3); const wBtn = document.getElementById('withdraw-btn'); if(wallet >= 1.0) { wBtn.disabled = false; wBtn.classList.add('withdraw-active'); } else { wBtn.disabled = true; wBtn.classList.remove('withdraw-active'); } }

// --- UI UPDATES ---
function showScreen(id) { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); document.getElementById(id).classList.add('active'); }
function updateWorldUI() {
    document.getElementById('ui-lvl').innerText = player.level; document.getElementById('ui-name').innerText = player.name;
    document.getElementById('ui-hp-bar').querySelector('.bar-fill').style.width = (player.stats.hp / player.stats.maxHp * 100) + '%';
    document.getElementById('ui-hp-bar').querySelector('span').innerText = `${player.stats.hp}/${player.stats.maxHp}`;
    document.getElementById('ui-mp-bar').querySelector('.bar-fill').style.width = (player.stats.mp / player.stats.maxMp * 100) + '%';
    document.getElementById('ui-mp-bar').querySelector('span').innerText = `${player.stats.mp}/${player.stats.maxMp}`;
    document.getElementById('ui-xp-bar').querySelector('.bar-fill').style.width = (player.xp / player.xpNext * 100) + '%';
    document.getElementById('ui-xp-bar').querySelector('span').innerText = `${player.xp}/${player.xpNext}`;
}

// --- STARTER LOGIC ---
let selectedType = null; let tempStats = { vit: 10, str: 10, int: 10, res: 10, agi: 10 }; let pointsLeft = 20;
document.querySelectorAll('.starter-card').forEach(c => { c.onclick = () => { document.querySelectorAll('.starter-card').forEach(x => x.classList.remove('selected')); c.classList.add('selected'); selectedType = c.dataset.type; }; });
document.querySelectorAll('.stat-btn.plus').forEach(b => { b.onclick = () => { if(pointsLeft<=0)return; pointsLeft--; tempStats[b.dataset.stat]++; updateStatUI(); }; });
document.querySelectorAll('.stat-btn.minus').forEach(b => { b.onclick = () => { if(tempStats[b.dataset.stat]<=10)return; pointsLeft++; tempStats[b.dataset.stat]--; updateStatUI(); }; });
function updateStatUI() { document.getElementById('pts-left').innerText=pointsLeft; document.getElementById('stat-vit').innerText=tempStats.vit; document.getElementById('stat-str').innerText=tempStats.str; document.getElementById('stat-int').innerText=tempStats.int; document.getElementById('stat-res').innerText=tempStats.res; document.getElementById('stat-agi').innerText=tempStats.agi; }
document.getElementById('confirm-starter').onclick = () => { if (!selectedType) return alert('Choose!'); let name = document.getElementById('creature-name').value.trim(); if (!name) return alert('Name!'); player = defaultPlayer(); player.name=name; player.type=selectedType; player.stats.vit=tempStats.vit; player.stats.str=tempStats.str; player.stats.int=tempStats.int; player.stats.res=tempStats.res; player.stats.agi=tempStats.agi; initWorld(); showScreen('world-screen'); game_state='WORLD'; updateWorldUI(); startWorldLoop(); playBiomeMusic('plaine'); };
document.getElementById('btn-restore-map').onclick = () => { showAd(() => { player.stats.hp=player.stats.maxHp; player.stats.mp=player.stats.maxMp; updateWorldUI(); }); };

// --- PROCEDURAL MAP TEXTURES ---
function initWorld() {
    worldMap = []; let biomes = ['plaine', 'foret', 'desert', 'eau', 'glace', 'volcan', 'montagne'];
    let chunkGrid = []; for(let cx=0;cx<10;cx++){chunkGrid[cx]=[];for(let cy=0;cy<10;cy++){chunkGrid[cx][cy]=biomes[Math.floor(Math.random()*biomes.length)];}}
    for(let x=0;x<100;x++){worldMap[x]=[];for(let y=0;y<100;y++){worldMap[x][y]=chunkGrid[Math.floor(x/10)][Math.floor(y/10)];}}
    for(let i=0;i<12;i++){worldMap[Math.floor(Math.random()*90)+5][Math.floor(Math.random()*90)+5]='temple';}
    if(player.finalBossActive)worldMap[50][50]='final_temple';
    
    mapCanvas = document.createElement('canvas'); mapCanvas.width = 3200; mapCanvas.height = 3200; mapCtx = mapCanvas.getContext('2d');
    for(let cx=0;cx<10;cx++){for(let cy=0;cy<10;cy++){
        let tx = cx*320, ty = cy*320, type = chunkGrid[cx][cy];
        if(type==='plaine'){mapCtx.fillStyle='#4a8c38';mapCtx.fillRect(tx,ty,320,320);for(let i=0;i<200;i++){mapCtx.fillStyle="#5a9c48";mapCtx.fillRect(tx+Math.random()*320,ty+Math.random()*320,2,6);}}
        else if(type==='foret'){mapCtx.fillStyle='#2d5a1e';mapCtx.fillRect(tx,ty,320,320);for(let i=0;i<15;i++){let rx=tx+Math.random()*320,ry=ty+Math.random()*320;mapCtx.fillStyle="#5c3d1e";mapCtx.fillRect(rx,ry,6,20);mapCtx.fillStyle="#1e5c1e";mapCtx.beginPath();mapCtx.arc(rx+3,ry-5,15,0,Math.PI*2);mapCtx.fill();}}
        else if(type==='desert'){mapCtx.fillStyle='#c2b280';mapCtx.fillRect(tx,ty,320,320);for(let i=0;i<5;i++){mapCtx.fillStyle="#d4c090";mapCtx.beginPath();mapCtx.moveTo(tx+Math.random()*320,ty+320);mapCtx.quadraticCurveTo(tx+160,ty+50+Math.random()*100,tx+Math.random()*320,ty+320);mapCtx.fill();}}
        else if(type==='eau'){mapCtx.fillStyle='#1a5276';mapCtx.fillRect(tx,ty,320,320);for(let i=0;i<20;i++){mapCtx.strokeStyle="#2e86c1";mapCtx.beginPath();mapCtx.moveTo(tx+Math.random()*320,ty+Math.random()*320);mapCtx.quadraticCurveTo(tx+160,ty+Math.random()*320,tx+Math.random()*320,ty+Math.random()*320);mapCtx.stroke();}}
        else if(type==='glace'){mapCtx.fillStyle='#aed6f1';mapCtx.fillRect(tx,ty,320,320);for(let i=0;i<30;i++){mapCtx.fillStyle="#fff";mapCtx.beginPath();mapCtx.moveTo(tx+Math.random()*320,ty+Math.random()*320);mapCtx.lineTo(tx+Math.random()*320,ty+Math.random()*320);mapCtx.lineTo(tx+Math.random()*320,ty+Math.random()*320);mapCtx.fill();}}
        else if(type==='volcan'){mapCtx.fillStyle='#4a1a1a';mapCtx.fillRect(tx,ty,320,320);for(let i=0;i<10;i++){mapCtx.fillStyle="#ff3300";mapCtx.beginPath();mapCtx.arc(tx+Math.random()*320,ty+Math.random()*320,5+Math.random()*10,0,Math.PI*2);mapCtx.fill();}}
        else if(type==='montagne'){mapCtx.fillStyle='#7f8c8d';mapCtx.fillRect(tx,ty,320,320);for(let i=0;i<5;i++){mapCtx.fillStyle="#95a5a6";mapCtx.beginPath();mapCtx.moveTo(tx+Math.random()*320,ty+320);mapCtx.lineTo(tx+160,ty+20+Math.random()*100);mapCtx.lineTo(tx+Math.random()*320,ty+320);mapCtx.fill();mapCtx.fillStyle="#fff";mapCtx.beginPath();mapCtx.moveTo(tx+140+Math.random()*40,ty+20+Math.random()*100);mapCtx.lineTo(tx+160,ty+50);mapCtx.lineTo(tx+180+Math.random()*40,ty+20+Math.random()*100);mapCtx.fill();}}
        else if(type==='temple'||type==='final_temple'){mapCtx.fillStyle='#4a8c38';mapCtx.fillRect(tx,ty,320,320);mapCtx.fillStyle="#777";mapCtx.fillRect(tx+130,ty+130,60,60);mapCtx.fillStyle=type==='final_temple'?"#f0f":"#ff0";mapCtx.beginPath();mapCtx.moveTo(tx+160,ty+110);mapCtx.lineTo(tx+180,ty+140);mapCtx.lineTo(tx+140,ty+140);mapCtx.fill();}
    }}
}

// --- WORLD LOOP ---
let worldCanvas, worldCtx; let joyActive=false, joyX=0, joyY=0;
function startWorldLoop(){worldCanvas=document.getElementById('world-canvas');worldCtx=worldCanvas.getContext('2d');worldCanvas.width=window.innerWidth;worldCanvas.height=window.innerHeight;requestAnimationFrame(drawWorld);}
const joyZone=document.getElementById('joystick-zone');const joyThumb=document.getElementById('joystick-thumb');
joyZone.addEventListener('touchstart',(e)=>{joyActive=true;e.preventDefault();},{passive:false});
joyZone.addEventListener('touchmove',(e)=>{let t=e.touches[0];let r=joyZone.getBoundingClientRect();joyX=(t.clientX-r.left-r.width/2)/50;joyY=(t.clientY-r.top-r.height/2)/50;if(Math.abs(joyX)>1)joyX=Math.sign(joyX);if(Math.abs(joyY)>1)joyY=Math.sign(joyY);joyThumb.style.transform=`translate(calc(-50% + ${joyX*30}px), calc(-50% + ${joyY*30}px))`;e.preventDefault();},{passive:false});
joyZone.addEventListener('touchend',()=>{joyActive=false;joyX=0;joyY=0;joyThumb.style.transform='translate(-50%, -50%)';});

function drawWorld(){
    if(game_state!=='WORLD')return;
    if(joyActive){player.x+=joyX*0.08;player.y+=joyY*0.08;if(player.x<0)player.x=0;if(player.x>99)player.x=99;if(player.y<0)player.y=0;if(player.y>99)player.y=99;
        let tile=worldMap[Math.floor(player.x)][Math.floor(player.y)];
        // Change music based on biome
        if(tile !== currentBiome && tile !== 'temple' && tile !== 'final_temple') { currentBiome = tile; playBiomeMusic(currentBiome); }
        if(tile==='temple'||tile==='final_temple')initBattle(tile==='final_temple');
        else if(tile==='foret'&&Math.random()<0.01)initBattle(false);
        else if(tile==='montagne'&&Math.random()<0.015)initBattle(false);
        else if(tile!=='eau'&&Math.random()<0.003)findItem();
    }
    worldCtx.fillStyle='#000';worldCtx.fillRect(0,0,worldCanvas.width,worldCanvas.height);
    let s=2.5,t=32;let ox=worldCanvas.width/2-player.x*t*s;let oy=worldCanvas.height/2-player.y*t*s;
    worldCtx.drawImage(mapCanvas,ox,oy,mapCanvas.width*s,mapCanvas.height*s);
    drawPlayerMonster(worldCtx,worldCanvas.width/2,worldCanvas.height/2+20,player.type);
    updateWorldUI();requestAnimationFrame(drawWorld);
}
function findItem(){let i=POTION_TYPES[Math.floor(Math.random()*POTION_TYPES.length)];player.inventory[i.name]=(player.inventory[i.name]||0)+1;}

// --- CREATURE DRAWING ---
function seededRandom(max){enemySeed=(enemySeed*9301+49297)%233280;return Math.floor((enemySeed/233280)*max);}

function drawPlayerMonster(ctx,x,y,type){
    ctx.save();ctx.translate(x,y);
    let c=type==='fire'?['#880000','#ff4400']:type==='water'?['#001a66','#0088ff']:['#004400','#44ff00'];
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.beginPath();ctx.ellipse(0,50,50,15,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=c[0];ctx.fillRect(-30,10,15,40);ctx.fillRect(15,10,15,40);ctx.fillStyle=c[1];ctx.fillRect(-35,45,25,10);ctx.fillRect(10,45,25,10);
    ctx.fillStyle=c[0];ctx.beginPath();ctx.moveTo(-40,-20);ctx.lineTo(-50,20);ctx.lineTo(50,20);ctx.lineTo(40,-20);ctx.closePath();ctx.fill();ctx.strokeStyle=c[1];ctx.lineWidth=3;ctx.stroke();
    ctx.fillStyle=c[0];ctx.beginPath();ctx.ellipse(0,-20,35,40,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.lineWidth=8;ctx.strokeStyle=c[0];ctx.beginPath();ctx.moveTo(-40,-10);ctx.lineTo(-60,20);ctx.stroke();ctx.beginPath();ctx.moveTo(40,-10);ctx.lineTo(60,20);ctx.stroke();
    ctx.fillStyle=c[1];ctx.fillRect(-65,15,15,10);ctx.fillRect(55,15,15,10);
    ctx.fillStyle=c[0];ctx.beginPath();ctx.moveTo(-20,-60);ctx.lineTo(20,-60);ctx.lineTo(25,-30);ctx.lineTo(-25,-30);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle=c[1];ctx.beginPath();ctx.moveTo(-15,-60);ctx.lineTo(-25,-90);ctx.lineTo(-5,-60);ctx.fill();ctx.beginPath();ctx.moveTo(15,-60);ctx.lineTo(25,-90);ctx.lineTo(5,-60);ctx.fill();
    ctx.fillStyle='#fff';ctx.fillRect(-15,-50,10,5);ctx.fillRect(5,-50,10,5);ctx.fillStyle='#000';ctx.fillRect(-12,-50,4,5);ctx.fillRect(8,-50,4,5);
    ctx.fillStyle='#000';ctx.fillRect(-10,-40,20,5);ctx.fillStyle='#fff';for(let i=0;i<4;i++){ctx.fillRect(-8+i*5,-42,3,3);}
    ctx.restore();
}

function drawEnemyMonster(ctx,x,y,type){
    ctx.save();ctx.translate(x,y);ctx.scale(-1,1);
    let c=type==='fire'?['#880000','#ff0000']:type==='water'?['#000088','#0000ff']:['#005500','#00ff00'];
    let isDemon=enemy.isFinal;
    ctx.fillStyle='rgba(0,0,0,0.4)';ctx.beginPath();ctx.ellipse(0,50,60,20,0,0,Math.PI*2);ctx.fill();
    let bw=40+seededRandom(30);let bh=40+seededRandom(30);
    ctx.fillStyle=c[0];ctx.beginPath();ctx.moveTo(0,-bh);ctx.bezierCurveTo(-bw,-bh/2,-bw,bh/2,0,bh);ctx.bezierCurveTo(bw,bh/2,bw,-bh/2,0,-bh);ctx.fill();ctx.strokeStyle=c[1];ctx.lineWidth=4;ctx.stroke();
    let nl=2+(seededRandom(3)*2);for(let i=0;i<nl;i++){let lx=-bw/2+(i*(bw/nl));let ly=bh-10;ctx.fillStyle=c[0];ctx.fillRect(lx,ly,10,30+seededRandom(20));ctx.fillStyle=c[1];ctx.fillRect(lx-2,ly+25+seededRandom(15),14,5);}
    if(seededRandom(2)===0||isDemon){ctx.fillStyle=c[0]+'88';ctx.strokeStyle=c[1];ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-bw/2,0);ctx.quadraticCurveTo(-bw*2,-bh*1.5,-bw/2,-bh/2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(bw/2,0);ctx.quadraticCurveTo(bw*2,-bh*1.5,bw/2,-bh/2);ctx.fill();ctx.stroke();}
    let hs=25+seededRandom(20);ctx.fillStyle=c[0];ctx.beginPath();ctx.ellipse(0,-bh-hs/2,hs,hs*0.8,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=c[1];ctx.stroke();
    let nh=1+seededRandom(4);for(let i=0;i<nh;i++){let hx=-hs/2+(i*(hs/nh));let hy=-bh-hs;ctx.fillStyle=c[1];ctx.beginPath();ctx.moveTo(hx,hy);ctx.lineTo(hx-10+seededRandom(20),hy-20-seededRandom(30));ctx.lineTo(hx+10-seededRandom(20),hy);ctx.fill();}
    ctx.strokeStyle=c[1];ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(0,bh/2);let tl=50+seededRandom(80);let tw=-50+seededRandom(100);let th=50+seededRandom(80);ctx.quadraticCurveTo(tw,th,tw/2,tl);ctx.stroke();ctx.fillStyle=c[1];ctx.beginPath();ctx.arc(tw/2,tl,8,0,Math.PI*2);ctx.fill();
    let ne=1+seededRandom(5);for(let i=0;i<ne;i++){let ex=-hs/2+seededRandom(hs);let ey=-bh-hs+seededRandom(hs/2);ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(ex,ey,6,4,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ff0000';ctx.beginPath();ctx.arc(ex,ey,3,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(0,-bh-hs/2+10,20,10,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';let nt=4+seededRandom(6);for(let i=0;i<nt;i++){let txx=-15+(i*(30/nt));ctx.fillRect(txx,-bh-hs/2+5,4,8);ctx.fillRect(txx,-bh-hs/2+12,4,8);}
    ctx.restore();
}

// --- BATTLE SYSTEM ---
function generateEnemy(isTemple,isFinal){
    enemySeed=Math.floor(Math.random()*100000);let lvl=isFinal?player.level*2:(isTemple?player.level+5:player.level+Math.floor(seededRandom(3))-1);if(lvl<1)lvl=1;
    let name=isFinal?"ULTIMATE EVIL":PREFIXES[seededRandom(PREFIXES.length)]+SUFFIXES[seededRandom(SUFFIXES.length)];let bHp=150+(lvl*25);let bMp=50+lvl*5;
    let loot=seededRandom(100)<40?POTION_TYPES[seededRandom(POTION_TYPES.length)]:null;
    return{name,type:['fire','water','plant'][seededRandom(3)],level:lvl,stats:{maxHp:bHp,hp:bHp,maxMp:bMp,mp:bMp,vit:5+lvl+seededRandom(5),str:5+lvl*2+seededRandom(5),int:5+lvl*2+seededRandom(5),res:5+lvl+seededRandom(5),agi:5+lvl+seededRandom(5)},isTemple,isFinal,seed:enemySeed,loot:loot};
}
function initBattle(isFinal){game_state='BATTLE';stopMusic();enemy=generateEnemy(worldMap[Math.floor(player.x)][Math.floor(player.y)]==='temple',isFinal);atbPlayer=0;atbEnemy=0;isPlayerTurn=false;isEnemyAttacking=false;showScreen('battle-screen');playBiomeMusic('battle');updateBattleUI();document.getElementById('battle-actions').classList.add('hidden');document.getElementById('sub-menu').classList.add('hidden');startATB();}
function startATB(){clearInterval(atbInterval);atbInterval=setInterval(()=>{if(game_state!=='BATTLE')return;if(!isPlayerTurn&&!isEnemyAttacking){atbPlayer+=(player.stats.vit/10);atbEnemy+=(enemy.stats.vit/10);if(atbPlayer>=100){atbPlayer=100;isPlayerTurn=true;document.getElementById('battle-actions').classList.remove('hidden');}if(atbEnemy>=100&&!isPlayerTurn){atbEnemy=100;triggerEnemyAttack();}updateATBUI();}},50);}
function updateATBUI(){document.querySelector('.atb-p').style.width=atbPlayer+'%';document.querySelector('.atb-e').style.width=atbEnemy+'%';}
function resetATB(){isPlayerTurn=false;atbPlayer=0;document.getElementById('battle-actions').classList.add('hidden');document.getElementById('sub-menu').classList.add('hidden');updateATBUI();}

function triggerEnemyAttack(){isEnemyAttacking=true;let isMagic=enemy.stats.int>enemy.stats.str&&enemy.stats.mp>=15;let dmg=0;let eType='claw';if(isMagic){dmg=Math.max(1,enemy.stats.int*2-player.stats.res);eType='thunder';enemy.stats.mp-=15;}else{dmg=Math.max(1,enemy.stats.str*2-player.stats.res);eType='claw';}logBattle(`${enemy.name} attacks! -${dmg} HP`);playEffect(eType);player.stats.hp-=dmg;setTimeout(()=>{atbEnemy=0;isEnemyAttacking=false;updateBattleUI();checkBattleEnd();},600);}

function updateBattleUI(){document.getElementById('b-p-name').innerText=`${player.name} Lvl${player.level}`;document.getElementById('b-e-name').innerText=`${enemy.name} Lvl${enemy.level}`;updateBar('b-player-stats',player.stats.hp,player.stats.maxHp,player.stats.mp,player.stats.maxMp);updateBar('b-enemy-stats',enemy.stats.hp,enemy.stats.maxHp,enemy.stats.mp,enemy.stats.maxMp);drawBattleScene();}
function updateBar(id,hp,maxHp,mp,maxMp){let d=document.getElementById(id);d.querySelector('.bar-fill.hp').style.width=(hp/maxHp*100)+'%';d.querySelector('.hp-txt').innerText=`${hp}/${maxHp}`;d.querySelector('.bar-fill.mp').style.width=(mp/maxMp*100)+'%';d.querySelector('.mp-txt').innerText=`${mp}/${maxMp}`;}

function drawBattleScene(){let bC=document.getElementById('battle-canvas');let ctx=bC.getContext('2d');bC.width=window.innerWidth;bC.height=window.innerHeight*0.45;let grd=ctx.createLinearGradient(0,0,0,bC.height);grd.addColorStop(0,"#222");grd.addColorStop(0.6,"#444");grd.addColorStop(0.6,"#333");grd.addColorStop(1,"#222");ctx.fillStyle=grd;ctx.fillRect(0,0,bC.width,bC.height);enemySeed=enemy.seed;drawPlayerMonster(ctx,bC.width*0.2,bC.height*0.6,player.type);drawEnemyMonster(ctx,bC.width*0.8,bC.height*0.4);}

function playEffect(type){let c=document.getElementById('battle-effects');let e=document.createElement('div');let a=document.getElementById('battle-arena');a.classList.remove('shake');if(type==='claw'){e.className='claw-attack';a.classList.add('shake');}else if(type==='fire'){e.className='magic-fire';a.classList.add('shake');}else if(type==='water'){e.className='magic-water';}else if(type==='plant'){e.className='magic-plant';a.classList.add('shake');}else if(type==='thunder'){e.className='magic-thunder';a.classList.add('shake');}c.appendChild(e);setTimeout(()=>{e.remove();a.classList.remove('shake');},600);}
function logBattle(msg){let l=document.getElementById('battle-log');l.innerHTML+=msg+'<br>';l.scrollTop=l.scrollHeight;}

// Actions
document.getElementById('btn-attack').onclick=()=>{if(!isPlayerTurn)return;let dmg=Math.max(1,player.stats.str*2-enemy.stats.res+Math.floor(Math.random()*10));enemy.stats.hp-=dmg;logBattle(`${player.name} attacks! -${dmg} HP`);playEffect('claw');updateBattleUI();resetATB();checkBattleEnd();};
document.getElementById('btn-steal').onclick=()=>{if(!isPlayerTurn)return;let sc=Math.min(90,(player.stats.agi/(player.stats.agi+enemy.stats.agi+20))*100);if(Math.random()*100<sc){if(enemy.loot){player.inventory[enemy.loot.name]=(player.inventory[enemy.loot.name]||0)+1;logBattle(`Stole ${enemy.loot.name}!`);enemy.loot=null;}else{logBattle("Nothing to steal!");}}else{logBattle("Failed to steal!");}resetATB();checkBattleEnd();};
document.getElementById('btn-magic').onclick=()=>showSubMenu('magic');
document.getElementById('btn-inventory').onclick=()=>showSubMenu('inventory');
document.getElementById('btn-symbols').onclick=()=>showSubMenu('symbols');
document.getElementById('btn-back').onclick=()=>{document.getElementById('battle-actions').classList.remove('hidden');document.getElementById('sub-menu').classList.add('hidden');};

function showSubMenu(type){document.getElementById('battle-actions').classList.add('hidden');document.getElementById('sub-menu').classList.remove('hidden');let list=document.getElementById('sub-menu-list');list.innerHTML='';
if(type==='magic'){if(player.spells.length===0)list.innerHTML='<p style="padding:5px;font-size:0.6rem">No magic</p>';player.spells.forEach(sp=>{let b=document.createElement('button');b.innerText=`${sp.name} (${sp.cost}MP)`;b.onclick=()=>{if(!isPlayerTurn)return;if(player.stats.mp<sp.cost)return logBattle("No MP!");player.stats.mp-=sp.cost;let dmg=Math.max(1,player.stats.int*2+sp.power-enemy.stats.res);enemy.stats.hp-=dmg;logBattle(`${player.name} casts ${sp.name}! -${dmg} HP`);playEffect(sp.type);updateBattleUI();resetATB();checkBattleEnd();};list.appendChild(b);});}
else if(type==='inventory'){for(let[n,q]of Object.entries(player.inventory)){if(q<=0)continue;let it=POTION_TYPES.find(p=>p.name===n);let b=document.createElement('button');b.innerText=`${n} x${q}`;b.onclick=()=>{let uB=document.createElement('button');uB.innerText=`USE ${n}`;uB.style.color='#0f0';uB.onclick=()=>{if(!isPlayerTurn)return;let s=it.stat==='hp'?'maxHp':'maxMp';player.stats[it.stat]=Math.min(player.stats[s],player.stats[it.stat]+it.val);player.inventory[n]--;logBattle(`Used ${n}!`);updateBattleUI();resetATB();};list.prepend(uB);};list.appendChild(b);}}
else if(type==='symbols'){if(player.symbols.length===0)list.innerHTML='<p style="padding:5px;font-size:0.6rem">No symbols</p>';player.symbols.forEach(s=>{let b=document.createElement('button');b.innerText=s;b.style.fontSize='1.5rem';list.appendChild(b);});}
}

function checkBattleEnd(){
    if(enemy.stats.hp<=0){logBattle(`${enemy.name} defeated!`);stopMusic();stopATB();let xG=50+enemy.level*20;player.xp+=xG;logBattle(`+${xG} XP!`);
    while(player.xp>=player.xpNext){player.xp-=player.xpNext;player.level++;player.xpNext=player.level*5000;player.stats.maxHp+=20;player.stats.maxMp+=10;player.stats.str+=2;player.stats.res+=2;player.stats.int+=2;player.stats.vit+=1;player.stats.agi+=1;player.stats.hp=player.stats.maxHp;player.stats.mp=player.stats.maxMp;logBattle(`LEVEL ${player.level}!`);
    if(player.level%4===0&&player.spells.length<20){let p=SPELL_POOL[player.type];let si=Math.min(Math.floor(player.level/10),p.length-1);let ns=p[si];player.spells.push(ns);logBattle(`Learned: ${ns.name}!`);}}
    let lt=POTION_TYPES[Math.floor(Math.random()*POTION_TYPES.length)];player.inventory[lt.name]=(player.inventory[lt.name]||0)+1;logBattle(`Found: ${lt.name}`);
    if(enemy.isTemple){player.templesBeaten++;player.symbols.push(SYMBOLS_EMOJI[player.templesBeaten-1]);worldMap[Math.floor(player.x)][Math.floor(player.y)]='plaine';if(player.templesBeaten>=12){player.finalBossActive=true;initWorld();}}
    if(enemy.isFinal){showAd(null);setTimeout(()=>{game_state='WIN';showScreen('win-screen');},2000);return true;}
    showAd(null);setTimeout(()=>{game_state='WORLD';showScreen('world-screen');playBiomeMusic(currentBiome);updateWorldUI();},3000);return true;}
    if(player.stats.hp<=0){logBattle(`${player.name} is K.O!`);stopMusic();stopATB();game_state='GAMEOVER';adsWatched=0;showScreen('gameover-screen');return true;}
    return false;
}
function stopATB(){clearInterval(atbInterval);}

// --- WALLET & INIT ---
document.getElementById('revive-btn').onclick=()=>{if(adsWatched<10){showAd(()=>{document.getElementById('revive-btn').innerText=`Revive (${10-adsWatched} Ads)`;updateWalletUI();});}else{player.stats.hp=Math.floor(player.stats.maxHp/2);player.stats.mp=Math.floor(player.stats.maxMp/2);game_state='WORLD';showScreen('world-screen');playBiomeMusic(currentBiome);updateWorldUI();}}
document.getElementById('world-wallet-btn').onclick=()=>{updateWalletUI();stopMusic();showScreen('wallet-screen');};
document.getElementById('wallet-close-btn').onclick=()=>{if(game_state==='WORLD'){showScreen('world-screen');playBiomeMusic(currentBiome);}};
document.getElementById('withdraw-btn').onclick=()=>{if(wallet>=1){alert("Telegram Withdraw Initiated!");wallet-=1.0;updateWalletUI();}};

window.onload=()=>{showScreen('title-screen');updateStatUI();document.getElementById('start-btn').onclick=()=>{initAudio();showScreen('starter-screen');};};