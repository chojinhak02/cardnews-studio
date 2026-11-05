const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const ARCHIVE_KEY = 'cardstudio-manual-archive-v2';
const LEGACY_KEY = 'cardstudio-project-v1';
const labels = ['표지', '도입', '포인트 1', '포인트 2', '포인트 3', '마무리'];
const inputIds = ['topic', 'audience', 'facts', 'message', 'cta'];
const example = {
  topic: '경주역신도시 아파트를 볼 때 확인할 3가지',
  audience: '경주역신도시에서 첫 집을 알아보는 분',
  facts: '교통: 평소 이동하는 경로와 출퇴근 시간을 직접 확인해 보세요.\n생활: 자주 이용할 시설까지 실제 이동 거리를 살펴보세요.\n계약: 관심 단지의 조건과 최신 공고를 계약 전에 다시 확인하세요.',
  message: '좋은 입지는 내 생활 동선에 맞는 곳입니다.',
  cta: '궁금한 점은 경주역신도시부동산 조진학 실장에게 문의해 주세요.'
};
const originalSample = [
  { title: '하루를 바꾸는\n작은 습관', body: '거창한 계획보다 오늘 바로 시작할 수 있는 작은 변화.', kicker: 'A BETTER EVERYDAY' },
  { title: '변화는 작게\n시작해도 괜찮아요', body: '처음부터 완벽하려고 애쓰지 마세요. 부담 없이 반복할 수 있는 행동 하나가 시작입니다.', kicker: '01 / WHY IT MATTERS' },
  { title: '단 하나의 행동을\n정해보세요', body: '아침에 물 한 잔 마시기, 잠들기 전 책 한 쪽 읽기처럼 구체적이고 쉬운 행동을 골라보세요.', kicker: '02 / THE FIRST STEP' },
  { title: '기존 루틴에\n붙여보세요', body: '이미 하고 있는 일 바로 뒤에 새 습관을 놓으면 잊지 않고 이어가기 쉬워집니다.', kicker: '03 / MAKE IT STICK' },
  { title: '작은 기록이\n동력이 됩니다', body: '해낸 날을 표시하고, 놓친 날에는 다시 시작하세요. 중요한 건 완벽함보다 꾸준함입니다.', kicker: '04 / KEEP GOING' },
  { title: '오늘의 작은 선택이\n내일을 만듭니다', body: '지금 시작할 수 있는 한 가지를 정해보세요. 저장해 두고 필요할 때 다시 꺼내 읽어요.', kicker: 'SAVE & SHARE' }
];
function previousWork() {
  try {
    const data = JSON.parse(localStorage.getItem(LEGACY_KEY));
    if (data && Array.isArray(data.cards) && data.cards.length === 6) return data;
  } catch {}
  return null;
}
const previous = previousWork();
const initialCards = previous ? previous.cards.map(card => ({ title: String(card.title || ''), body: String(card.body || ''), kicker: String(card.kicker || '') })) : structuredClone(originalSample);
const initialTopic = previous?.topic || '하루를 바꾸는 작은 습관';
let state = { cards: initialCards, selected: Math.min(5, Math.max(0, Number(previous?.selected) || 0)), theme: ['editorial','bold','minimal'].includes(previous?.theme) ? previous.theme : 'editorial', color: /^#[0-9a-f]{6}$/i.test(previous?.color) ? previous.color : '#f26f4f', savedId: null, dirty: false };
let toastTimer;

function showToast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2500); }
function readInputs() { return Object.fromEntries(inputIds.map(id => [id, $('#' + id).value.trim()])); }
function fillInputs(data) { inputIds.forEach(id => { $('#' + id).value = data[id] || ''; }); }
function markDirty() { state.dirty = true; $('#save-status').textContent = '저장하지 않은 작업'; $('#save-status').classList.remove('saved'); }
function markSaved() { state.dirty = false; $('#save-status').textContent = '보관함에 저장됨'; $('#save-status').classList.add('saved'); }
function linesOfFacts(value) { return value.split(/\r?\n/).map(line => line.trim()).filter(Boolean); }
function makeCards(data) {
  const facts = linesOfFacts(data.facts);
  const featured = data.message || '직접 확인한 정보로 판단해 보세요.';
  const audience = data.audience || '이 주제가 궁금한 분';
  const cards = [
    { title: data.topic.slice(0, 70), body: featured, kicker: 'GYEONGJU / CARD NEWS' },
    { title: '이런 분께\n필요한 이야기', body: `${audience}을 위한 핵심 정보를 한 장씩 정리했습니다.`, kicker: '01 / FOR YOU' }
  ];
  for (let i = 0; i < 3; i++) {
    const raw = facts[i] || '';
    const split = raw.indexOf(':') >= 0 ? raw.indexOf(':') : raw.indexOf('：');
    const head = split >= 0 && split <= 24 ? raw.slice(0, split).trim() : `핵심 포인트 ${i + 1}`;
    const body = split >= 0 && split <= 24 ? raw.slice(split + 1).trim() : raw;
    cards.push({ title: head || `핵심 포인트 ${i + 1}`, body: body || '[직접 확인한 정보 입력 필요]', kicker: `0${i + 2} / KEY POINT` });
  }
  cards.push({ title: featured.slice(0, 70), body: data.cta || '[마무리 안내 입력 필요]', kicker: '05 / SAVE & SHARE' });
  return cards;
}
function safeArchive() { try { const data = JSON.parse(localStorage.getItem(ARCHIVE_KEY)); return Array.isArray(data) ? data : []; } catch { return []; } }
function writeArchive(list) { try { localStorage.setItem(ARCHIVE_KEY, JSON.stringify(list)); return true; } catch { showToast('브라우저 저장 공간을 사용할 수 없어요.'); return false; } }
function updateSavedCount() { $('#saved-count').textContent = safeArchive().length; }
function saveDraft() {
  if (!state.cards.length) return showToast('먼저 카드뉴스를 만들어 주세요.');
  const list = safeArchive(); const id = state.savedId || String(Date.now());
  const item = { id, date: new Date().toLocaleString('ko-KR'), inputs: readInputs(), cards: state.cards.map(card => ({ ...card })), theme: state.theme, color: state.color, selected: state.selected };
  const next = [item, ...list.filter(entry => entry.id !== id)].slice(0, 10);
  if (writeArchive(next)) { state.savedId = id; markSaved(); updateSavedCount(); showToast('보관함에 저장했어요.'); }
}
function openArchive() {
  const list = safeArchive(), container = $('#archive-list'); container.replaceChildren();
  if (!list.length) { const empty = document.createElement('div'); empty.className = 'archive-empty'; empty.textContent = '저장된 카드뉴스가 없습니다.'; container.append(empty); }
  list.forEach(item => {
    const row = document.createElement('div'); row.className = 'archive-row';
    const info = document.createElement('div'); const title = document.createElement('strong'); title.textContent = item.inputs?.topic || '제목 없는 카드뉴스'; const date = document.createElement('small'); date.textContent = item.date || ''; info.append(title, date);
    const actions = document.createElement('div'); actions.className = 'archive-row-actions';
    const load = document.createElement('button'); load.type = 'button'; load.textContent = '불러오기'; load.addEventListener('click', () => loadDraft(item));
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '삭제'; remove.addEventListener('click', () => { if (!confirm('이 보관함 항목을 삭제할까요?')) return; if (writeArchive(safeArchive().filter(entry => entry.id !== item.id))) { if (state.savedId === item.id) { state.savedId = null; markDirty(); } updateSavedCount(); openArchive(); showToast('저장 항목을 삭제했어요.'); } });
    actions.append(load, remove); row.append(info, actions); container.append(row);
  });
  $('#archive-dialog').showModal();
}
function loadDraft(item) {
  if (state.dirty && !confirm('현재 저장하지 않은 작업을 버리고 보관함 내용을 불러올까요?')) return;
  if (!Array.isArray(item.cards) || item.cards.length !== 6) return showToast('이 저장 항목을 불러올 수 없어요.');
  fillInputs(item.inputs || {}); state.cards = item.cards.map(card => ({ title: String(card.title || ''), body: String(card.body || ''), kicker: String(card.kicker || '') }));
  state.theme = ['editorial','bold','minimal'].includes(item.theme) ? item.theme : 'editorial'; state.color = /^#[0-9a-f]{6}$/i.test(item.color) ? item.color : '#15805b'; state.selected = Math.min(5, Math.max(0, Number(item.selected) || 0)); state.savedId = item.id;
  renderAll(); markSaved(); $('#archive-dialog').close(); showToast('저장한 카드뉴스를 불러왔어요.');
}
function resetAll() {
  if ((inputIds.some(id => $('#' + id).value.trim()) || state.cards.length) && !confirm('현재 작업을 초기화할까요? 보관함에 저장하지 않은 내용은 사라집니다.')) return;
  fillInputs({}); state = { cards: [], selected: 0, theme: 'editorial', color: '#15805b', savedId: null, dirty: false }; renderAll(); $('#save-status').textContent = '저장하지 않은 작업'; $('#save-status').classList.remove('saved'); showToast('새 작업으로 초기화했어요.');
}

