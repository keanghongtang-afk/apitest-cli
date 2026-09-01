(() => {
  'use strict';

  const state = {
    endpoints: [],
    entryPoint: '',
    baseUrl: '',
    selected: null,
    bodyType: 'json',
    mockObj: null,
    currentTheme: 'cute',
  };

  const themeRoots = [
    {
      name: 'cute',
      label: 'cute',
      root: {
        '--bg': '#fff7fb',
        '--bg-raised': '#ffeaf4',
        '--panel': '#fffdfd',
        '--panel-hover': '#fff1f6',
        '--border': '#f1d7e7',
        '--border-soft': '#f6e4ee',
        '--border-focus': '#ef8bb3',
        '--text': '#3f2a35',
        '--text-soft': '#5d4650',
        '--muted': '#7d6471',
        '--dim': '#9f7c8d',
        '--placeholder': '#b99aad',
        '--accent': '#ff7eb6',
        '--accent-hover': '#ff95c8',
        '--accent-soft': 'rgba(255, 126, 182, 0.14)',
        '--accent-strong': 'rgba(255, 126, 182, 0.22)',
        '--green': '#6ec7a5',
        '--green-soft': 'rgba(110, 199, 165, 0.12)',
        '--yellow': '#f0b36a',
        '--yellow-soft': 'rgba(240, 179, 106, 0.12)',
        '--blue': '#78b9e8',
        '--blue-soft': 'rgba(120, 185, 232, 0.12)',
        '--magenta': '#c38de1',
        '--magenta-soft': 'rgba(195, 141, 225, 0.12)',
        '--red': '#ea8ba3',
        '--red-soft': 'rgba(234, 139, 163, 0.12)',
      },
    },
    {
      name: 'dark',
      label: 'dark',
      root: {
        '--bg': '#161a21',
        '--bg-raised': '#1c212a',
        '--panel': '#222833',
        '--panel-hover': '#29303c',
        '--border': '#343c4a',
        '--border-soft': '#2a313d',
        '--border-focus': '#4aa9b8',
        '--text': '#edf1f5',
        '--text-soft': '#d2d8e0',
        '--muted': '#9aa5b4',
        '--dim': '#707b8b',
        '--placeholder': '#5c6675',
        '--accent': '#63c7d5',
        '--accent-hover': '#7ad5e0',
        '--accent-soft': 'rgba(99, 199, 213, 0.12)',
        '--accent-strong': 'rgba(99, 199, 213, 0.20)',
        '--green': '#79d69a',
        '--green-soft': 'rgba(121, 214, 154, 0.12)',
        '--yellow': '#e3c76a',
        '--yellow-soft': 'rgba(227, 199, 106, 0.12)',
        '--blue': '#7eafe8',
        '--blue-soft': 'rgba(126, 175, 232, 0.12)',
        '--magenta': '#d39be5',
        '--magenta-soft': 'rgba(211, 155, 229, 0.12)',
        '--red': '#ed8181',
        '--red-soft': 'rgba(237, 129, 129, 0.12)',
      },
    },
    {
      name: 'forest',
      label: 'forest',
      root: {
        '--bg': '#edf7f0',
        '--bg-raised': '#e1f1e7',
        '--panel': '#f8fffa',
        '--panel-hover': '#eaf8f0',
        '--border': '#cfe2d6',
        '--border-soft': '#dfeee5',
        '--border-focus': '#4e9f6e',
        '--text': '#1f382a',
        '--text-soft': '#2d4537',
        '--muted': '#5a7264',
        '--dim': '#768c7d',
        '--placeholder': '#8fa49a',
        '--accent': '#4ea76f',
        '--accent-hover': '#63bb86',
        '--accent-soft': 'rgba(78, 167, 111, 0.12)',
        '--accent-strong': 'rgba(78, 167, 111, 0.20)',
        '--green': '#65b98d',
        '--green-soft': 'rgba(101, 185, 141, 0.12)',
        '--yellow': '#d9b85f',
        '--yellow-soft': 'rgba(217, 184, 95, 0.12)',
        '--blue': '#6ea9d9',
        '--blue-soft': 'rgba(110, 169, 217, 0.12)',
        '--magenta': '#b781d1',
        '--magenta-soft': 'rgba(183, 129, 209, 0.12)',
        '--red': '#d97979',
        '--red-soft': 'rgba(217, 121, 121, 0.12)',
      },
    },
    {
      name: 'sunset',
      label: 'sunset',
      root: {
        '--bg': '#fff5ee',
        '--bg-raised': '#ffe8db',
        '--panel': '#fffdfb',
        '--panel-hover': '#fff0e8',
        '--border': '#f3d3c1',
        '--border-soft': '#f9e5dc',
        '--border-focus': '#d9775a',
        '--text': '#3d2a24',
        '--text-soft': '#5c4036',
        '--muted': '#7f6159',
        '--dim': '#a17b6c',
        '--placeholder': '#b8927d',
        '--accent': '#f28c5b',
        '--accent-hover': '#f79e72',
        '--accent-soft': 'rgba(242, 140, 91, 0.12)',
        '--accent-strong': 'rgba(242, 140, 91, 0.22)',
        '--green': '#7bbf8d',
        '--green-soft': 'rgba(123, 191, 141, 0.12)',
        '--yellow': '#e8b75f',
        '--yellow-soft': 'rgba(232, 183, 95, 0.12)',
        '--blue': '#78a8d6',
        '--blue-soft': 'rgba(120, 168, 214, 0.12)',
        '--magenta': '#c98ad4',
        '--magenta-soft': 'rgba(201, 138, 212, 0.12)',
        '--red': '#e67d7d',
        '--red-soft': 'rgba(230, 125, 125, 0.12)',
      },
    },
    {
      name: 'midnight',
      label: 'midnight',
      root: {
        '--bg': '#0f172a',
        '--bg-raised': '#111c34',
        '--panel': '#162238',
        '--panel-hover': '#1c2b40',
        '--border': '#2f466a',
        '--border-soft': '#23314d',
        '--border-focus': '#7aa2ff',
        '--text': '#e5ecff',
        '--text-soft': '#bfd0f7',
        '--muted': '#8ea3c9',
        '--dim': '#6f83b1',
        '--placeholder': '#5d6e96',
        '--accent': '#7aa2ff',
        '--accent-hover': '#9bb9ff',
        '--accent-soft': 'rgba(122, 162, 255, 0.12)',
        '--accent-strong': 'rgba(122, 162, 255, 0.22)',
        '--green': '#6cc8a9',
        '--green-soft': 'rgba(108, 200, 169, 0.12)',
        '--yellow': '#e7c97f',
        '--yellow-soft': 'rgba(231, 201, 127, 0.12)',
        '--blue': '#7eb7ff',
        '--blue-soft': 'rgba(126, 183, 255, 0.12)',
        '--magenta': '#c497f2',
        '--magenta-soft': 'rgba(196, 151, 242, 0.12)',
        '--red': '#f08d8d',
        '--red-soft': 'rgba(240, 141, 141, 0.12)',
      },
    },
  ];

  // ============================================================
  // helpers
  // ============================================================
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function methodClass(method) {
    return `m-${(method || '').toLowerCase()}`;
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key.startsWith('on') && typeof value === 'function') {
        node.addEventListener(key.slice(2), value);
      } else {
        node.setAttribute(key, value);
      }
    }
    for (const child of [].concat(children)) {
      if (child) node.appendChild(child);
    }
    return node;
  }

  function kvRow(container, { keyPlaceholder = 'key', valuePlaceholder = 'value', masked = false } = {}) {
    const row = el('div', { class: 'kv-row' });
    const keyInput = el('input', { type: 'text', placeholder: keyPlaceholder });
    const valInput = el('input', { type: masked ? 'password' : 'text', placeholder: valuePlaceholder });
    const remove = el('button', { class: 'kv-remove', text: '×', onclick: () => row.remove() });
    row.append(keyInput, valInput, remove);
    container.appendChild(row);
    return { row, keyInput, valInput };
  }

  function collectKvRows(container) {
    const out = {};
    for (const row of $$('.kv-row', container)) {
      const [keyInput, valInput] = $$('input', row);
      const key = keyInput.value.trim();
      if (key) out[key] = valInput.value;
    }
    return out;
  }

  function getStoredThemeName() {
    try {
      const saved = localStorage.getItem('apitest-theme');
      return themeRoots.some((theme) => theme.name === saved) ? saved : 'cute';
    } catch {
      return 'cute';
    }
  }

  function changeTheme(themeName) {
    const theme = themeRoots.find((entry) => entry.name === themeName) || themeRoots[0];
    const root = document.documentElement;

    Object.entries(theme.root).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    state.currentTheme = theme.name;
    const themeTrigger = $('#meta-theme');
    if (themeTrigger) {
      themeTrigger.textContent = theme.label;
    }

    try {
      localStorage.setItem('apitest-theme', theme.name);
    } catch {}

    const menu = $('#theme-menu');
    if (menu) {
      $$('.theme-option', menu).forEach((option) => {
        option.classList.toggle('active', option.dataset.theme === theme.name);
      });
    }
  }

  function initThemePicker() {
    const trigger = $('#meta-theme');
    if (!trigger) return;

    const menu = el('div', { id: 'theme-menu', class: 'theme-menu hidden' });
    themeRoots.forEach((theme) => {
      const option = el('button', {
        type: 'button',
        class: 'theme-option',
        text: theme.label,
        'data-theme': theme.name,
        onclick: () => {
          changeTheme(theme.name);
          menu.classList.add('hidden');
        },
      });
      menu.appendChild(option);
    });

    trigger.parentElement.appendChild(menu);
    trigger.setAttribute('role', 'button');
    trigger.tabIndex = 0;
    trigger.addEventListener('click', (event) => {
      event.stopPropagation();
      menu.classList.toggle('hidden');
    });
    trigger.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        menu.classList.toggle('hidden');
      }
    });
    document.addEventListener('click', (event) => {
      if (!trigger.contains(event.target) && !menu.contains(event.target)) {
        menu.classList.add('hidden');
      }
    });

    state.currentTheme = getStoredThemeName();
    changeTheme(state.currentTheme);
  }

  // ============================================================
  // bootstrap
  // ============================================================
  async function bootstrap() {
    const [meta, endpointData] = await Promise.all([
      fetch('/api/meta').then((r) => r.json()),
      fetch('/api/endpoints').then((r) => r.json()),
    ]);

    state.entryPoint = meta.entryPoint;
    state.baseUrl = meta.baseUrl;
    state.endpoints = endpointData.endpoints;

    $('#meta-entry').textContent = meta.entryPoint || '—';
    $('#meta-target').textContent = meta.baseUrl || '—';

    const port = (meta.baseUrl.match(/:(\d+)/) || [])[1] || '3000';
    $('#ws-url-choice').firstElementChild.textContent = `ws://localhost:${port}/ws`;
    $('#ws-url-choice').firstElementChild.value = `ws://localhost:${port}/ws`;

    initThemePicker();
    renderEndpointList(state.endpoints);
  }

  // ============================================================
  // tabs
  // ============================================================
  $$('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const name = tab.dataset.tab;
      $$('.panel').forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== name));
    });
  });

  // ============================================================
  // endpoint list
  // ============================================================
  function renderEndpointList(endpoints) {
    const list = $('#endpoint-list');
    list.innerHTML = '';

    if (endpoints.length === 0) {
      list.appendChild(el('div', { class: 'empty-state', text: 'No mounted HTTP endpoints detected.' }));
      return;
    }

    for (const ep of endpoints) {
      const item = el(
        'button',
        { class: 'endpoint-item', onclick: () => selectEndpoint(ep, item) },
        [
          el('span', { class: `endpoint-method ${methodClass(ep.method)}`, text: ep.method }),
          el('span', { class: 'endpoint-path', text: ep.path }),
        ]
      );
      const wrap = el('div', {}, [item, el('span', { class: 'endpoint-file', text: ep.file })]);
      list.appendChild(wrap);
    }
  }

  $('#endpoint-search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = state.endpoints.filter(
      (ep) => ep.path.toLowerCase().includes(q) || ep.method.toLowerCase().includes(q)
    );
    renderEndpointList(filtered);
  });

  // ============================================================
  // request builder
  // ============================================================
  function selectEndpoint(ep, itemNode) {
    state.selected = ep;
    state.bodyType = 'json';
    state.mockObj = null;
    $$('.endpoint-item').forEach((n) => n.classList.remove('active'));
    if (itemNode) itemNode.classList.add('active');
    renderWorkspace(ep);
  }

  function renderWorkspace(ep) {
    const ws = $('#http-workspace');
    ws.innerHTML = '';

    const paramNames = (ep.path.match(/:[a-zA-Z0-9_]+/g) || []).map((p) => p.slice(1));

    ws.appendChild(
      el('div', { class: 'request-title' }, [
        el('span', { class: `method-badge ${methodClass(ep.method)}`, text: ep.method }),
        el('span', { class: 'path', text: ep.path }),
        el('span', { class: 'file', text: `(${ep.file})` }),
      ])
    );

    // ---- path params ----
    let paramsBlock = null;
    if (paramNames.length > 0) {
      paramsBlock = el('div', { class: 'params-block' });
      paramsBlock.appendChild(el('div', { class: 'section-header' }, [el('span', { class: 'bullet', text: '⏺' }), el('h2', { text: 'Path parameters' })]));
      for (const name of paramNames) {
        const row = el('div', { class: 'field-row' });
        row.appendChild(el('label', { text: `:${name}` }));
        const input = el('input', { type: 'text', 'data-param': name, placeholder: `value for ${name}` });
        row.appendChild(input);
        paramsBlock.appendChild(row);
      }
      ws.appendChild(paramsBlock);
    }

    // ---- query params ----
    const queryEditor = el('div', { class: 'kv-editor' });
    queryEditor.appendChild(
      el('div', { class: 'kv-editor-header' }, [
        el('span', { text: 'Query parameters' }),
        el('button', { class: 'btn-ghost', text: '+ add parameter', onclick: () => kvRow(queryRows) }),
      ])
    );
    const queryRows = el('div', { class: 'kv-rows' });
    queryEditor.appendChild(queryRows);
    ws.appendChild(queryEditor);

    // ---- headers ----
    const headerEditor = el('div', { class: 'kv-editor' });
    headerEditor.appendChild(el('div', { class: 'kv-editor-header' }, [el('span', { text: 'Headers' })]));
    const headerRows = el('div', { class: 'kv-rows' });
    const presets = el('div', { class: 'header-presets' }, [
      el('button', { text: 'Authorization (Bearer Token)', onclick: () => kvRow(headerRows, { keyPlaceholder: 'Authorization', valuePlaceholder: 'Bearer …', masked: true }) }),
      el('button', { text: 'API Key', onclick: () => kvRow(headerRows, { keyPlaceholder: 'X-API-Key', valuePlaceholder: 'key', masked: true }) }),
      el('button', { text: 'Content-Type', onclick: () => kvRow(headerRows, { keyPlaceholder: 'Content-Type', valuePlaceholder: 'application/json' }) }),
      el('button', { text: 'Accept', onclick: () => kvRow(headerRows, { keyPlaceholder: 'Accept', valuePlaceholder: 'application/json' }) }),
      el('button', { text: '+ custom header', onclick: () => kvRow(headerRows) }),
    ]);
    headerEditor.appendChild(presets);
    headerEditor.appendChild(headerRows);
    ws.appendChild(headerEditor);

    // ---- body (POST/PUT/PATCH only) ----
    let bodyState = { textarea: null, multipartRows: null };
    if (['POST', 'PUT', 'PATCH'].includes(ep.method)) {
      ws.appendChild(renderBodySection(ep, bodyState));
    }

    // ---- send + response ----
    const sendRow = el('div', { class: 'send-row' });
    const sendBtn = el('button', { class: 'btn-primary', text: 'Send request' });
    sendRow.appendChild(sendBtn);
    ws.appendChild(sendRow);

    const responseSlot = el('div', {});
    ws.appendChild(responseSlot);

    sendBtn.addEventListener('click', () =>
      sendHttpRequest(ep, { paramsBlock, queryRows, headerRows, bodyState, responseSlot, sendBtn })
    );
  }

  function renderBodySection(ep, bodyState) {
    const wrap = el('div', { class: 'params-block' });
    wrap.appendChild(el('div', { class: 'section-header' }, [el('span', { class: 'bullet', text: '⏺' }), el('h2', { text: 'Request payload' })]));

    const tabs = el('div', { class: 'body-type-tabs' });
    const types = [
      ['json', 'application/json'],
      ['form', 'application/x-www-form-urlencoded'],
      ['text', 'text/plain'],
      ['multipart', 'multipart/form-data'],
    ];
    const bodyContent = el('div', {});
    wrap.appendChild(tabs);
    wrap.appendChild(bodyContent);

    function renderBodyType(type) {
      state.bodyType = type;
      $$('button', tabs).forEach((b) => b.classList.toggle('active', b.dataset.type === type));
      bodyContent.innerHTML = '';

      if (type === 'json') {
        const detected = ep.bodyFields || [];
        if (detected.length > 0) {
          bodyContent.appendChild(el('div', { class: 'detected-fields', text: `detected fields → ${detected.join(', ')}` }));
          const mockBtn = el('button', { class: 'btn-secondary', text: `Generate mock data (${detected.length} field(s))` });
          bodyContent.appendChild(mockBtn);
          mockBtn.addEventListener('click', async () => {
            const res = await fetch('/api/mock', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fields: detected }),
            }).then((r) => r.json());
            textarea.value = JSON.stringify(res.body, null, 2);
            validateJson();
          });
        }
        const textarea = el('textarea', { class: 'body-editor', placeholder: '{}' });
        textarea.value = '{}';
        const errorLine = el('div', { class: 'json-error' });
        function validateJson() {
          try {
            JSON.parse(textarea.value || '{}');
            textarea.classList.remove('invalid');
            errorLine.textContent = '';
            return true;
          } catch (e) {
            textarea.classList.add('invalid');
            errorLine.textContent = `Invalid JSON: ${e.message}`;
            return false;
          }
        }
        textarea.addEventListener('input', validateJson);
        bodyContent.appendChild(textarea);
        bodyContent.appendChild(errorLine);
        bodyState.textarea = textarea;
        bodyState.validateJson = validateJson;
      }

      if (type === 'form') {
        const rows = el('div', { class: 'kv-rows' });
        const editor = el('div', { class: 'kv-editor' }, [
          el('div', { class: 'kv-editor-header' }, [el('span', { text: 'Form fields' }), el('button', { class: 'btn-ghost', text: '+ add field', onclick: () => kvRow(rows) })]),
          rows,
        ]);
        bodyContent.appendChild(editor);
        bodyState.formRows = rows;
      }

      if (type === 'text') {
        const textarea = el('textarea', { class: 'body-editor', placeholder: 'raw text body' });
        bodyContent.appendChild(textarea);
        bodyState.textPlain = textarea;
      }

      if (type === 'multipart') {
        const rows = el('div', {});
        bodyContent.appendChild(rows);
        bodyContent.appendChild(el('button', { class: 'btn-ghost', text: '+ add field', onclick: () => addMultipartRow(rows) }));
        bodyState.multipartRows = rows;
        addMultipartRow(rows);
      }
    }

    types.forEach(([type, label]) => {
      const btn = el('button', { text: label, 'data-type': type, onclick: () => renderBodyType(type) });
      tabs.appendChild(btn);
    });

    renderBodyType('json');
    return wrap;
  }

  function addMultipartRow(container) {
    const row = el('div', { class: 'multipart-row' });
    const keyInput = el('input', { type: 'text', placeholder: 'field name' });
    const kindSelect = el('select', {}, [el('option', { value: 'text', text: 'Text value' }), el('option', { value: 'file', text: 'File' })]);
    const valueInput = el('input', { type: 'text', placeholder: 'value' });
    const fileInput = el('input', { type: 'file', class: 'hidden' });
    const remove = el('button', { class: 'kv-remove', text: '×', onclick: () => row.remove() });

    kindSelect.addEventListener('change', () => {
      const isFile = kindSelect.value === 'file';
      valueInput.classList.toggle('hidden', isFile);
      fileInput.classList.toggle('hidden', !isFile);
    });

    row.append(keyInput, kindSelect, valueInput, fileInput, remove);
    container.appendChild(row);
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ============================================================
  // send request
  // ============================================================
  async function sendHttpRequest(ep, { paramsBlock, queryRows, headerRows, bodyState, responseSlot, sendBtn }) {
    let finalPath = ep.path;

    if (paramsBlock) {
      for (const input of $$('input[data-param]', paramsBlock)) {
        finalPath = finalPath.replace(`:${input.dataset.param}`, encodeURIComponent(input.value || ''));
      }
    }

    const query = collectKvRows(queryRows);
    const qs = new URLSearchParams(query).toString();
    if (qs) finalPath += `?${qs}`;

    const headers = collectKvRows(headerRows);

    let payload = { targetPath: finalPath, method: ep.method, headers };

    if (['POST', 'PUT', 'PATCH'].includes(ep.method)) {
      if (state.bodyType === 'json' && bodyState.textarea) {
        if (bodyState.validateJson && !bodyState.validateJson()) return;
        payload.bodyType = 'json';
        payload.bodyRaw = bodyState.textarea.value || '{}';
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      } else if (state.bodyType === 'form' && bodyState.formRows) {
        payload.bodyType = 'form';
        payload.bodyRaw = new URLSearchParams(collectKvRows(bodyState.formRows)).toString();
        headers['Content-Type'] = headers['Content-Type'] || 'application/x-www-form-urlencoded';
      } else if (state.bodyType === 'text' && bodyState.textPlain) {
        payload.bodyType = 'text';
        payload.bodyRaw = bodyState.textPlain.value || '';
        headers['Content-Type'] = headers['Content-Type'] || 'text/plain';
      } else if (state.bodyType === 'multipart' && bodyState.multipartRows) {
        const fields = [];
        for (const row of $$('.multipart-row', bodyState.multipartRows)) {
          const keyInput = $('input[type="text"]', row);
          const kindSelect = $('select', row);
          const key = keyInput.value.trim();
          if (!key) continue;
          if (kindSelect.value === 'file') {
            const fileInput = $('input[type="file"]', row);
            const file = fileInput.files[0];
            if (file) {
              fields.push({ key, kind: 'file', filename: file.name, base64: await fileToBase64(file) });
            }
          } else {
            const valueInput = $$('input[type="text"]', row)[1];
            fields.push({ key, kind: 'text', value: valueInput.value });
          }
        }
        payload.bodyType = 'multipart';
        payload.multipartFields = fields;
      }
    }
    payload.headers = headers;

    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending…';
    responseSlot.innerHTML = '';

    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then((r) => r.json());

      responseSlot.appendChild(renderResponse(res));
    } catch (err) {
      responseSlot.appendChild(renderResponse({ error: err.message }));
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send request';
    }
  }

  function renderResponse(res) {
    if (res.error && !res.status) {
      const box = el('div', { class: 'response-box fail' });
      box.appendChild(el('div', { class: 'rb-title' }, [el('span', { text: 'request failed' })]));
      box.appendChild(el('pre', { text: res.error }));
      return box;
    }

    const box = el('div', { class: `response-box ${res.ok ? 'ok' : 'fail'}` });
    box.appendChild(
      el('div', { class: 'rb-title' }, [
        el('span', { class: `response-status ${res.ok ? 'ok' : 'fail'}`, text: `${res.status} ${res.statusText || ''}` }),
        el('span', { text: `${res.duration}ms` }),
      ])
    );
    box.appendChild(el('pre', { text: res.bodyText || '(empty response body)' }));
    return box;
  }

  // ============================================================
  // websocket flow
  // ============================================================
  let socket = null;

  $('#ws-url-choice').addEventListener('change', (e) => {
    $('#ws-custom-url-row').classList.toggle('hidden', e.target.value !== '__custom__');
  });

  $('#ws-add-query').addEventListener('click', () => kvRow($('#ws-query-rows')));
  $('#ws-add-message-param').addEventListener('click', () => kvRow($('#ws-message-rows')));

  function wsLog(kind, title, text) {
    const log = $('#ws-log');
    const entry = el('div', { class: `ws-entry ${kind}` });
    if (kind !== 'system') {
      entry.appendChild(el('div', { class: 'ws-entry-header' }, [el('span', { text: title }), el('span', { text: new Date().toLocaleTimeString() })]));
      entry.appendChild(el('pre', { text }));
    } else {
      entry.textContent = title;
    }
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
  }

  function setWsStatus(text, cls) {
    const status = $('#ws-status');
    status.textContent = text;
    status.className = `ws-status ${cls || ''}`;
  }

  $('#ws-connect').addEventListener('click', () => {
    const choice = $('#ws-url-choice').value;
    let url = choice === '__custom__' ? $('#ws-custom-url').value.trim() : choice;

    try {
      const parsed = new URL(url);
      if (!['ws:', 'wss:'].includes(parsed.protocol)) throw new Error();
    } catch {
      wsLog('system', 'Enter a valid ws:// or wss:// URL.');
      return;
    }

    const query = collectKvRows($('#ws-query-rows'));
    const qs = new URLSearchParams(query).toString();
    if (qs) url += (url.includes('?') ? '&' : '?') + qs;

    setWsStatus('connecting…', 'connecting');
    socket = new WebSocket(url);

    socket.addEventListener('open', () => {
      setWsStatus('connected', 'connected');
      wsLog('system', `Connected to ${url}`);
      $('#ws-connect').classList.add('hidden');
      $('#ws-disconnect').classList.remove('hidden');
      $('#ws-send').disabled = false;
    });

    socket.addEventListener('message', (event) => {
      let text = event.data;
      try {
        text = JSON.stringify(JSON.parse(event.data), null, 2);
      } catch {}
      wsLog('received', 'received', text);
    });

    socket.addEventListener('error', () => {
      setWsStatus('error', 'error');
      wsLog('system', 'WebSocket error.');
    });

    socket.addEventListener('close', (event) => {
      setWsStatus('not connected', '');
      wsLog('system', `Connection closed (${event.code}${event.reason ? ': ' + event.reason : ''})`);
      $('#ws-connect').classList.remove('hidden');
      $('#ws-disconnect').classList.add('hidden');
      $('#ws-send').disabled = true;
      socket = null;
    });
  });

  $('#ws-disconnect').addEventListener('click', () => {
    if (socket) socket.close();
  });

  $('#ws-send').addEventListener('click', () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const payload = collectKvRows($('#ws-message-rows'));
    const text = JSON.stringify(payload);
    socket.send(text);
    wsLog('sent', 'sent', JSON.stringify(payload, null, 2));
  });

  bootstrap();
})();
