//Пока не на Нюке
const tempAddress = 'http://10.78.67.179:3000/AssembleManagmentServer/ws';

//Сегмент подключения к WebSocket и получения информации о сотрудниках производства

let socket; //Для Websocketа
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

 return new Promise(r => {
    const end = (v)=>{
      socket.removeEventListener("message", end);
      r(JSON.parse(v.data));
    }

    socket.addEventListener("message", end);
  });
  
}

//Ответ сервера
function handleResponse(response) {
  console.log('Получен ответ:', response);
};

// Обработчик событий для ячеек сотрудников
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
});

// Сортировка массива информации сотрудников по свойству full_name
function sortUsers(usersArray) {
  usersArray.sort((a, b) => a.full_name.localeCompare(b.full_name));
  return usersArray;
}

// Функция для отображения информации из БД
function handleDivClick(userId) {
  const userData = allUsers.get(userId);
  alert(`
    Полное имя: ${userData.full_name}, 
    ID: ${userData.id}, 
    Должность: ${userData.occupation}
  `);
}

//Сегмент работы с БД

// Функция создания продукта
function createProduct(productName, componentNames, replaceExisting) {
  // Валидация входных данных
  if (!productName) {
    console.error('Неверные данные продукта');
    return Promise.reject(new Error('Неверные данные продукта'));
  } else if (/[^а-яА-ЯёЁa-zA-Z0-9 -]/.test(productName)) {
    console.error('Некорректные символы в названии продукта');
    return Promise.reject(new Error('Некорректные символы в названии продукта'));
  } else if (!Array.isArray(componentNames) || componentNames.length === 0) {
    console.error('Неверные данные компонентов');
    return Promise.reject(new Error('Неверные данные компонентов'));
  }

  const uuid = generateUUID();
  const request = {
    uuid: uuid,
    type: "request",
    command: "createProduct",
    parameters: {
      productName: productName,
      componentNames: componentNames,
      replaceExisting: replaceExisting //? true : false//добавить логику
    }
  };
   console.log(request.parameters)
  // Обработка исключений при работе с WebSocket
  try {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(request));
    } else {
      console.log('WebSocket не подключен. Состояние:', socket.readyState);
      reconnectWebSocket();
    }
  } catch (error) {
    console.error('Ошибка при отправке запроса:', error);
    return Promise.reject(error);
  }

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      socket.removeEventListener('message', handleResponse);
      reject(new Error('Таймаут ожидания ответа сервера'));
    }, 5000); // Таймаут 5 секунд

    const handleResponse = (event) => {
      const data = JSON.parse(event.data);
      if (data.uuid === uuid) {
        clearTimeout(timeoutId);
        console.log('Продукт создан:', data);
        resolve(data);
        socket.removeEventListener('message', handleResponse);
      }
    };

    socket.addEventListener('message', handleResponse);
    socket.onerror = (error) => {
      clearTimeout(timeoutId);
      console.error('Ошибка при создании продукта:', error);
      reject(error);
      socket.removeEventListener('message', handleResponse);
    };
  });
}

// Добавление обработчика событий для кнопки "Создание продукта"
document.addEventListener('DOMContentLoaded', function() {
  const createButton = document.getElementById('createProductButton');
  createButton.addEventListener('click', function() {
    const productName = document.getElementById('productNameInput').value;
    let componentNames = document.getElementById('componentNamesInput').value;
    const replaceExisting = document.getElementById('replaceExistingCheckbox').checked;
    
    if (!productName) {
      alert('Пожалуйста, введите Название продукта для создания и опционально Названия компонентов.');
      return;
    }

    // Убеждаемся, что componentNames является массивом
    componentNames = componentNames.split(',').map(function(item) {
      return item.trim(); // Удаляем пробелы в начале и конце каждого компонента
    });

    createProduct(productName, componentNames, replaceExisting).then(response => {
      console.log('Ответ сервера:', response);
    }).catch(error => {
      console.error('Ошибка при создании продукта:', error);
    });
  });
});

