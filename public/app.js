const chat = document.getElementById('chat');
const input = document.getElementById('input');
const form = document.getElementById('form');
const status = document.getElementById('status');
const history = [];

function addBubble(text, role='assistant') {
  const el = document.createElement('div');
  el.className = `bubble ${role}`;
  el.textContent = text;
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
  return el;
}

async function ask(text) {
  input.value = text;
  await send();
}

async function send() {
  const message = input.value.trim();
  if (!message) return;
  input.value = '';
  addBubble(message, 'user');
  history.push({ role: 'user', content: message });
  const typing = addBubble('Thinking...', 'assistant');
  typing.classList.add('typing');
  try {
    const r = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({message, history:history.slice(-12)}) });
    const data = await r.json();
    typing.remove();
    const reply = data.reply || data.error || 'Sorry, I could not answer.';
    addBubble(reply, 'assistant');
    history.push({ role:'assistant', content:reply });
  } catch (e) {
    typing.remove();
    addBubble('The chatbot server is unavailable right now.', 'assistant');
  }
}
form.addEventListener('submit', e => { e.preventDefault(); send(); });
fetch('/api/status').then(r=>r.json()).then(x=>{status.title = x.online ? 'Online' : 'Offline';}).catch(()=>{status.style.color='#ef4444';});
