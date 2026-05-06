const idInput = document.getElementById('idInstance');
const tokenInput = document.getElementById('apiTokenInstance');
const chatIdInput = document.getElementById('chatId');
const chatIdFileInput = document.getElementById('chatIdFile');
const messageInput = document.getElementById('message');
const fileUrlInput = document.getElementById('fileUrl');
const resultArea = document.getElementById('result');

const btnGetSettings = document.getElementById('btnGetSettings');
const btnGetState = document.getElementById('btnGetState');
const btnSendMessage = document.getElementById('btnSendMessage');
const btnSendFile = document.getElementById('btnSendFile');

function showResult(title, data) {
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  resultArea.value = title + '\n\n' + text;
}

function getAuth() {
  const id = idInput.value.trim();
  const token = tokenInput.value.trim();

  if (!id || !token) {
    throw new Error('Нужно заполнить idInstance и ApiTokenInstance');
  }

  return { id, token };
}

function normalizeChatId(rawValue) {
  const value = rawValue.trim();

  if (!value) {
    return "";
  }

  // Если суффикс уже указан (@c.us или @g.us), используем как есть
  if (value.includes("@")) {
    return value;
  }

  // Оставляем только цифры и добавляем суффикс личного чата
  const digitsOnly = value.replace(/\D/g, "");
  return digitsOnly ? `${digitsOnly}@c.us` : "";
}

function getFileNameFromUrl(urlValue) {
  try {
    const parsedUrl = new URL(urlValue);
    const pathname = parsedUrl.pathname || "";
    const lastPart = pathname.split("/").filter(Boolean).pop();
    return lastPart || "file";
  } catch (e) {
    return "file";
  }
}

async function requestGreenApi(endpoint, method = 'GET', body = null) {
  const { id, token } = getAuth();
  const url = `https://api.green-api.com/waInstance${id}/${endpoint}/${token}`;

  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const text = await response.text();

  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`Ошибка ${response.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

async function runAction(button, title, action) {
  const oldText = button.textContent;
  button.disabled = true;
  button.textContent = 'Запрос...';

  try {
    const data = await action();
    showResult(title, data);
  } catch (error) {
    showResult(title + ' (error)', error.message || String(error));
  } finally {
    button.disabled = false;
    button.textContent = oldText;
  }
}

btnGetSettings.addEventListener('click', () => {
  runAction(btnGetSettings, 'getSettings', () => requestGreenApi('getSettings'));
});

btnGetState.addEventListener('click', () => {
  runAction(btnGetState, 'getStateInstance', () => requestGreenApi('getStateInstance'));
});

btnSendMessage.addEventListener('click', () => {
  runAction(btnSendMessage, 'sendMessage', () => {
    const chatId = normalizeChatId(chatIdInput.value);
    const message = messageInput.value.trim();

    if (!chatId || !message) {
      throw new Error('Для sendMessage заполните chatId и message');
    }

    return requestGreenApi('sendMessage', 'POST', {
      chatId,
      message
    });
  });
});

btnSendFile.addEventListener('click', () => {
  runAction(btnSendFile, 'sendFileByUrl', () => {
    const chatId = normalizeChatId(chatIdFileInput.value);
    const urlFile = fileUrlInput.value.trim();
    const fileName = getFileNameFromUrl(urlFile);

    if (!chatId || !urlFile) {
      throw new Error('Для sendFileByUrl заполните chatId и fileUrl');
    }

    return requestGreenApi('sendFileByUrl', 'POST', {
      chatId,
      urlFile,
      fileName
    });
  });
});
