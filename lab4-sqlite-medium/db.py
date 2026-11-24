import sqlite3

# подключение к файлу БД (создаётся автоматически)
conn = sqlite3.connect('lab4.db')
# включаем проверку внешних ключей
conn.execute('PRAGMA foreign_keys = ON')
cur = conn.cursor()

# создание таблиц: автор и книга, связь через author_id
cur.executescript("""
CREATE TABLE IF NOT EXISTS authors (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    name    TEXT NOT NULL UNIQUE,
    country TEXT
);

CREATE TABLE IF NOT EXISTS books (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    title     TEXT NOT NULL,
    year      INTEGER,
    genre     TEXT,
    pages     INTEGER,
    author_id INTEGER NOT NULL,
    FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE
);
""")

# очистка перед повторным запуском (сначала книги)
cur.execute('DELETE FROM books')
cur.execute('DELETE FROM authors')

# вставка данных в транзакции
try:
    cur.execute("INSERT INTO authors (name, country) VALUES (?, ?)", ('Лев Толстой', 'Россия'))
    tolstoy = cur.lastrowid
    cur.execute("INSERT INTO authors (name, country) VALUES (?, ?)", ('Джоан Роулинг', 'Великобритания'))
    rowling = cur.lastrowid
    cur.execute("INSERT INTO authors (name, country) VALUES (?, ?)", ('Дж. Р. Р. Толкин', 'Великобритания'))
    tolkien = cur.lastrowid

    # книги одной пачкой
    cur.executemany(
        "INSERT INTO books (title, year, genre, pages, author_id) VALUES (?, ?, ?, ?, ?)",
        [
            ('Война и мир',                        1869, 'Роман',      1274, tolstoy),
            ('Анна Каренина',                      1877, 'Роман',       864, tolstoy),
            ('Гарри Поттер и философский камень',  1997, 'Фэнтези',     332, rowling),
            ('Гарри Поттер и Тайная комната',      1998, 'Фэнтези',     416, rowling),
            ('Хоббит, или Туда и обратно',         1937, 'Фэнтези',     310, tolkien),
            ('Властелин колец',                    1954, 'Фэнтези',    1178, tolkien),
        ]
    )
    conn.commit()
    print('Данные успешно добавлены')
except Exception as err:
    # откат при ошибке
    conn.rollback()
    print('Откат транзакции:', err)

# INNER JOIN: книги с авторами
print('\n[INNER JOIN] Книги и авторы:')
cur.execute("""
    SELECT b.title, b.year, a.name
    FROM books b
    JOIN authors a ON a.id = b.author_id
    ORDER BY b.year
""")
for row in cur.fetchall():
    print(' ', row)

# LEFT JOIN + GROUP BY: число книг у каждого автора
print('\n[LEFT JOIN + GROUP BY] Число книг по авторам:')
cur.execute("""
    SELECT a.name, COUNT(b.id)
    FROM authors a
    LEFT JOIN books b ON b.author_id = a.id
    GROUP BY a.id
""")
for row in cur.fetchall():
    print(' ', row)

# HAVING: авторы, у которых суммарно больше 1000 страниц
print('\n[HAVING] Авторы с суммарным объёмом книг > 1000 страниц:')
cur.execute("""
    SELECT a.name, SUM(b.pages)
    FROM authors a
    JOIN books b ON b.author_id = a.id
    GROUP BY a.id
    HAVING SUM(b.pages) > 1000
""")
for row in cur.fetchall():
    print(' ', row)

# подзапрос: самая ранняя книга каждого автора
print('\n[Подзапрос] Самая ранняя книга каждого автора:')
cur.execute("""
    SELECT b.title, b.year, a.name
    FROM books b
    JOIN authors a ON a.id = b.author_id
    WHERE b.year = (
        SELECT MIN(year) FROM books WHERE author_id = b.author_id
    )
""")
for row in cur.fetchall():
    print(' ', row)

# UPDATE: добавляем 50 страниц книгам Толстого
cur.execute("""
    UPDATE books
    SET pages = pages + 50
    WHERE author_id = (SELECT id FROM authors WHERE name = 'Лев Толстой')
""")
conn.commit()
print('\nОбъём книг Толстого увеличен на 50 страниц')

# DELETE: удаление автора, книги уходят по CASCADE
cur.execute("DELETE FROM authors WHERE name = 'Джоан Роулинг'")
conn.commit()
cur.execute('SELECT COUNT(*) FROM books')
print('После удаления Джоан Роулинг книг осталось:', cur.fetchone()[0])

# итоговое состояние таблицы books
print('\n[Итог] Текущие книги:')
cur.execute("""
    SELECT b.title, b.year, a.name
    FROM books b
    JOIN authors a ON a.id = b.author_id
    ORDER BY b.year
""")
for row in cur.fetchall():
    print(' ', row)

conn.close()