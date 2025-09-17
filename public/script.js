// Check session and get username
let username = null;
fetch('/api/me').then(res => {
  if (res.status === 401) window.location = '/login.html';
  return res.json();
}).then(data => {
  username = data.username;
  initSocket();
});

function initSocket() {
  const socket = io({
    auth: { username }
  });

  const messages = document.getElementById('messages');
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');

  socket.on('chat', (data) => {
    const div = document.createElement('div');
    div.textContent = `${data.username}: ${data.message}`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  });

  socket.on('user-joined', (data) => {
    const div = document.createElement('div');
    div.textContent = `${data.username} joined the lobby!`;
    div.className = 'notice';
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  });

  socket.on('user-left', (data) => {
    const div = document.createElement('div');
    div.textContent = `${data.username} left the lobby.`;
    div.className = 'notice';
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  });

  sendBtn.onclick = () => {
    if (input.value.trim()) {
      socket.emit('chat', input.value.trim());
      input.value = '';
    }
  };
  input.onkeydown = (e) => {
    if (e.key === 'Enter') sendBtn.onclick();
  };
}

document.getElementById('logout-btn').onclick = async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location = '/login.html';
};