// Функция удаления продукта
function deleteProduct(productIdentifier) {
  // Валидация входных данных
  if (!productIdentifier) {
    alert('Неверные данные идентификатора продукта');
    return Promise.reject(new Error('Неверные данные идентификатора продукта'));
  }

  const uuid = generateUUID();
  let parameters = {};

  // Определение параметров запроса
  if (productIdentifier.id) {
    parameters.productID = productIdentifier.id;
  } else if (productIdentifier.name) {
    parameters.productName = productIdentifier.name;
  } else {
    console.error('Необходимо указать ID или имя продукта');
    return Promise.reject(new Error('Необходимо указать ID или имя продукта'));
  }

  const request = {
    uuid: uuid,
    type: "request",
    command: "deleteProduct",
    parameters: parameters
  };

  // Обработка исключений при работе с WebSocket
  try {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(request));
    } else {
      console.log('WebSocket не подключен. Состояние:', socket.readyState);
      reconnectWebSocket();
    }
  } catch (error) {
    console.error('Ошибка при отправке запроса:', error);
    return Promise.reject(error);
  }

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      socket.removeEventListener('message', handleResponse);
      reject(new Error('Таймаут ожидания ответа сервера'));
    }, 5000); // Таймаут 5 секунд

    const handleResponse = (event) => {
      const data = JSON.parse(event.data);
      if (data.uuid === uuid && data.type === "respond" && data.command === "deleteProduct") {
        clearTimeout(timeoutId);
        if (data.parameters.action === "DELETED") {
          console.log('Продукт удален:', data);
          resolve(data);
        } else {
          console.log('Продукт не найден:', data);
          resolve(data);
        }
        socket.removeEventListener('message', handleResponse);
      }
    };

    socket.addEventListener('message', handleResponse);
    socket.onerror = (error) => {
      clearTimeout(timeoutId);
      console.error('Ошибка при удалении продукта:', error);
      reject(error);
      socket.removeEventListener('message', handleResponse);
    };
  });
}

// Добавление обработчика событий для кнопки "Удаление продукта"
document.addEventListener('DOMContentLoaded', function() {
  const deleteButton = document.getElementById('deleteProductButton');
  deleteButton.addEventListener('click', function() {
    const productIdentifier = document.getElementById('productIdentifierInput').value;
    
    if (!productIdentifier) {
      alert('Пожалуйста, введите Название продукта или ID.');
      return;
    }

    // Определяем, является ли введенное значение числом (ID продукта) или строкой (имя продукта)
    let identifier = isNaN(parseInt(productIdentifier)) ? { name: productIdentifier } : { id: productIdentifier };

    deleteProduct(identifier).then(response => {
      console.log('Ответ сервера:', response);
    }).catch(error => {
      console.error('Ошибка при удалении продукта:', error);
    });
  });
});

// Функция поиска продукта по ID или имени
async function findProduct(productIdentifier) {
  const uuid = generateUUID(); // Генерация уникального идентификатора для запроса
  let parameters = {};

  // Определение параметров запроса в зависимости от типа идентификатора
  if (productIdentifier.id) {
    parameters.productID = productIdentifier.id;
  } else if (productIdentifier.name) {
    parameters.productName = productIdentifier.name;
  } else {
    console.error('Необходимо указать ID или имя продукта');
    return Promise.reject(new Error('Необходимо указать ID или имя продукта'));
  }

  const request = {
    uuid: uuid,
    type: "request",
    command: "findProduct",
    parameters: parameters
  };

  // Проверка состояния WebSocket перед отправкой запроса
  if (socket.readyState !== WebSocket.OPEN) {
    console.log('WebSocket не подключен. Состояние:', socket.readyState);
    await reconnectWebSocket();
  }

  // Отправка запроса на сервер
  socket.send(JSON.stringify(request));

  // Обработка ответа сервера
  return Promise.race([
    new Promise((resolve, reject) => {
      const handleResponse = (event) => {
        const data = JSON.parse(event.data);
        if (data.uuid === uuid && data.type === "respond" && data.command === "findProduct") {
          console.log('Продукт найден:', data);
          resolve(data);
          socket.removeEventListener('message', handleResponse);
        }
      };

      socket.addEventListener('message', handleResponse);
      socket.onerror = (error) => {
        console.error('Ошибка при поиске продукта:', error);
        reject(error);
        socket.removeEventListener('message', handleResponse);
      };
    }),
    
  ]);
}

