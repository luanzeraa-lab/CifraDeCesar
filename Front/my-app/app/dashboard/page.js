"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
const SUIT_SYMBOLS = { OUROS: "♦", ESPADAS: "♠", COPAS: "♥", PAUS: "♣" };
const CARD_VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS = ["PAUS", "COPAS", "ESPADAS", "OUROS"];
const CARD_NUMBERS = { A: 1, J: 11, Q: 12, K: 13 };
const POSITIVE_SUITS = ["PAUS", "COPAS"];
const DECK = SUITS.flatMap((naipe) => CARD_VALUES.map((valor) => ({ valor, naipe })));

export default function Dashboard() {
  const router = useRouter();
  const [activeScreen, setActiveScreen] = useState("encrypt");
  const [message, setMessage] = useState("");
  const [encryptedMessage, setEncryptedMessage] = useState("");
  const [hash, setHash] = useState("");
  const [result, setResult] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedCards, setSelectedCards] = useState([]);

  useEffect(() => {
    if (!localStorage.getItem("cifra-token")) router.push("/");
  }, [router]);

  function selectScreen(screen) {
    setActiveScreen(screen);
    setResult("");
    setNotice("");
    setSelectedCards([]);
  }

  function toggleCard(card) {
    const cardId = `${card.valor}-${card.naipe}`;
    const isSelected = selectedCards.some((selected) => `${selected.valor}-${selected.naipe}` === cardId);

    if (isSelected) {
      setSelectedCards((current) => current.filter((selected) => `${selected.valor}-${selected.naipe}` !== cardId));
      setNotice("");
      return;
    }

    if (selectedCards.length >= 3) {
      setNotice("Você já selecionou 3 cartas. Desmarque uma para escolher outra.");
      return;
    }

    setSelectedCards((current) => [...current, card]);
    setNotice("");
  }

  function calculateSelectedStep(cards) {
    return cards.reduce((total, card) => {
      const value = CARD_NUMBERS[card.valor] || Number(card.valor);
      return total + (POSITIVE_SUITS.includes(card.naipe) ? value : -value);
    }, 0);
  }

  async function submit(event) {
    event.preventDefault();
    const isEncrypting = activeScreen === "encrypt";

    if (isEncrypting) {
      const step = calculateSelectedStep(selectedCards);
      if (selectedCards.length !== 3) {
        setNotice("Selecione exatamente 3 cartas antes de criptografar.");
        return;
      }
      if (step === 0) {
        setNotice("O passo não pode ser zero. Escolha outras cartas.");
        return;
      }
    }

    setLoading(true);
    setResult("");
    setNotice("");

    const endpoint = isEncrypting ? "/api/cipher/encrypt" : "/api/cipher/decrypt";
    const body = isEncrypting
      ? { message, cartas: selectedCards }
      : { encryptedMessage, hash };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("cifra-token")}`,
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Não foi possível concluir a operação.");

      if (isEncrypting) {
        setResult(data.encryptedMessage);
        setHash(data.hash);
        setNotice("Mensagem protegida. Guarde a chave, pois ela só pode ser usada uma vez.");
      } else {
        setResult(data.message);
        setNotice("Mensagem descriptografada. Esta chave não pode mais ser reutilizada.");
      }
    } catch (error) {
      if (error.message.includes("Sessão")) {
        localStorage.removeItem("cifra-token");
        router.push("/");
        return;
      }
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("cifra-token");
    router.push("/");
  }

  function renderCard(card, extraClass = "") {
    const colorClass = ["OUROS", "COPAS"].includes(card.naipe) ? "red-suit" : "black-suit";
    const cardId = `${card.valor}-${card.naipe}`;
    const isSelected = selectedCards.some((selected) => `${selected.valor}-${selected.naipe}` === cardId);

    return <button
      type="button"
      className={`playing-card ${colorClass} ${extraClass} ${isSelected ? "selected" : ""}`}
      key={cardId}
      onClick={() => toggleCard(card)}
      aria-pressed={isSelected}
      aria-label={`${card.valor} de ${card.naipe}${isSelected ? ", selecionada" : ""}`}
      disabled={!isSelected && selectedCards.length >= 3}
    >
      <span className="card-corner">{card.valor}<small>{SUIT_SYMBOLS[card.naipe]}</small></span>
      <strong>{SUIT_SYMBOLS[card.naipe]}</strong>
      <span className="card-suit">{card.naipe}</span>
    </button>;
  }

  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <div>
          <h1 className="eyebrow">♦ ♠ ♥ ♣</h1>
          <p className="eyebrow">BARALHO DE CESAR</p>
          <h1>Central de mensagens</h1>
        </div>
        <button className="logout-button" type="button" onClick={logout}>Sair</button>
      </header>

      <nav className="workspace-nav" aria-label="Operações">
        <button className={activeScreen === "encrypt" ? "nav-option active" : "nav-option"} type="button" onClick={() => selectScreen("encrypt")}>Criptografar</button>
        <button className={activeScreen === "decrypt" ? "nav-option active" : "nav-option"} type="button" onClick={() => selectScreen("decrypt")}>Descriptografar</button>
      </nav>

      <section className="cipher-workspace">
        <div className="workspace-intro">
          <span className="section-label">{activeScreen === "encrypt" ? "NOVA CHAVE" : "ACESSO COM CHAVE"}</span>
          <h2>{activeScreen === "encrypt" ? "Proteja uma mensagem" : "Recupere uma mensagem"}</h2>
          <p>{activeScreen === "encrypt" ? "Escolha exatamente 3 cartas para definir o passo da cifra." : "Informe a mensagem e a chave recebida na criptografia."}</p>
        </div>

        <form className="cipher-form" onSubmit={submit}>
          {activeScreen === "encrypt" ? <>
            <label htmlFor="message">Mensagem</label>
            <textarea id="message" placeholder="Digite sua mensagem" value={message} onChange={(event) => setMessage(event.target.value)} required />
            <div className="card-selection">
              <div className="selection-heading">
                <span>Selecione até 3 cartas</span>
                <strong>{selectedCards.length}/3</strong>
              </div>
              <div className="deck-grid" aria-label="Baralho completo de 52 cartas">
                {SUITS.map((suit) => (
                  <section className="suit-group" key={suit} aria-label={suit}>
                    <h3 className={["COPAS", "OUROS"].includes(suit) ? "red-suit-label" : "black-suit-label"}>
                      {SUIT_SYMBOLS[suit]} {suit}
                    </h3>
                    <div className="suit-cards">
                      {DECK.filter((card) => card.naipe === suit).map((card) => renderCard(card))}
                    </div>
                  </section>
                ))}
              </div>
              <div className="step-feedback" aria-live="polite">
                <span>Cartas selecionadas: {selectedCards.length ? selectedCards.map((card) => `${card.valor}${SUIT_SYMBOLS[card.naipe]}`).join(", ") : "nenhuma"}</span>
                <strong>Passo calculado: {selectedCards.length === 0 ? "0" : `${calculateSelectedStep(selectedCards) >= 0 ? "+" : ""}${calculateSelectedStep(selectedCards)}`}</strong>
              </div>
            </div>
          </> : <>
            <label htmlFor="encrypted-message">Mensagem criptografada</label>
            <textarea id="encrypted-message" placeholder="Cole a mensagem criptografada" value={encryptedMessage} onChange={(event) => setEncryptedMessage(event.target.value)} required />
            <label htmlFor="hash">Chave privada</label>
            <input id="hash" type="text" placeholder="Ex.: 4a9f20c1b8de" value={hash} onChange={(event) => setHash(event.target.value)} required />
          </>}
          <button className="primary-button" type="submit" disabled={loading}>{loading ? "Processando..." : activeScreen === "encrypt" ? "Criptografar" : "Descriptografar"}<span aria-hidden="true">→</span></button>
        </form>

        {result && <div className="result-box"><span>{activeScreen === "encrypt" ? "Resultado criptografado" : "Mensagem original"}</span><strong>{result}</strong>{activeScreen === "encrypt" && <><small>Chave privada de uso único</small><code>{hash}</code></>}</div>}
        {notice && <p className="workspace-notice" role="status">{notice}</p>}
      </section>
    </main>
  );
}