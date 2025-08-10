// src/app.js — upgraded: heart burst, composer modal, localStorage, router

const feed = document.getElementById('feed');
const stories = document.getElementById('stories');
const loader = document.getElementById('loader');
const newPostBtn = document.getElementById('newPostBtn');

let postCount = 0;
const STORAGE_KEY = 'miniFeed_posts_v1';
let posts = [];

// -------------------- util / persistence --------------------
function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch(e){
    console.warn('loadStored error', e);
    return [];
  }
}
function saveStored() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  } catch(e){ console.warn(e); }
}

// -------------------- sample generator --------------------
function makePost(i) {
  return {
    id: 'p' + i,
    author: ['Jane','John','Alex','Priya','Sam'][i%5] + ' ' + (i%7),
    avatar: `https://i.pravatar.cc/48?u=${i}`,
    time: (i%12)+ 'h',
    text: ["Chillin with coffee ☕","Sunset vibes 🌅","Coding late-night","Big mood","Tiny wins"][i%5],
    image: `https://picsum.photos/seed/${i}/900/540`,
    likes: Math.floor(Math.random()*300),
    createdAt: Date.now() - i*60000
  };
}

// -------------------- create DOM --------------------
function createPostEl(post) {
  const el = document.createElement('article');
  el.className = "relative bg-glass card-border shadow-soft rounded-2xl p-4 hover:scale-[1.015] transition-transform duration-300";
  el.dataset.id = post.id;

  el.innerHTML = `
    <div class="flex items-center gap-3 mb-3">
      <img src="${post.avatar}" class="w-11 h-11 rounded-full border-2 border-white/10" />
      <div class="flex-1">
        <div class="flex justify-between items-baseline">
          <div>
            <div class="font-semibold">${escapeHtml(post.author)}</div>
            <div class="text-xs text-white/60">${timeAgo(post.createdAt || Date.now())} • Public</div>
          </div>
          <button class="text-xs text-white/60 hover:text-white" data-id="${post.id}" aria-label="post menu">•••</button>
        </div>
      </div>
    </div>
    <p class="mb-3">${escapeHtml(post.text)}</p>
    ${post.image ? `<img src="${post.image}" class="rounded-post w-full object-cover mb-3 shadow-lg"/>` : ''}
    <div class="flex items-center justify-between text-sm text-white/80">
      <div class="flex items-center gap-4">
        <button class="like-btn flex items-center gap-2" data-liked="false" data-id="${post.id}">
          <span class="like-icon text-xl">🤍</span>
          <span class="like-count">${post.likes}</span>
        </button>
        <button class="comment-btn">💬 ${Math.floor(Math.random()*60)}</button>
      </div>
      <div class="flex items-center gap-3">
        <button class="share-btn">↗️ Share</button>
      </div>
    </div>
  `;

  // like handler with burst
  const likeBtn = el.querySelector('.like-btn');
  likeBtn.addEventListener('click', (e)=>{
    const btn = e.currentTarget;
    const icon = btn.querySelector('.like-icon');
    const countEl = btn.querySelector('.like-count');
    const liked = btn.getAttribute('data-liked') === 'true';
    const pid = btn.dataset.id;
    const idx = posts.findIndex(p=>p.id===pid);
    let count = parseInt(countEl.textContent,10);

    if(!liked) {
      btn.setAttribute('data-liked','true');
      icon.textContent = '❤️';
      countEl.textContent = String(count+1);
      if(idx>=0) posts[idx].likes = (posts[idx].likes||0)+1;
      spawnHeartBurst(btn);
    } else {
      btn.setAttribute('data-liked','false');
      icon.textContent = '🤍';
      countEl.textContent = String(Math.max(0,count-1));
      if(idx>=0) posts[idx].likes = Math.max(0,(posts[idx].likes||0)-1);
    }
    saveStored();
  });

  return el;
}

// tiny helper - escape
function escapeHtml(s=''){ return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" }[c])) }

// spawn a little heart burst positioned on the button
// -------------------- Heart + Confetti + Sound helpers --------------------
let __miniFeed_audioCtx = null;
function ensureAudio() {
  if (__miniFeed_audioCtx) return __miniFeed_audioCtx;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    __miniFeed_audioCtx = new AudioContext();
    return __miniFeed_audioCtx;
  } catch (e) {
    __miniFeed_audioCtx = null;
    return null;
  }
}

function playPopSound() {
  const ctx = ensureAudio();
  if (!ctx) return;
  // short click/pop using oscillator + fast envelope
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(420, ctx.currentTime);
  g.gain.setValueAtTime(0, ctx.currentTime);
  g.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.005);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
  o.connect(g);
  g.connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + 0.3);
}