// Добавление обработчика событий для кнопки "Поиск продукта"
document.addEventListener('DOMContentLoaded', (event) => {
  // Обработчик событий для кнопки "Найти продукт"
  const findProductButton = document.getElementById('findProductButton');
  findProductButton.addEventListener('click', () => {
    const productSearchInput = document.getElementById('productSearchInput');
    const productIdentifier = productSearchInput.value.trim();

    // Проверка, введен ли идентификатор продукта
    if (!productIdentifier) {
      alert('Пожалуйста, введите ID или имя продукта для поиска.');
      return;
    }

    // Вызов функции поиска продукта
    findProduct({ name: productIdentifier }).then(response => {
      if (response.code === "SUCCESS") {
        // Обработка успешного поиска продукта
        console.log('Продукт успешно найден:', response.product);
        // Дополнительные действия, например, отображение информации о продукте
      } else {
        // Обработка случая, когда продукт не найден
        console.log('Продукт не найден.');
        // Дополнительные действия, например, отображение сообщения об ошибке
      }
    }).catch(error => {
      console.error('Ошибка при поиске продукта:', error);
    });
  });
});

// Функция назначения сборки
function assignAssembly(productID, productAmount, personID){

  const uuid = generateUUID();
  const request = {
    uuid: uuid,
    type: "request",
    command: "setGoal",
    parameters: {
      productID: productID,
      productAmount: productAmount,
      personID: personID 
    }

  };
   console.log(request.parameters)
  // Обработка исключений при работе с WebSocket
  try {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(request));
    } else {
      console.log('WebSocket не подключен. Состояние:', socket.readyState);
      reconnectWebSocket();
    }
  } catch (error) {
    console.error('Ошибка при отправке запроса:', error);
    return Promise.reject(error);
  }

 // Отправка запроса на сервер
 socket.send(JSON.stringify(request));

 // Обработка ответа сервера
 return new Promise((resolve, reject) => {
   const handleResponse = (event) => {
     const data = JSON.parse(event.data);
     if (data.uuid === uuid && data.type === "respond" && data.command === "setGoal") {
       if (data.code === "SUCCESS") {
         console.log('Сборка назначена:', data.parameters);
         resolve(data.parameters);
       } else {
         console.error('Ошибка при назначении сборки:', data);
         reject(data);
       }
       socket.removeEventListener('message', handleResponse);
     }
   };

    socket.addEventListener('message', handleResponse);
    socket.onerror = (error) => {
      clearTimeout(timeoutId);
      console.error('Ошибка при назначении сборки:', error);
      reject(error);
      socket.removeEventListener('message', handleResponse);
    };
  });
}

// Добавление обработчика событий для кнопки "Назначить сборку"
document.addEventListener('DOMContentLoaded', function() {
  // Обработчик событий для кнопки назначения сборки
  document.getElementById('assignAssemblyButton').addEventListener('click', function() {
    // Получение значений из полей ввода
    const productID = document.getElementById('assemblyProductIDInput').value;
    const productAmount = parseInt(document.getElementById('assemblyProductAmountInput').value, 10);
    const personID = document.getElementById('assemblyPersonIDInput').value;

    // Проверка введенных данных
    if (!productID || !personID) {
      alert('Пожалуйста, заполните поля "UUID продукта" и "UUID сборщика".');
      return;
    }

    // Вызов функции assignAssembly и обработка результата
    assignAssembly(productID, productAmount, personID)
      .then(parameters => {
        console.log('Сборка успешно назначена:', parameters);
        // Здесь можно добавить код для обновления интерфейса
      })
      .catch(error => {
        console.error('Произошла ошибка при назначении сборки:', error);
        // Здесь можно добавить код для отображения ошибки пользователю
      });
  });
});

