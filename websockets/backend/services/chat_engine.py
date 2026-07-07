def reverse_word_order(text: str) -> str:
    """Reverses the order of words in a sentence, e.g. "abc cde" -> "cde abc"."""
    # split() with no args splits on any run of whitespace and drops empty
    # strings, so "abc  cde\n" still becomes ["abc", "cde"] cleanly
    words = text.split()
    # reversed() flips the list order (not the letters within each word), then
    # " ".join(...) glues the words back into a single sentence
    return " ".join(reversed(words))