// tiny confetti system (canvas)
function createConfettiPool() {
  let canvas = document.getElementById('confetti-canvas');
  if (canvas) return canvas;
  canvas = document.createElement('canvas');
  canvas.id = 'confetti-canvas';
  canvas.style.position = 'fixed';
  canvas.style.left = '0';
  canvas.style.top = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = 9999;
  document.body.appendChild(canvas);
  // actual pixel sizing
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  canvas.getContext('2d').scale(devicePixelRatio, devicePixelRatio);
  // keep size updated
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    canvas.getContext('2d').scale(devicePixelRatio, devicePixelRatio);
  });
  return canvas;
}

function launchConfetti(x, y, count = 30) {
  const canvas = createConfettiPool();
  const ctx = canvas.getContext('2d');
  const W = window.innerWidth;
  const H = window.innerHeight;
  
  const colors = [
    '#ff4e8a','#ffd166','#6ee7b7','#60a5fa','#a78bfa',
    '#ff758c','#fbbf24','#34d399','#3b82f6','#f472b6'
  ];
  const emojis = ['💖','🎉','✨','💫','🌸','🔥','⭐'];

  const particles = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2) * Math.random();
    const speed = 200 + Math.random() * 260;
    const shapeType = Math.random() < 0.15 ? 'emoji' : (Math.random() < 0.5 ? 'circle' : 'rect');
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed / 60 + (Math.random()-0.5)*2,
      vy: Math.sin(angle) * speed / 60 - (50 + Math.random()*80)/60,
      size: 6 + Math.random()*10,
      color: colors[Math.floor(Math.random()*colors.length)],
      emoji: emojis[Math.floor(Math.random()*emojis.length)],
      shape: shapeType,
      rot: Math.random()*360,
      drot: (Math.random()-0.5)*14,
      life: 60 + Math.floor(Math.random()*40)
    });
  }

  function tick() {
    ctx.clearRect(0, 0, W, H);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.vy += 0.12; // gravity
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.995;
      p.vy *= 0.995;
      p.rot += p.drot;
      p.life--;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);

      if (p.shape === 'rect') {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size*0.6);
      } else if (p.shape === 'circle') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size/2, 0, Math.PI*2);
        ctx.fill();
      } else if (p.shape === 'emoji') {
        ctx.font = `${p.size*2}px serif`;
        ctx.fillText(p.emoji, -p.size/2, p.size/2);
      }

      ctx.restore();
      if (p.life <= 0 || p.y > H + 50) particles.splice(i,1);
    }
    if (particles.length) {
      requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0,0,W,H);
    }
  }
  requestAnimationFrame(tick);
}

// improved heart burst that also triggers confetti + sound
function spawnHeartBurst(button) {
  // ensure audio unlocked on first gesture
  ensureAudio();

  const rect = button.getBoundingClientRect();
  const x = rect.left + rect.width/2;
  const y = rect.top + rect.height/2;

  // create SVG heart (slightly larger + gradient)
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('width','72');
  svg.setAttribute('height','72');
  svg.setAttribute('viewBox','0 0 24 24');
  svg.className = 'heart-burst';
  svg.style.left = (x - 36) + 'px';
  svg.style.top = (y - 36) + 'px';
  svg.style.position = 'fixed';
  svg.style.pointerEvents = 'none';
  svg.innerHTML = `
    <defs>
      <linearGradient id="g2" x1="0" x2="1">
        <stop offset="0" stop-color="#ff758c"/>
        <stop offset="1" stop-color="#ff4e8a"/>
      </linearGradient>
      <filter id="f1" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="6" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <path fill="url(#g2)" filter="url(#f1)" d="M12 21s-7-4.9-9-8.1C1.1 9.8 3.3 6 6.4 6 8.2 6 9 7.3 12 10.2 15 7.3 15.8 6 17.6 6 20.7 6 22.9 9.8 21 12.9 19 16.1 12 21 12 21z"></path>
  `;
  document.body.appendChild(svg);

  // simple scaling + fade animation via inline style (so it works without extra CSS)
  svg.style.transform = 'scale(0.2)';
  svg.style.opacity = '0.95';
  svg.style.transition = 'transform 360ms cubic-bezier(.2,.9,.2,1), opacity 420ms ease-out, top 420ms ease-out';
  // tiny push to trigger transition
  requestAnimationFrame(()=>{
    svg.style.transform = 'scale(1.08) translateY(-8px)';
    svg.style.opacity = '1';
    svg.style.top = (y - 52) + 'px';
  });
  // final fade
  setTimeout(()=>{
    svg.style.transform = 'scale(1) translateY(-34px)';
    svg.style.opacity = '0';
  }, 260);
  // remove after done
  setTimeout(()=>svg.remove(), 700);

  // play sound and confetti
  try { playPopSound(); } catch(e){ /* ignore */ }
  launchConfetti(x, y, 24);
}


// -------------------- rendering / infinite --------------------
function timeAgo(ts){
  if(!ts) return 'now';
  const s = Math.floor((Date.now()-ts)/1000);
  if(s < 60) return `${s}s`;
  const m = Math.floor(s/60);
  if(m < 60) return `${m}m`;
  const h = Math.floor(m/60);
  if(h<24) return `${h}h`;
  const d = Math.floor(h/24);
  return `${d}d`;
}