//Функция окончания сборки
function endAssembly(personID){
  
  const uuid = generateUUID(); 
  const request = {
    uuid: uuid,
    type: "request",
    command: "completeGoal",
    parameters: {
      personID: personID 
    }
  };

  // Отправка запроса на сервер
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(request));
  } else {
    console.log('WebSocket не подключен. Состояние:', socket.readyState);
    reconnectWebSocket();
  }

  // Обработка ответа сервера
  return new Promise((resolve, reject) => {
    const handleResponse = (event) => {
      const data = JSON.parse(event.data);
      if (data.uuid === uuid && data.type === "respond" && data.command === "completeGoal") {
        if (data.parameters.state === "DONE") {
          console.log('Сборка успешно закончена');
          resolve(data);
        } else if (data.parameters.state === "NOT_OCCUPIED") {
          console.log('Такой сборки нет');
          resolve(data);
        }
        socket.removeEventListener('message', handleResponse);
      }
    };

    socket.addEventListener('message', handleResponse);
    socket.onerror = (error) => {
      console.error('Ошибка при событии "окончание сборки":', error);
      reject(error);
      socket.removeEventListener('message', handleResponse);
    };
  });
}

// Добавление обработчика событий для кнопки "Завершить сборку"
document.addEventListener('DOMContentLoaded', function() {
  // Обработчик событий для кнопки назначения сборки
  document.getElementById('endAssemblyButton').addEventListener('click', function() {
    // Получение значений из полей ввода
    const personID = document.getElementById('assemblyPersonIDInput').value;

    // Проверка введенных данных
    if (!personID) {
      alert('Пожалуйста, введите корректный "UUID сборщика".');
      return;
    }

    // Вызов функции endAssembly и обработка результата
    endAssembly(personID)
      .then(parameters => {
        console.log('Сборка успешно назначена:', parameters);
      })
      .catch(error => {
        console.error('Произошла ошибка при назначении сборки:', error);
      });
  });
});

//Функция отмены сборки
function cancelAssembly(personID){
  
  const uuid = generateUUID(); 
  const request = {
    uuid: uuid,
    type: "request",
    command: "cancelGoal",
    parameters: {
      personID: personID 
    }
  };

  // Отправка запроса на сервер
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(request));
  } else {
    console.log('WebSocket не подключен. Состояние:', socket.readyState);
    reconnectWebSocket();
  }

  // Обработка ответа сервера
  return new Promise((resolve, reject) => {
    const handleResponse = (event) => {
      const data = JSON.parse(event.data);
      if (data.uuid === uuid && data.type === "respond" && data.command === "cancelGoal") {
        if (data.parameters.state === "DONE") {
          console.log('Сборка успешно отменена');
          resolve(data);
        } else if (data.parameters.state === "NOT_OCCUPIED") {
          console.log('Такой сборки нет');
          resolve(data);
        }
        socket.removeEventListener('message', handleResponse);
      }
    };

    socket.addEventListener('message', handleResponse);
    socket.onerror = (error) => {
      console.error('Ошибка при событии окончание сборки:', error);
      reject(error);
      socket.removeEventListener('message', handleResponse);
    };
  });
}

