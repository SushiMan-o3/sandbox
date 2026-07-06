from api.config import anthropic_client, CLAUDE_MODEL, MAX_TOKENS, SYSTEM_PROMPT


def ask_claude(history: list[dict], user_text: str) -> str:
    history.append({"role": "user", "content": user_text})

    message = anthropic_client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=MAX_TOKENS,
        system=SYSTEM_PROMPT,
        messages=history,
    )

    reply = message.content[0].text
    history.append({"role": "assistant", "content": reply})

    return reply
