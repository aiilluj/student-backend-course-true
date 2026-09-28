const express = require('express');

const app = express();
const port = 3000;

// Middleware для парсинга JSON из тела запроса
app.use(express.json());

// Middleware для логирования запросов
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ============ ХРАНИЛИЩЕ ДАННЫХ В ПАМЯТИ ============
let books = [
  { id: 1, title: 'Война и мир', year: 1869, genre: 'Роман', author: 'Лев Толстой' },
  { id: 2, title: 'Преступление и наказание', year: 1866, genre: 'Роман', author: 'Фёдор Достоевский' },
  { id: 3, title: 'Мастер и Маргарита', year: 1967, genre: 'Мистика', author: 'Михаил Булгаков' },
  { id: 4, title: '1984', year: 1949, genre: 'Антиутопия', author: 'Джордж Оруэлл' },
  { id: 5, title: 'Гарри Поттер и философский камень', year: 1997, genre: 'Фэнтези', author: 'Джоан Роулинг' }
];

// Счётчик для генерации новых ID
let nextId = 6;

// ============ ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ВАЛИДАЦИИ ============
function validateBook(body, isUpdate = false) {
  const errors = [];
  const { title, year, genre, author } = body;

  // Если это обновление (PUT) — можно не проверять обязательность всех полей,
  // но для полного обновления проверяем всё.
  if (!isUpdate || title !== undefined) {
    if (!title || typeof title !== 'string' || title.trim() === '') {
      errors.push('Поле "title" обязательно и должно быть непустой строкой');
    }
  }
  if (!isUpdate || year !== undefined) {
    if (year === undefined || typeof year !== 'number' || isNaN(year)) {
      errors.push('Поле "year" обязательно и должно быть числом');
    }
  }
  if (!isUpdate || genre !== undefined) {
    if (!genre || typeof genre !== 'string' || genre.trim() === '') {
      errors.push('Поле "genre" обязательно и должно быть непустой строкой');
    }
  }
  if (!isUpdate || author !== undefined) {
    if (!author || typeof author !== 'string' || author.trim() === '') {
      errors.push('Поле "author" обязательно и должно быть непустой строкой');
    }
  }

  return errors;
}

// ============ CRUD-ОПЕРАЦИИ ============

// GET /books — получить все книги (с поиском, сортировкой, пагинацией)
app.get('/books', (req, res) => {
  let result = [...books];

  const { search, sort, order, page, limit } = req.query;

  // --- Поиск по названию (title) ---
  if (search) {
    const searchLower = search.toLowerCase();
    result = result.filter(book =>
      book.title.toLowerCase().includes(searchLower)
    );
  }

  // --- Сортировка ---
  if (sort) {
    const sortOrder = order === 'desc' ? -1 : 1;
    // Проверяем, что поле существует (хотя бы у одного элемента)
    if (result.length > 0 && result[0].hasOwnProperty(sort)) {
      result.sort((a, b) => {
        if (a[sort] < b[sort]) return -1 * sortOrder;
        if (a[sort] > b[sort]) return 1 * sortOrder;
        return 0;
      });
    } else {
      return res.status(400).json({ error: `Невозможно сортировать по полю "${sort}"` });
    }
  }

  // --- Пагинация ---
  let total = result.length;
  let pageNum = parseInt(page) || 1;
  let limitNum = parseInt(limit) || 10;

  if (pageNum < 1) pageNum = 1;
  if (limitNum < 1) limitNum = 10;

  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = startIndex + limitNum;
  const paginatedResult = result.slice(startIndex, endIndex);

  res.json({
    count: paginatedResult.length,
    total: total,
    page: pageNum,
    limit: limitNum,
    books: paginatedResult
  });
});

// GET /books/:id — получить одну книгу
app.get('/books/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const book = books.find(b => b.id === id);

  if (!book) {
    return res.status(404).json({ error: 'Книга не найдена' });
  }

  res.json(book);
});

// POST /books — создать новую книгу
app.post('/books', (req, res) => {
  const errors = validateBook(req.body, false);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const { title, year, genre, author } = req.body;

  const newBook = {
    id: nextId++,
    title: title.trim(),
    year: year,
    genre: genre.trim(),
    author: author.trim()
  };

  books.push(newBook);

  // 201 Created
  res.status(201).json(newBook);
});

// PUT /books/:id — полное обновление книги
app.put('/books/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = books.findIndex(b => b.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Книга не найдена' });
  }

  const errors = validateBook(req.body, true);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const { title, year, genre, author } = req.body;

  books[index] = {
    id: id,
    title: title !== undefined ? title.trim() : books[index].title,
    year: year !== undefined ? year : books[index].year,
    genre: genre !== undefined ? genre.trim() : books[index].genre,
    author: author !== undefined ? author.trim() : books[index].author
  };

  res.json(books[index]);
});

// DELETE /books/:id — удалить книгу
app.delete('/books/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = books.findIndex(b => b.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Книга не найдена' });
  }

  books.splice(index, 1);

  // 204 No Content — без тела ответа
  res.status(204).send();
});

// ============ ОБРАБОТКА 404 ============
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

// ============ ЗАПУСК СЕРВЕРА ============
app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});