// Добавление обработчика событий для кнопки "Отменить сборку"
document.addEventListener('DOMContentLoaded', function() {
  // Обработчик событий для кнопки назначения сборки
  document.getElementById('cancelAssemblyButton').addEventListener('click', function() {
    // Получение значений из полей ввода
    const personID = document.getElementById('assemblyPersonIDInput').value;

    // Проверка введенных данных
    if (!personID) {
      alert('Пожалуйста, введите корректный "UUID сборщика".');
      return;
    }

    // Вызов функции cancelAssembly и обработка результата
    cancelAssembly(personID)
      .then(parameters => {
        console.log('Сборка успешно отменена:', parameters);
      })
      .catch(error => {
        console.error('Произошла ошибка при отмене сборки:', error);
      });
  });
});

// Функция получения информации о сборке
function informationAssembly(personID){

  const uuid = generateUUID(); 
  const request = {
    uuid: uuid,
    type: "request",
    command: "informGoal",
    parameters: {
      person: personID 
    }
  };

  // Отправка запроса на сервер
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(request));
  } else {
    console.log('WebSocket не подключен. Состояние:', socket.readyState);
    reconnectWebSocket();
  }

  // Обработка ответа сервера
  return new Promise((resolve, reject) => {
    const handleResponse = (event) => {
      const data = JSON.parse(event.data);
      if (data.uuid === uuid && data.type === "respond" && data.command === "informGoal") {
        if (data.parameters.state === "OCCUPIED") {
          console.log('Информация о сборке успешно получена');
          resolve(data);
        } else if (data.parameters.state === "NOT_OCCUPIED") {
          console.log('Такой сборки нет');
          resolve(data);
        }
        socket.removeEventListener('message', handleResponse);
      }
    };

    socket.addEventListener('message', handleResponse);
    socket.onerror = (error) => {
      console.error('Ошибка при событии "получение информации о сборке":', error);
      reject(error);
      socket.removeEventListener('message', handleResponse);
    };
  });
}

// Добавление обработчика событий для кнопки "Информация о сборке"
document.addEventListener('DOMContentLoaded', function() {
  // Обработчик событий для кнопки назначения сборки
  document.getElementById('informationAssemblyButton').addEventListener('click', function() {
    // Получение значений из полей ввода
    const personID = document.getElementById('assemblyPersonIDInput').value;

    // Проверка введенных данных
    if (!personID) {
      alert('Пожалуйста, введите корректный "UUID сборщика".');
      return;
    }

    // Вызов функции cancelAssembly и обработка результата
    informationAssembly(personID)
      .then(parameters => {
        console.log('Информация о сборке получена:', parameters);
      })
      .catch(error => {
        console.error('Произошла ошибка при получении информации:', error);
      });
  });
});

// Функция для отображения раздела и скрытия основного меню
function showSection(sectionId) {
  // Скрываем основное меню
  document.querySelector('.nav-menu').style.display = 'none';
  
  // Скрываем все разделы
  document.querySelectorAll('.section').forEach(section => {
      section.style.display = 'none';
  });
  
  // Отображаем выбранный раздел
  const sectionToShow = document.getElementById(sectionId);
  if (sectionToShow) {
      sectionToShow.style.display = 'block';
  } else {
      console.error('Раздел не найден:', sectionId);
  }
}

// Функция для назначения обработчиков событий пунктов меню
function assignMenuEventHandlers() {
  document.querySelectorAll('.nav-menu li').forEach(menuItem => {
      menuItem.addEventListener('click', function() {
          const sectionId = this.getAttribute('data-section');
          showSection(sectionId);
      });
  });
}

// Обработчик кнопки назад
document.querySelectorAll('.backButton').forEach(button => {
  button.addEventListener('click', function() {
      // Скрываем все разделы
      document.querySelectorAll('.section').forEach(section => {
          section.style.display = 'none';
      });
      // Показываем главное меню
      document.querySelector('.nav-menu').style.display = 'flex';
      // Восстанавливаем обработчики событий для пунктов меню
      assignMenuEventHandlers();
  });
});

// Вызов функции для назначения обработчиков событий при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
  assignMenuEventHandlers();
});

// Основная функция для подключения и получения информации из БД
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

main()
