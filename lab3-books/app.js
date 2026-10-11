const express = require('express');
const app = express();
const port = 3000;

// Middleware для парсинга JSON
app.use(express.json());

// Middleware для логирования запросов
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} | IP: ${req.ip}`);
  next();
});

// ============ ХРАНИЛИЩЕ ДАННЫХ ============
let books = [
  { id: 1, title: 'Война и мир', year: 1869, genre: 'Роман', author: 'Лев Толстой' },
  { id: 2, title: 'Преступление и наказание', year: 1866, genre: 'Роман', author: 'Фёдор Достоевский' },
  { id: 3, title: 'Мастер и Маргарита', year: 1967, genre: 'Мистика', author: 'Михаил Булгаков' },
  { id: 4, title: '1984', year: 1949, genre: 'Антиутопия', author: 'Джордж Оруэлл' },
  { id: 5, title: 'Гарри Поттер и философский камень', year: 1997, genre: 'Фэнтези', author: 'Джоан Роулинг' },
  { id: 6, title: 'Гарри Поттер и Тайная комната', year: 1998, genre: 'Фэнтези', author: 'Джоан Роулинг' },
  { id: 7, title: 'Хоббит, или Туда и обратно', year: 1937, genre: 'Фэнтези', author: 'Дж. Р. Р. Толкин' },
  { id: 8, title: 'Властелин колец', year: 1954, genre: 'Фэнтези', author: 'Дж. Р. Р. Толкин' },
  { id: 9, title: 'Дюна', year: 1965, genre: 'Фантастика', author: 'Фрэнк Герберт' },
  { id: 10, title: 'Марсианин', year: 2011, genre: 'Фантастика', author: 'Энди Вейер' }
];

// ============ БАЗОВЫЙ УРОВЕНЬ ============

// 2. GET /books/:id — одна книга
app.get('/books/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'ID должен быть числом' });
  }
  const book = books.find(b => b.id === id);
  if (!book) {
    return res.status(404).json({ error: 'Книга не найдена' });
  }
  res.json(book);
});

// 3. GET /books/:id/details — вложенный ресурс
app.get('/books/:id/details', (req, res) => {
  const id = parseInt(req.params.id);
  const book = books.find(b => b.id === id);
  if (!book) {
    return res.status(404).json({ error: 'Книга не найдена' });
  }
  res.json({
    book,
    chapters: [
      { id: 1, title: 'Глава 1', pages: 30 },
      { id: 2, title: 'Глава 2', pages: 45 }
    ],
    reviews: [
      { id: 1, author: 'Читатель 1', rating: 5 },
      { id: 2, author: 'Читатель 2', rating: 4 }
    ]
  });
});

// 4. GET /genres/:genre/books — книги жанра
app.get('/genres/:genre/books', (req, res) => {
  const genre = req.params.genre;
  const filtered = books.filter(b =>
    b.genre.toLowerCase() === genre.toLowerCase()
  );
  res.json({ genre, count: filtered.length, books: filtered });
});

// ============ СРЕДНИЙ УРОВЕНЬ ============

// GET /books — все книги + поиск + фильтрация + сортировка + пагинация
app.get('/books', (req, res) => {
  let result = [...books];
  const { search, genre, year, sort, order, page, limit } = req.query;

  // Поиск по названию
  if (search) {
    const s = search.toLowerCase();
    result = result.filter(b => b.title.toLowerCase().includes(s));
  }

  // Фильтрация по жанру
  if (genre) {
    result = result.filter(b =>
      b.genre.toLowerCase() === genre.toLowerCase()
    );
  }

  // Фильтрация по году
  if (year) {
    const y = parseInt(year);
    if (isNaN(y)) {
      return res.status(400).json({ error: 'Параметр year должен быть числом' });
    }
    result = result.filter(b => b.year === y);
  }

  // Сортировка (белый список полей)
  const allowedSortFields = ['id', 'title', 'year'];
  if (sort) {
    if (!allowedSortFields.includes(sort)) {
      return res.status(400).json({
        error: `Поле сортировки должно быть одним из: ${allowedSortFields.join(', ')}`
      });
    }
    if (order && !['asc', 'desc'].includes(order)) {
      return res.status(400).json({ error: 'Параметр order должен быть asc или desc' });
    }
    const sortOrder = order === 'desc' ? -1 : 1;
    result.sort((a, b) => {
      if (a[sort] < b[sort]) return -1 * sortOrder;
      if (a[sort] > b[sort]) return 1 * sortOrder;
      return 0;
    });
  }

  // Пагинация
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;

  if (pageNum < 1) {
    return res.status(400).json({ error: 'page должен быть >= 1' });
  }
  if (limitNum < 1 || limitNum > 100) {
    return res.status(400).json({ error: 'limit должен быть от 1 до 100' });
  }

  const total = result.length;
  const start = (pageNum - 1) * limitNum;
  const paginated = result.slice(start, start + limitNum);

  res.json({
    count: paginated.length,
    total: total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
    books: paginated
  });
});

// ============ ОБРАБОТКА 404 ============
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

// ============ ЗАПУСК ============
app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});