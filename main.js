//Пока не на Нюке
const tempAddress = 'http://10.78.67.179:3000/AssembleManagmentServer/ws';

//Для Websocketа
let socket;
let wsconnection; //для подключения
let reconnectAttempts = 0; // Счетчик попыток переподключения
const allUsers = new Map();// Возвращения нового массива, в котором для каждого элемента по порядку будет вызвана функция, и результат будет записан в новый массив

// Функция для попытки переподключения
function reconnectWebSocket() {
  if (socket.readyState === WebSocket.CLOSED && reconnectAttempts < 3) {
    console.log('Попытка переподключения...');
    reconnectAttempts++;
    socket = new WebSocket(socket.url);
    assignEventHandlers();
  } else if (socket.readyState === WebSocket.CONNECTING) {
    console.log('Попытка установления соединения');
  } else if (reconnectAttempts >= 3) {
    console.log('Превышено максимальное количество попыток переподключения');
  }
}

// Функция для назначения обработчиков событий
function assignEventHandlers() {
  socket.onopen = function(e) {
    console.log("Соединение установлено");
    sendMessage('Привет');
    reconnectAttempts = 0;
  };

  socket.onmessage = function(event) {
    console.log(`Данные получены: ${event.data}`);
    };

  socket.onclose = function(event) {
    if (event.wasClean) {
      console.log(`Соединение закрыто чисто, код=${event.code}, причина=${event.reason}`);
    } else {
      console.log('Соединение прервано');
      setTimeout(reconnectWebSocket, 2000);
    }
  };

  socket.onerror = function(error) {
    console.log(`Ошибка подключения к серверу`);
  };
}

// Функция для отправки сообщений через WebSocket
function sendMessage(message) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(message);
  } else {
    console.log('WebSocket не подключен. Состояние:', socket.readyState);
    reconnectWebSocket();
  }
}

//Для генерации uuid
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

//Получение адреса WebSocket
async function getWebSocketAddress(){
  let data;
  try {
    const response = await fetch(tempAddress, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    data = await response.text();
    handleResponse(data);
  } catch (error) {
    console.error('Error:', error);
  }
  return data;
}

//Подключение к WebSocket
async function connectToWebSocket(data){
  socket = new WebSocket(data);
  assignEventHandlers();
  return new Promise((resolve, reject) => {
    socket.onopen = () => {
      console.log('Соединение с WebSocket успешно установлено.');
      resolve(socket);
    };

    socket.onerror = (error) => {
      console.error('Ошибка при подключении к WebSocket:', error);
      reject(error);
    };
  });
}

// Функция для отправки запроса на сервер
async function sendRequest(parameters) {
  const uuid = generateUUID();
  const request = {
    uuid: uuid,
    type: 'request',
    command: 'getUsers',
    parameters: parameters  
  };

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(request));
  } else {
    console.log('WebSocket не подключен. Состояние:', socket.readyState);
    reconnectWebSocket();
  }

 /* return new Promise(r => {
    const end = (v)=>{
      socket.removeEventListener("message", end);
      r(JSON.parse(v.data));
    }

    socket.addEventListener("message", end);
  });*/
  return new Promise((resolve, reject) => {
    const end = (event) => {
      if (JSON.parse(event.data).uuid === uuid) {
        socket.removeEventListener("message", end);
        resolve(JSON.parse(event.data));
      }
    };

    socket.addEventListener("message", end);
  });
}

//Ответ сервера
function handleResponse(response) {
  console.log('Получен ответ:', response);
}

// Для HTML
document.addEventListener('DOMContentLoaded', function() {
  // Добавление обработчиков событий для кнопок
  document.querySelectorAll('.grid button').forEach(button => {
    button.addEventListener('click', function() {
      const amount = this.getAttribute('data-amount');
      const from = this.getAttribute('data-from');
      const occupation = this.getAttribute('data-occupation');
      
      const parameters = { amount: amount };
      if (from) {
        parameters.from = Number(from);
      }
      if (occupation) {
        parameters.occupation = occupation;
      }
      
      sendRequest(wsconnection, parameters);
    });
  });
  
  // Для выбора опций
  const parametersOTK = document.getElementById("options");
  parametersOTK.addEventListener("change", function(e) {
    const parameters = { amount: e.target.value };
    sendRequest(parameters.occupation);
  });
});

// Сортировка массива по свойству full_name
function sortUsers(usersArray) {
  usersArray.sort((a, b) => a.full_name.localeCompare(b.full_name));
  return usersArray;
}

// Функция для отображения информации пользователя
function handleDivClick(userId) {
  const userData = allUsers.get(userId);
  alert(`
    Полное имя: ${userData.full_name}, 
    ID: ${userData.id}, 
    Кем работает: ${userData.occupation}
  `);
}

//Основная функция
async function main(){
  console.log("Запуск программы");
  const wsAddress = await getWebSocketAddress();
  await connectToWebSocket(wsAddress);
  
  // Отправка запроса на сервер
  const users = await sendRequest({ amount: "ALL" });
  const sortedUsers = sortUsers(users.parameters.list);
  const grid = document.getElementById("userGrid");
  let t = "";
  sortedUsers.forEach(v => {
    allUsers.set(v.id, v);
    t += `<cell><div data-person="${v.full_name}" onclick="handleDivClick('${v.id}')">${v.full_name}</div></cell>`; 
  });
  grid.innerHTML = t;
}

main();
