"use strict";

(() => {
  const books = globalThis.EVANGELIUM_DATA.books;
  const storageKey = "evangeliarium.prototype.bookmark.v1";
  const byId = (id) => document.getElementById(id);
  const initial = { book: "LUK", chapter: 13, start: 1, end: 9 };
  const pageBudget = 850;
  let selection = { ...initial };
  let example = true;
  let bookmark = null;
  let pages = [];
  let pageIndex = 0;
  let view = "read";

  function valid(value) {
    if (!value || typeof value !== "object") return false;
    const book = books.find((item) => item.id === value.book);
    if (!book || !Number.isInteger(value.chapter)) return false;
    const chapter = book.chapters[value.chapter - 1];
    return !!chapter && Number.isInteger(value.start) && Number.isInteger(value.end)
      && value.start >= 1 && value.end >= value.start && value.end <= chapter.length;
  }

  function equal(left, right) {
    return !!left && !!right && ["book", "chapter", "start", "end"].every((key) => left[key] === right[key]);
  }

  function bookFor(value) { return books.find((book) => book.id === value.book); }
  function reference(value) {
    const book = bookFor(value);
    const chapter = book.chapters[value.chapter - 1];
    const range = value.start === 1 && value.end === chapter.length ? ""
      : `,${value.start}${value.end === value.start ? "" : `–${value.end}`}`;
    return `${book.name} ${value.chapter}${range}`;
  }

  // A quebra por versículo preserva o texto. O limite é de estudo, não um limite da API.
  function paginate(value) {
    const verses = bookFor(value).chapters[value.chapter - 1];
    const result = [];
    let page = [];
    let length = 0;
    for (let number = value.start; number <= value.end; number += 1) {
      const text = verses[number - 1];
      if (page.length && length + text.length + 5 > pageBudget) {
        result.push(page);
        page = [];
        length = 0;
      }
      page.push({ number, text });
      length += text.length + 5;
    }
    if (page.length) result.push(page);
    return result;
  }

  function render(focus = false) {
    byId("reference").textContent = reference(selection);
    byId("context").textContent = `${example ? "Exemplo · " : ""}Bíblia Livre`;
    document.title = `${reference(selection)} · Evangeliário`;
    const passage = byId("passage");
    passage.replaceChildren();
    // Os grupos são somente de apresentação; o VPL não contém parágrafos editoriais.
    for (let index = 0; index < pages[pageIndex].length; index += 3) {
      const paragraph = document.createElement("p");
      pages[pageIndex].slice(index, index + 3).forEach((verse, offset) => {
        if (offset) paragraph.append(document.createTextNode(" "));
        const number = document.createElement("span");
        number.className = "verse-number";
        number.textContent = String(verse.number);
        number.setAttribute("aria-label", `Versículo ${verse.number}`);
        paragraph.append(number, document.createTextNode(verse.text));
      });
      passage.append(paragraph);
    }
    byId("previous").hidden = pageIndex === 0;
    byId("next").hidden = pageIndex === pages.length - 1;
    byId("progress").hidden = pages.length === 1;
    byId("progress").textContent = `${pageIndex + 1} de ${pages.length}`;
    byId("bookmark").disabled = equal(selection, bookmark);
    byId("bookmark").textContent = equal(selection, bookmark) ? "Marcado no livro" : "Marcar no livro";
    if (focus) {
      byId("reference").focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }

  function setChapterOptions(number = 1) {
    const book = books.find((item) => item.id === byId("book").value);
    byId("chapter").replaceChildren(...book.chapters.map((_, index) => new Option(String(index + 1), String(index + 1))));
    byId("chapter").value = String(Math.min(number, book.chapters.length));
  }

  function clearError() {
    byId("selection-error").hidden = true;
    byId("verses").removeAttribute("aria-invalid");
  }

  function showView(next, focus = true) {
    view = next;
    byId("reading-view").hidden = next !== "read";
    byId("choosing-view").hidden = next !== "choose";
    if (next === "choose") {
      byId("book").value = selection.book;
      setChapterOptions(selection.chapter);
      const length = bookFor(selection).chapters[selection.chapter - 1].length;
      byId("verses").value = selection.start === 1 && selection.end === length ? ""
        : `${selection.start}${selection.end === selection.start ? "" : `–${selection.end}`}`;
      clearError();
      if (focus) byId("choose-title").focus();
    } else {
      render(focus);
    }
  }

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved?.edition === "porbr2018" && valid(saved.selection)) {
      bookmark = { ...saved.selection };
      selection = { ...bookmark };
      example = false;
    }
  } catch { /* Bloqueio de armazenamento ou dados inválidos não bloqueiam a leitura. */ }

  pages = paginate(selection);
  byId("book").replaceChildren(...books.map((book) => new Option(book.name, book.id)));
  byId("book").addEventListener("change", () => {
    setChapterOptions();
    byId("verses").value = "";
    clearError();
  });
  byId("chapter").addEventListener("change", () => { byId("verses").value = ""; clearError(); });
  byId("verses").addEventListener("input", clearError);
  byId("previous").addEventListener("click", () => { pageIndex -= 1; render(true); });
  byId("next").addEventListener("click", () => { pageIndex += 1; render(true); });
  byId("choose").addEventListener("click", () => {
    history.pushState({ evangeliariumView: "choose" }, "", "#escolher");
    showView("choose");
  });
  byId("back").addEventListener("click", () => history.back());
  window.addEventListener("popstate", (event) => showView(event.state?.evangeliariumView === "choose" ? "choose" : "read"));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && view === "choose") { event.preventDefault(); history.back(); }
  });
  byId("selection-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const book = books.find((item) => item.id === byId("book").value);
    const chapter = Number(byId("chapter").value);
    const input = byId("verses").value.trim();
    const match = input.match(/^([1-9]\d*)\s*(?:[-–]\s*([1-9]\d*))?$/);
    const candidate = { book: book.id, chapter,
      start: input && match ? Number(match[1]) : 1,
      end: input && match ? Number(match[2] || match[1]) : book.chapters[chapter - 1].length };
    if ((input && !match) || !valid(candidate)) {
      byId("selection-error").textContent = `Use versículos de 1 a ${book.chapters[chapter - 1].length}, em ordem crescente.`;
      byId("selection-error").hidden = false;
      byId("verses").setAttribute("aria-invalid", "true");
      byId("verses").focus();
      return;
    }
    selection = candidate;
    example = false;
    pageIndex = 0;
    pages = paginate(selection);
    history.back();
  });
  byId("bookmark").addEventListener("click", () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ edition: "porbr2018", selection }));
      bookmark = { ...selection };
      byId("storage-error").hidden = true;
      render();
    } catch {
      byId("storage-error").textContent = "Não foi possível salvar a marca.";
      byId("storage-error").hidden = false;
    }
  });
  history.replaceState({ evangeliariumView: "read" }, "", location.pathname + location.search);
  render();
})();