function renderAll(){
  feed.innerHTML = '';
  posts.slice().reverse().forEach(p => feed.appendChild(createPostEl(p)));
}

// loadMore creates fake posts (if needed) and adds to posts array then renders
function loadMore(n=4){
  loader.classList.remove('hidden');
  return new Promise(res=>{
    setTimeout(()=>{
      const batch = [];
      for(let i=0;i<n;i++){
        batch.push(makePost(postCount++));
      }
      posts = posts.concat(batch);
      saveStored();
      renderAll();
      loader.classList.add('hidden');
      res(batch);
    }, 500);
  });
}

// -------------------- stories --------------------
function initStories(){
  for(let i=0;i<8;i++){
    const s = document.createElement('div');
    s.className = "flex-shrink-0 w-20";
    s.innerHTML = `
      <div class="w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-secondary p-1 shadow-glow mx-auto mb-1">
        <img src="https://i.pravatar.cc/64?u=story${i}" class="w-full h-full rounded-full border-2 border-white/20 object-cover"/>
      </div>
      <div class="text-xs text-center text-white/70">${['You','Crew','Alex','Kai','Pam','Sam','Mia','Dev'][i]}</div>
    `;
    stories.appendChild(s);
  }
}

// -------------------- composer modal --------------------
function openCompose(initial = {}) {
  // create modal nodes
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal">
      <div class="flex justify-between items-center mb-2">
        <h3 class="font-semibold text-lg">New Post</h3>
        <button id="closeCompose" class="text-white/70">✕</button>
      </div>
      <textarea id="composeText" placeholder="What's happening?" class="w-full p-3 rounded-lg bg-transparent border-2 border-white/6 text-white mb-3" rows="4"></textarea>
      <input id="composeFile" type="file" accept="image/*" class="mb-3"/>
      <div id="previewWrap" class="mb-3 hidden"><img id="previewImg" class="img-preview" /></div>
      <div class="flex justify-end gap-3">
        <button id="postCancel" class="px-3 py-1 rounded-lg text-white/70">Cancel</button>
        <button id="postSend" class="px-3 py-1 rounded-lg bg-gradient-to-r from-primary to-secondary">Post</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);
  const close = backdrop.querySelector('#closeCompose');
  const cancel = backdrop.querySelector('#postCancel');
  const send = backdrop.querySelector('#postSend');
  const file = backdrop.querySelector('#composeFile');
  const text = backdrop.querySelector('#composeText');
  const previewWrap = backdrop.querySelector('#previewWrap');
  const previewImg = backdrop.querySelector('#previewImg');

  // prefill if initial
  text.value = initial.text || '';

  function teardown(){
    backdrop.remove();
    // navigate back to feed view
    location.hash = '#feed';
  }

  close.addEventListener('click', teardown);
  cancel.addEventListener('click', teardown);

  // image preview
  file.addEventListener('change', (ev)=>{
    const f = ev.target.files && ev.target.files[0];
    if(!f) { previewWrap.classList.add('hidden'); previewImg.src = ''; return; }
    const reader = new FileReader();
    reader.onload = e => {
      previewImg.src = e.target.result;
      previewWrap.classList.remove('hidden');
    };
    reader.readAsDataURL(f);
  });

  send.addEventListener('click', ()=>{
    const textVal = text.value.trim();
    const imgSrc = previewImg.src || '';
    const newPost = {
      id: 'p' + postCount++,
      author: 'You',
      avatar: `https://i.pravatar.cc/48?u=you`,
      time: 'now',
      text: textVal || '(no text)',
      image: imgSrc,
      likes: 0,
      createdAt: Date.now()
    };
    posts.push(newPost);
    saveStored();
    renderAll();
    teardown();
  });
}

// wire top button
newPostBtn?.addEventListener('click', ()=>{
  // go to composer route
  location.hash = '#compose';
});

// -------------------- tiny router --------------------
function handleRoute(){
  const h = location.hash.replace('#','') || 'feed';
  if(h === 'compose') {
    openCompose();
  } else {
    // feed
    // nothing to do: feed visible by default
  }
}
window.addEventListener('hashchange', handleRoute);

// -------------------- infinite scroll --------------------
let fetching = false;
window.addEventListener('scroll', async ()=>{
  if(fetching) return;
  const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 500;
  if(nearBottom){
    fetching = true;
    await loadMore(3);
    fetching = false;
  }
});

// -------------------- init --------------------
function init() {
  initStories();
  // load stored posts or create sample ones
  const stored = loadStored();
  if(stored && stored.length) {
    posts = stored;
    // ensure postCount high enough
    postCount = posts.length + 10;
    renderAll();
  } else {
    // seed
    posts = [];
    for(let i=0;i<6;i++) posts.push(makePost(postCount++));
    saveStored();
    renderAll();
  }
  handleRoute();
}
init();
