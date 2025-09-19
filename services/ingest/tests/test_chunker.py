import pytest

from services.ingest.chunker import chunk_markdown


def test_chunk_markdown_default_window_and_indices():
    md = "One. Two. Three. Four. Five. Six. Seven. Eight. Nine."
    chunks = chunk_markdown(md)

    assert len(chunks) == 3
    assert [chunk["idx"] for chunk in chunks] == [0, 1, 2]
    assert chunks[0]["text"] == "One. Two. Three. Four. Five."
    assert chunks[1]["text"] == "Five. Six. Seven. Eight. Nine."
    assert chunks[2]["text"] == "Nine."


def test_chunk_markdown_overlap():
    md = "One. Two. Three. Four. Five. Six."
    chunks = chunk_markdown(md, window_sent=3, overlap=1)

    assert [chunk["idx"] for chunk in chunks] == [0, 1, 2]
    assert chunks[0]["text"] == "One. Two. Three."
    assert chunks[1]["text"] == "Three. Four. Five."
    assert chunks[2]["text"] == "Five. Six."


@pytest.mark.parametrize(
    "text",
    ["Short.", "Leading and trailing spaces.   ", "  Trimmed."],
)
def test_chunk_markdown_single_chunk_for_short_input(text):
    chunks = chunk_markdown(text)

    assert len(chunks) == 1
    assert chunks[0]["idx"] == 0
    assert chunks[0]["text"] == text.strip()