function hexRgb(hex) { return [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)); }
function rgba(hex, alpha) { const [r,g,b] = hexRgb(hex); return `rgba(${r},${g},${b},${alpha})`; }
function wrapText(ctx, text, maxWidth) {
  const lines = []; for (const paragraph of String(text).split('\n')) { if (!paragraph) { lines.push(''); continue; } let line = ''; for (const char of paragraph) { if (line && ctx.measureText(line + char).width > maxWidth) { lines.push(line); line = char; } else line += char; } lines.push(line); } return lines;
}
function fitText(ctx, text, width, start, minimum, maximumLines, weight) {
  for (let size=start;size>=minimum;size-=2) { ctx.font=`${weight} ${size}px "Noto Sans KR", sans-serif`; const lines=wrapText(ctx,text,width); if (lines.length<=maximumLines) return {size,lines,overflow:false}; }
  ctx.font=`${weight} ${minimum}px "Noto Sans KR", sans-serif`; const lines=wrapText(ctx,text,width); return {size:minimum,lines,overflow:lines.length>maximumLines};
}
function textLayout(ctx, card) {
  const title=fitText(ctx,card.title,860,88,50,4,800); const body=fitText(ctx,card.body,860,34,25,7,500);
  const total=title.lines.length*title.size*1.32 + body.lines.length*body.size*1.58 + 200;
  return {title,body,overflow:title.overflow||body.overflow||total>900,total};
}
function drawCard(card,index) {
  const canvas=document.createElement('canvas'); canvas.width=1080; canvas.height=1350; const ctx=canvas.getContext('2d');
  const color=state.color,bold=state.theme==='bold',minimal=state.theme==='minimal'; const fg=bold?'#fff':'#1c2a24';
  ctx.fillStyle=bold?color:minimal?'#fff':'#f8f7ef'; ctx.fillRect(0,0,1080,1350);
  if(!minimal){ctx.strokeStyle=bold?'rgba(255,255,255,.27)':rgba(color,.15);ctx.lineWidth=2;ctx.beginPath();ctx.arc(1045,500,295,0,2*Math.PI);ctx.stroke();ctx.fillStyle=bold?'rgba(255,255,255,.13)':rgba(color,.07);ctx.beginPath();ctx.arc(1070,1320,170,0,2*Math.PI);ctx.fill()}
  ctx.fillStyle=fg;ctx.font='800 27px "Noto Sans KR",sans-serif';ctx.fillText('경주역신도시',95,125);const w=ctx.measureText('경주역신도시').width;ctx.fillStyle=bold?'#fff':color;ctx.fillText('부동산',95+w,125);
  ctx.textAlign='right';ctx.fillStyle=bold?'rgba(255,255,255,.8)':'#748a7b';ctx.font='800 20px "DM Sans",sans-serif';ctx.fillText(`CARD NEWS  /  ${String(index+1).padStart(2,'0')}`,985,124);ctx.textAlign='left';
  const layout=textLayout(ctx,card);let top=minimal?1100-layout.total:Math.max(220,(1270-layout.total)/2);if(top<205)top=205;
  ctx.fillStyle=bold?'#fff':color;ctx.fillRect(95,top,175,4);ctx.font='800 22px "DM Sans",sans-serif';ctx.fillText(card.kicker,95,top+56);
  ctx.fillStyle=fg;ctx.font=`800 ${layout.title.size}px "Noto Sans KR",sans-serif`;let y=top+145;
  layout.title.lines.forEach(line=>{ctx.fillText(line,95,y);y+=layout.title.size*1.32});
  y+=40;ctx.fillStyle=bold?'rgba(255,255,255,.88)':'#607065';ctx.font=`500 ${layout.body.size}px "Noto Sans KR",sans-serif`;
  layout.body.lines.forEach(line=>{ctx.fillText(line,95,y);y+=layout.body.size*1.58});
  ctx.strokeStyle=bold?'rgba(255,255,255,.6)':'#ccd8cc';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(95,1212);ctx.lineTo(985,1212);ctx.stroke();
  ctx.fillStyle=bold?'rgba(255,255,255,.86)':'#6d8472';ctx.font='700 24px "Noto Sans KR",sans-serif';ctx.fillText('조진학 실장',95,1264);ctx.textAlign='right';ctx.font='800 21px "DM Sans",sans-serif';ctx.fillText(`${String(index+1).padStart(2,'0')} / 06`,985,1264);ctx.textAlign='left';
  return canvas;
}
function renderPreview() {
  const host=$('#card-preview');host.replaceChildren();const has=state.cards.length>0;$('#preview-empty').hidden=has;$('#prev-card').disabled=!has;$('#next-card').disabled=!has;$('#slide-counter').textContent=has?`${String(state.selected+1).padStart(2,'0')} / 06`:'00 / 06';
  if(has) host.append(drawCard(state.cards[state.selected],state.selected));
}
function renderFilmstrip(){const strip=$('#filmstrip'),dots=$('#nav-dots');strip.replaceChildren();dots.replaceChildren();state.cards.forEach((card,index)=>{const button=document.createElement('button');button.type='button';button.className=`film-card ${index===state.selected?'active':''}`;button.setAttribute('aria-label',`${index+1}번 카드 선택`);const image=document.createElement('div');image.className='film-image';image.append(drawCard(card,index));const caption=document.createElement('div');caption.className='film-caption';const name=document.createElement('span');name.textContent=labels[index];const num=document.createElement('span');num.textContent=String(index+1).padStart(2,'0');caption.append(name,num);button.append(image,caption);button.addEventListener('click',()=>selectCard(index));strip.append(button);const dot=document.createElement('button');dot.type='button';dot.className=`nav-dot ${index===state.selected?'active':''}`;dot.setAttribute('aria-label',`${index+1}번 카드로 이동`);dot.addEventListener('click',()=>selectCard(index));dots.append(dot)});}
function renderEditor(){const has=state.cards.length>0,card=state.cards[state.selected];$('#edit-title').disabled=!has;$('#edit-body').disabled=!has;$('#edit-title').value=has?card.title:'';$('#edit-body').value=has?card.body:'';$('#edit-card-num').textContent=has?`CARD ${String(state.selected+1).padStart(2,'0')}`:'—';$('#edit-card-type').textContent=has?`${labels[state.selected]} 카드 편집`:'초안을 만들면 카드를 편집할 수 있어요.';$('#title-count').textContent=`${$('#edit-title').value.length} / 70`;$('#body-count').textContent=`${$('#edit-body').value.length} / 220`;}
function renderControls(){$$('[data-theme]').forEach(b=>b.classList.toggle('active',b.dataset.theme===state.theme));$$('[data-color]').forEach(b=>b.classList.toggle('active',b.dataset.color.toLowerCase()===state.color.toLowerCase()));$('#custom-color').value=state.color;document.documentElement.style.setProperty('--green',state.color);}
function checkQuality(){if(!state.cards.length){$('#quality-summary').textContent='초안을 만들면 점검합니다';$('#quality-summary').className='quality-summary';$('#quality-list').replaceChildren();return}const inputs=readInputs(),facts=linesOfFacts(inputs.facts);const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');const overflow=state.cards.some(card=>textLayout(ctx,card).overflow);const checks=[
  {name:'주제와 대상',desc:'누구에게 필요한 이야기인지 분명한가요?',ok:!!inputs.topic&&!!inputs.audience},
  {name:'핵심 정보 3개',desc:'직접 확인한 내용을 세 가지 이상 입력했나요?',ok:facts.length>=3},
  {name:'전달할 한 문장',desc:'표지와 마지막 카드의 요점이 있나요?',ok:!!inputs.message},
  {name:'마무리 안내',desc:'마지막 장에 다음 행동이 담겼나요?',ok:!!inputs.cta},
  {name:'빈 문구·확인 필요',desc:'모든 카드의 임시 문구를 실제 내용으로 바꿨나요?',ok:state.cards.every(card=>card.title.trim()&&card.body.trim()&&!/[\[\]]|확인 필요/.test(card.title+card.body))},
  {name:'이미지 글자 넘침',desc:'PNG에서 잘릴 수 있는 긴 문구를 줄여 주세요.',ok:!overflow}
];const count=checks.filter(c=>c.ok).length;const summary=$('#quality-summary');summary.textContent=`${count} / ${checks.length}개 항목 통과`;summary.className=`quality-summary ${count===checks.length?'good':'warn'}`;const list=$('#quality-list');list.replaceChildren();checks.forEach(c=>{const row=document.createElement('div');row.className=`quality-item ${c.ok?'ok':'warn'}`;const icon=document.createElement('span');icon.className='quality-icon';icon.textContent=c.ok?'✓':'!';const body=document.createElement('div');const name=document.createElement('strong');name.textContent=c.name;const desc=document.createElement('small');desc.textContent=c.desc;body.append(name,desc);row.append(icon,body);list.append(row)});}
function renderAll(){renderControls();renderPreview();renderFilmstrip();renderEditor();checkQuality();const has=state.cards.length>0;$('#save-draft').disabled=!has;$('#download-current').disabled=!has;$('#download-all').disabled=!has;}
function selectCard(index){if(!state.cards.length)return;state.selected=(index+state.cards.length)%state.cards.length;renderPreview();renderFilmstrip();renderEditor();}
function makeDraft(){const data=readInputs();if(!data.topic){showToast('카드뉴스 주제를 입력해 주세요.');$('#topic').focus();return}if(state.cards.length&&!confirm('현재 카드 문구를 새 초안으로 바꿀까요? 기존 카드 내용은 사라집니다.'))return;state.cards=makeCards(data);state.selected=0;state.savedId=null;markDirty();renderAll();showToast('6장의 초안을 만들었어요. 내용을 검토해 주세요.');if(innerWidth<700)$('#preview').scrollIntoView({behavior:'smooth'});}
function saveCanvas(canvas,name){return new Promise(resolve=>canvas.toBlob(blob=>{if(!blob)return resolve(false);const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),20000);resolve(true)},'image/png'));}
function fileStem(){return(readInputs().topic||'cardnews').replace(/[\\/:*?"<>|]/g,'').replace(/\s+/g,'-').slice(0,35)}
async function exportCard(index){await document.fonts.ready;const c=document.createElement('canvas'),ctx=c.getContext('2d');if(textLayout(ctx,state.cards[index]).overflow){selectCard(index);showToast(`${index+1}번 카드의 글자가 길어요. 줄인 뒤 저장해 주세요.`);return false}return saveCanvas(drawCard(state.cards[index],index),`${fileStem()}-${String(index+1).padStart(2,'0')}.png`)}
async function exportAll(){await document.fonts.ready;const c=document.createElement('canvas'),ctx=c.getContext('2d');const problem=state.cards.findIndex(card=>textLayout(ctx,card).overflow);if(problem>=0){selectCard(problem);showToast(`${problem+1}번 카드의 글자가 길어요. 수정 후 다시 저장해 주세요.`);return}const button=$('#download-all');button.disabled=true;button.textContent='내보내는 중…';let count=0;for(let i=0;i<state.cards.length;i++){if(await saveCanvas(drawCard(state.cards[i],i),`${fileStem()}-${String(i+1).padStart(2,'0')}.png`))count++;await new Promise(r=>setTimeout(r,180))}button.disabled=false;button.textContent='전체 PNG 다운로드';showToast(`${count}장의 PNG 저장을 시작했어요. 다중 다운로드 허용이 필요할 수 있어요.`)}

$('#fill-example').addEventListener('click',()=>{if(state.cards.length&&!confirm('현재 입력을 예시 내용으로 바꿀까요? 기존 카드는 그대로 유지됩니다.'))return;fillInputs(example);markDirty();showToast('예시를 채웠어요. 초안 만들기를 눌러 보세요.')});
$('#generate').addEventListener('click',makeDraft);$('#reset-all').addEventListener('click',resetAll);$('#save-draft').addEventListener('click',saveDraft);$('#open-archive').addEventListener('click',openArchive);$('#close-archive').addEventListener('click',()=>$('#archive-dialog').close());
inputIds.forEach(id=>$('#'+id).addEventListener('input',()=>{markDirty();if(state.cards.length)checkQuality()}));
$('#edit-title').addEventListener('input',e=>{state.cards[state.selected].title=e.target.value;$('#title-count').textContent=`${e.target.value.length} / 70`;markDirty();renderPreview();renderFilmstrip();checkQuality()});
$('#edit-body').addEventListener('input',e=>{state.cards[state.selected].body=e.target.value;$('#body-count').textContent=`${e.target.value.length} / 220`;markDirty();renderPreview();renderFilmstrip();checkQuality()});
$$('[data-theme]').forEach(b=>b.addEventListener('click',()=>{state.theme=b.dataset.theme;markDirty();renderControls();renderPreview();renderFilmstrip()}));
$$('[data-color]').forEach(b=>b.addEventListener('click',()=>{state.color=b.dataset.color;markDirty();renderControls();renderPreview();renderFilmstrip()}));
$('#custom-color').addEventListener('input',e=>{state.color=e.target.value;markDirty();renderControls();renderPreview();renderFilmstrip()});
$('#prev-card').addEventListener('click',()=>selectCard(state.selected-1));$('#next-card').addEventListener('click',()=>selectCard(state.selected+1));
document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(e.key==='ArrowLeft')selectCard(state.selected-1);if(e.key==='ArrowRight')selectCard(state.selected+1)});
$('#download-current').addEventListener('click',async()=>{const ok=await exportCard(state.selected);if(ok)showToast('현재 카드를 PNG로 저장했어요.')});$('#download-all').addEventListener('click',exportAll);
fillInputs({topic:initialTopic,audience:'',facts:initialCards.slice(2,5).map(card=>`${card.title.replace(/\n/g,' ')}: ${card.body}`).join('\n'),message:initialCards[0].body,cta:initialCards[5].body});
updateSavedCount();renderAll();document.fonts.ready.then(()=>{if(state.cards.length){renderPreview();renderFilmstrip();checkQuality()}});
