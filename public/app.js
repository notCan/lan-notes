(function () {
  const LOGIN_VIEW = document.getElementById('login-view');
  const APP_VIEW = document.getElementById('app-view');
  const LIST_VIEW = document.getElementById('list-view');
  const EDITOR_VIEW = document.getElementById('editor-view');
  const NOTES_LIST = document.getElementById('notes-list');
  const EMPTY_STATE = document.getElementById('empty-state');
  const BTN_NEW_NOTE = document.getElementById('btn-new-note');
  const BTN_CANCEL = document.getElementById('btn-cancel');
  const BTN_SAVE = document.getElementById('btn-save');
  const NOTE_FORM = document.getElementById('note-form');
  const NOTE_TITLE = document.getElementById('note-title');
  const TOP_LEVEL_ITEMS = document.getElementById('top-level-items');
  const SECTIONS_CONTAINER = document.getElementById('sections-container');
  const BTN_ADD_SECTION = document.getElementById('btn-add-section');
  const BTN_ADD_TOP_TEXT = document.getElementById('btn-add-top-text');
  const BTN_ADD_TOP_FILE = document.getElementById('btn-add-top-file');
  const INPUT_TOP_FILE = document.getElementById('input-top-file');
  const CONNECTION_STATUS = document.getElementById('connection-status');
  const LOGIN_FORM = document.getElementById('login-form');
  const REGISTER_FORM = document.getElementById('register-form');
  const LOGIN_USERNAME = document.getElementById('login-username');
  const LOGIN_PASSWORD = document.getElementById('login-password');
  const LOGIN_REMEMBER = document.getElementById('login-remember');
  const LOGIN_ERROR = document.getElementById('login-error');
  const REGISTER_USERNAME = document.getElementById('register-username');
  const REGISTER_PASSWORD = document.getElementById('register-password');
  const REGISTER_ERROR = document.getElementById('register-error');
  const BTN_SHOW_REGISTER = document.getElementById('btn-show-register');
  const BTN_SHOW_LOGIN = document.getElementById('btn-show-login');
  const LOGIN_CARD = LOGIN_VIEW.querySelector('.login-card');
  const REGISTER_CARD = document.getElementById('register-card');
  const BTN_LOGOUT = document.getElementById('btn-logout');
  const USER_NAME = document.getElementById('user-name');

  let notes = [];
  let editingNoteId = null;
  let editorNote = null;
  const socket = io({ autoConnect: false });

  function id() {
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'tmp-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  }

  function setConnectionStatus(connected) {
    CONNECTION_STATUS.className = 'status-dot ' + (connected ? 'connected' : 'disconnected');
    CONNECTION_STATUS.setAttribute('aria-label', connected ? 'Bağlı' : 'Bağlantı yok');
    CONNECTION_STATUS.title = connected ? 'Bağlı' : 'Bağlantı yok';
  }

  socket.on('connect', () => setConnectionStatus(true));
  socket.on('disconnect', () => setConnectionStatus(false));
  socket.on('notes', (newNotes) => {
    notes = newNotes || [];
    if (EDITOR_VIEW.classList.contains('hidden')) {
      renderList();
    } else if (editingNoteId) {
      const updated = notes.find(n => n.id === editingNoteId);
      if (updated) editorNote = JSON.parse(JSON.stringify(updated));
    }
  });

  function showLogin() {
    APP_VIEW.classList.add('hidden');
    LOGIN_VIEW.classList.remove('hidden');
    socket.disconnect();
  }

  function showApp(user) {
    LOGIN_VIEW.classList.add('hidden');
    APP_VIEW.classList.remove('hidden');
    if (USER_NAME) USER_NAME.textContent = user ? user.username : '';
    socket.connect();
    fetchNotes();
  }

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        showApp(data.user);
        return;
      }
    } catch (e) {}
    showLogin();
  }

  async function fetchNotes() {
    try {
      const res = await fetch('/api/notes', { credentials: 'include' });
      if (res.status === 401) {
        showLogin();
        return;
      }
      notes = await res.json();
      renderList();
    } catch (e) {
      if (e.message !== 'unauthorized') {
        notes = [];
        renderList();
      }
    }
  }

  function renderList() {
    NOTES_LIST.innerHTML = '';
    if (notes.length === 0) {
      EMPTY_STATE.classList.remove('hidden');
      return;
    }
    EMPTY_STATE.classList.add('hidden');
    notes.forEach((note) => {
      const li = document.createElement('li');
      li.className = 'note-card';
      const title = document.createElement('span');
      title.className = 'note-card-title';
      title.textContent = note.title || 'Başlıksız';
      const actions = document.createElement('div');
      actions.className = 'note-card-actions';
      const btnEdit = document.createElement('button');
      btnEdit.type = 'button';
      btnEdit.className = 'btn btn-secondary';
      btnEdit.textContent = 'Düzenle';
      btnEdit.addEventListener('click', () => openEditor(note));
      const btnDel = document.createElement('button');
      btnDel.type = 'button';
      btnDel.className = 'btn btn-danger';
      btnDel.textContent = 'Sil';
      btnDel.addEventListener('click', () => deleteNote(note.id));
      actions.append(btnEdit, btnDel);
      li.append(title, actions);
      NOTES_LIST.appendChild(li);
    });
  }

  function showList() {
    EDITOR_VIEW.classList.add('hidden');
    LIST_VIEW.classList.remove('hidden');
    editingNoteId = null;
    editorNote = null;
    renderList();
  }

  function openEditor(note) {
    editingNoteId = note ? note.id : null;
    editorNote = note
      ? JSON.parse(JSON.stringify(note))
      : {
          title: '',
          sections: [],
          topLevelItems: []
        };
    if (!editorNote.sections) editorNote.sections = [];
    if (!editorNote.topLevelItems) editorNote.topLevelItems = [];
    LIST_VIEW.classList.add('hidden');
    EDITOR_VIEW.classList.remove('hidden');
    document.getElementById('editor-title').textContent = editingNoteId ? 'Notu düzenle' : 'Yeni not';
    renderEditor();
  }

  function renderEditor() {
    NOTE_TITLE.value = editorNote.title || '';
    renderTopLevelItems();
    renderSections();
  }

  function renderTopLevelItems() {
    TOP_LEVEL_ITEMS.innerHTML = '';
    (editorNote.topLevelItems || []).forEach((item, index) => {
      TOP_LEVEL_ITEMS.appendChild(createItemRow(item, 'topLevelItems', index));
    });
  }

  function renderSections() {
    SECTIONS_CONTAINER.innerHTML = '';
    (editorNote.sections || []).forEach((section, sIdx) => {
      const block = document.createElement('div');
      block.className = 'section-block';
      const head = document.createElement('div');
      head.className = 'section-head';
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Alt başlık';
      input.value = section.subTitle || '';
      input.dataset.sectionIndex = String(sIdx);
      input.addEventListener('input', (e) => {
        editorNote.sections[sIdx].subTitle = e.target.value;
      });
      const btnRemoveSection = document.createElement('button');
      btnRemoveSection.type = 'button';
      btnRemoveSection.className = 'btn-remove';
      btnRemoveSection.textContent = '×';
      btnRemoveSection.title = 'Alt başlığı sil';
      btnRemoveSection.addEventListener('click', () => {
        editorNote.sections.splice(sIdx, 1);
        renderSections();
      });
      head.append(input, btnRemoveSection);
      block.appendChild(head);
      const itemsList = document.createElement('div');
      itemsList.className = 'items-list';
      (section.items || []).forEach((item, iIdx) => {
        itemsList.appendChild(createItemRow(item, 'section', sIdx, iIdx));
      });
      block.appendChild(itemsList);
      const itemActions = document.createElement('div');
      itemActions.className = 'item-actions';
      const btnText = document.createElement('button');
      btnText.type = 'button';
      btnText.className = 'btn btn-small';
      btnText.textContent = '+ Metin ekle';
      btnText.addEventListener('click', () => {
        if (!editorNote.sections[sIdx].items) editorNote.sections[sIdx].items = [];
        editorNote.sections[sIdx].items.push({ id: id(), type: 'text', content: '' });
        renderSections();
      });
      const btnFile = document.createElement('button');
      btnFile.type = 'button';
      btnFile.className = 'btn btn-small';
      btnFile.textContent = '+ Dosya ekle';
      const inputFile = document.createElement('input');
      inputFile.type = 'file';
      inputFile.className = 'hidden';
      inputFile.addEventListener('change', () => uploadAndAddToSection(inputFile, sIdx));
      btnFile.addEventListener('click', () => inputFile.click());
      itemActions.append(btnText, btnFile, inputFile);
      block.appendChild(itemActions);
      SECTIONS_CONTAINER.appendChild(block);
    });
  }

  function createItemRow(item, context, sectionIndex, itemIndex) {
    const row = document.createElement('div');
    row.className = 'item-row';
    const content = document.createElement('div');
    content.className = 'content';
    if (item.type === 'file') {
      const a = document.createElement('a');
      a.href = item.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.className = 'item-link';
      a.textContent = (item.name || 'Dosya') + ' – indir';
      content.appendChild(a);
    } else {
      const textarea = document.createElement('textarea');
      textarea.placeholder = 'Not metni';
      textarea.value = item.content || '';
      textarea.addEventListener('input', (e) => {
        item.content = e.target.value;
      });
      content.appendChild(textarea);
    }
    const btnRemove = document.createElement('button');
    btnRemove.type = 'button';
    btnRemove.className = 'btn-remove';
    btnRemove.textContent = '×';
    btnRemove.title = 'Sil';
    btnRemove.addEventListener('click', () => {
      if (context === 'topLevelItems') {
        editorNote.topLevelItems.splice(sectionIndex, 1);
        renderTopLevelItems();
      } else {
        editorNote.sections[sectionIndex].items.splice(itemIndex, 1);
        renderSections();
      }
    });
    row.append(content, btnRemove);
    return row;
  }

  async function uploadAndAddToSection(input, sectionIndex) {
    const file = input.files && input.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!editorNote.sections[sectionIndex].items) editorNote.sections[sectionIndex].items = [];
      editorNote.sections[sectionIndex].items.push({
        id: id(),
        type: 'file',
        name: data.name,
        url: data.url
      });
      renderSections();
    } catch (e) {
      alert('Dosya yüklenemedi.');
    }
    input.value = '';
  }

  BTN_ADD_TOP_TEXT.addEventListener('click', () => {
    editorNote.topLevelItems = editorNote.topLevelItems || [];
    editorNote.topLevelItems.push({ id: id(), type: 'text', content: '' });
    renderTopLevelItems();
  });

  BTN_ADD_TOP_FILE.addEventListener('click', () => INPUT_TOP_FILE.click());
  INPUT_TOP_FILE.addEventListener('change', async () => {
    const file = INPUT_TOP_FILE.files && INPUT_TOP_FILE.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      editorNote.topLevelItems = editorNote.topLevelItems || [];
      editorNote.topLevelItems.push({
        id: id(),
        type: 'file',
        name: data.name,
        url: data.url
      });
      renderTopLevelItems();
    } catch (e) {
      alert('Dosya yüklenemedi.');
    }
    INPUT_TOP_FILE.value = '';
  });

  BTN_ADD_SECTION.addEventListener('click', () => {
    editorNote.sections = editorNote.sections || [];
    editorNote.sections.push({ id: id(), subTitle: '', items: [] });
    renderSections();
  });

  function collectFormNote() {
    editorNote.title = NOTE_TITLE.value.trim() || 'Yeni not';
    const topItems = [];
    TOP_LEVEL_ITEMS.querySelectorAll('.item-row').forEach((row, iIdx) => {
      const textarea = row.querySelector('textarea');
      const link = row.querySelector('.item-link');
      const existing = editorNote.topLevelItems[iIdx];
      if (textarea) {
        topItems.push({ id: (existing && existing.id) || id(), type: 'text', content: textarea.value });
      } else if (link) {
        topItems.push({
          id: (existing && existing.id) || id(),
          type: 'file',
          name: existing && existing.name,
          url: existing && existing.url
        });
      }
    });
    editorNote.topLevelItems = topItems;
    const sectionBlocks = SECTIONS_CONTAINER.querySelectorAll('.section-block');
    editorNote.sections = Array.from(sectionBlocks).map((block, sIdx) => {
      const existing = editorNote.sections[sIdx] || { items: [] };
      const subInput = block.querySelector('.section-head input');
      const items = [];
      block.querySelectorAll('.items-list .item-row').forEach((row, iIdx) => {
        const textarea = row.querySelector('textarea');
        const link = row.querySelector('.item-link');
        const prev = existing.items && existing.items[iIdx];
        if (textarea) {
          items.push({
            id: (prev && prev.id) || id(),
            type: 'text',
            content: textarea.value
          });
        } else if (link) {
          items.push({
            id: (prev && prev.id) || id(),
            type: 'file',
            name: prev && prev.name,
            url: prev && prev.url
          });
        }
      });
      return {
        id: existing.id || id(),
        subTitle: subInput ? subInput.value : (existing.subTitle || ''),
        items
      };
    });
    return editorNote;
  }

  async function saveNote() {
    collectFormNote();
    const payload = {
      title: editorNote.title,
      sections: editorNote.sections,
      topLevelItems: editorNote.topLevelItems
    };
    try {
      const opts = { method: editingNoteId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) };
      const url = editingNoteId ? `/api/notes/${editingNoteId}` : '/api/notes';
      const res = await fetch(url, opts);
      if (res.status === 401) { showLogin(); return; }
      if (!res.ok) throw new Error();
      showList();
    } catch (e) {
      alert('Kaydedilemedi.');
    }
  }

  async function deleteNote(noteId) {
    if (!confirm('Bu notu silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/notes/${noteId}`, { method: 'DELETE', credentials: 'include' });
      if (res.status === 401) { showLogin(); return; }
      showList();
    } catch (e) {
      alert('Silinemedi.');
    }
  }

  BTN_NEW_NOTE.addEventListener('click', () => openEditor(null));
  BTN_CANCEL.addEventListener('click', showList);
  BTN_SAVE.addEventListener('click', saveNote);
  NOTE_FORM.addEventListener('submit', (e) => {
    e.preventDefault();
    saveNote();
  });

  LOGIN_FORM.addEventListener('submit', async (e) => {
    e.preventDefault();
    LOGIN_ERROR.classList.add('hidden');
    LOGIN_ERROR.textContent = '';
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: LOGIN_USERNAME.value.trim(),
          password: LOGIN_PASSWORD.value,
          rememberMe: LOGIN_REMEMBER.checked
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        LOGIN_ERROR.textContent = data.error || 'Giriş yapılamadı';
        LOGIN_ERROR.classList.remove('hidden');
        return;
      }
      showApp(data.user);
    } catch (err) {
      LOGIN_ERROR.textContent = 'Bağlantı hatası';
      LOGIN_ERROR.classList.remove('hidden');
    }
  });

  REGISTER_FORM.addEventListener('submit', async (e) => {
    e.preventDefault();
    REGISTER_ERROR.classList.add('hidden');
    REGISTER_ERROR.textContent = '';
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: REGISTER_USERNAME.value.trim(),
          password: REGISTER_PASSWORD.value
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        REGISTER_ERROR.textContent = data.error || 'Kayıt olunamadı';
        REGISTER_ERROR.classList.remove('hidden');
        return;
      }
      showApp(data.user);
    } catch (err) {
      REGISTER_ERROR.textContent = 'Bağlantı hatası';
      REGISTER_ERROR.classList.remove('hidden');
    }
  });

  BTN_SHOW_REGISTER.addEventListener('click', () => {
    LOGIN_CARD.classList.add('hidden');
    REGISTER_CARD.classList.remove('hidden');
    LOGIN_ERROR.classList.add('hidden');
    REGISTER_ERROR.classList.add('hidden');
  });

  BTN_SHOW_LOGIN.addEventListener('click', () => {
    REGISTER_CARD.classList.add('hidden');
    LOGIN_CARD.classList.remove('hidden');
    LOGIN_ERROR.classList.add('hidden');
    REGISTER_ERROR.classList.add('hidden');
  });

  BTN_LOGOUT.addEventListener('click', async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {}
    showLogin();
  });

  checkAuth();
})();
