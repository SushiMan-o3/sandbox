import sqlite3 as sql


def connect_db():
    connection = sql.connect("database.db")
    cursor = connection.cursor()
    return connection, cursor


def close_db(cursor, connection):
    cursor.close()
    connection.close()


def init_db():
    connection, cursor = connect_db()
    
    cursor.execute("PRAGMA foreign_keys = ON")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS recipes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title VARCHAR(100) NOT NULL,
            description TEXT NOT NULL,
            instructions TEXT NOT NULL,
            durationInMinutes INTEGER NOT NULL,
            serving INTEGER NOT NULL,
            notes TEXT
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ingredients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            recipeid INTEGER NOT NULL,
            FOREIGN KEY (recipeid) REFERENCES recipes(id) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS equipments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            recipeid INTEGER NOT NULL,
            FOREIGN KEY (recipeid) REFERENCES recipes(id) ON DELETE CASCADE
        )
    """)
    
    connection.commit()
    close_db(cursor, connection)