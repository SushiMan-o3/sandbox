import os
from dotenv import load_dotenv
import psycopg2


load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


def connect_db():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is missing")

    connection = psycopg2.connect(DATABASE_URL)
    cursor = connection.cursor()
    return connection, cursor


def close_db(cursor, connection):
    cursor.close()
    connection.close()


def init_db():
    connection, cursor = connect_db()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS recipes (
            id SERIAL PRIMARY KEY,
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
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            recipeid INTEGER NOT NULL,
            FOREIGN KEY (recipeid) REFERENCES recipes(id) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS equipments (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            recipeid INTEGER NOT NULL,
            FOREIGN KEY (recipeid) REFERENCES recipes(id) ON DELETE CASCADE
        )
    """)
    
    connection.commit()
    close_db(cursor, connection)