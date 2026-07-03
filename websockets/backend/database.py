import os
import sqlite3

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Please define it in your .env file."
    )


def connect_db() -> tuple[sqlite3.Connection, sqlite3.Cursor]:
    try:
        conn = sqlite3.connect(DATABASE_URL)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        return conn, cursor
    except sqlite3.Error as e:
        print(f"Error connecting to database: {e}")
        raise


def close_db(conn: sqlite3.Connection | None, cursor: sqlite3.Cursor | None) -> None:
    try:
        if cursor is not None:
            cursor.close()
    except sqlite3.Error as e:
        print(f"Error closing cursor: {e}")
    finally:
        try:
            if conn is not None:
                conn.close()
        except sqlite3.Error as e:
            print(f"Error closing connection: {e}")


def init_db() -> None:
    conn, cursor = connect_db()
    try:
        cursor.execute(
            """

            """
        )
        conn.commit()
    except sqlite3.Error as e:
        print(f"Error initializing database: {e}")
        conn.rollback()
    finally:
        close_db(conn, cursor)


def seed_data() -> None:
    conn, cursor = connect_db()
    try:
        cursor.execute("SELECT COUNT(*) FROM recipes")
        count = cursor.fetchone()[0]
        if count == 0:
            cursor.execute(
                """

                """
            )
            conn.commit()
    except sqlite3.Error as e:
        print(f"Error seeding data: {e}")
        conn.rollback()
    finally:
        close_db(conn, cursor)
