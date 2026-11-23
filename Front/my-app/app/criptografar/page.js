"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import WorkspaceHeader from "../components/WorkspaceHeader";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
const SUIT_SYMBOLS = { OUROS: "♦", ESPADAS: "♠", COPAS: "♥", PAUS: "♣" };
const CARD_VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS = ["PAUS", "COPAS", "ESPADAS", "OUROS"];
const CARD_NUMBERS = { A: 1, J: 11, Q: 12, K: 13 };
const POSITIVE_SUITS = ["PAUS", "COPAS"];
const DECK = SUITS.flatMap((naipe) => CARD_VALUES.map((valor) => ({ valor, naipe })));

export default function EncryptPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [result, setResult] = useState("");
  const [hash, setHash] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedCards, setSelectedCards] = useState([]);

  useEffect(() => {
    if (!localStorage.getItem("cifra-token")) router.push("/login");
  }, [router]);

  function calculateSelectedStep(cards) {
    return cards.reduce((total, card) => {
      const value = CARD_NUMBERS[card.valor] || Number(card.valor);
      return total + (POSITIVE_SUITS.includes(card.naipe) ? value : -value);
    }, 0);
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

  async function submit(event) {
    event.preventDefault();
    const step = calculateSelectedStep(selectedCards);

    if (selectedCards.length !== 3) {
      setNotice("Selecione exatamente 3 cartas antes de criptografar.");
      return;
    }
    if (step === 0) {
      setNotice("O passo não pode ser zero. Escolha outras cartas.");
      return;
    }

    setLoading(true);
    setResult("");
    setHash("");
    setNotice("");

    try {
      const response = await fetch(`${API_URL}/api/cipher/encrypt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("cifra-token")}`,
        },
        body: JSON.stringify({ message, cartas: selectedCards }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível concluir a operação.");

      setResult(data.encryptedMessage);
      setHash(data.hash);
      setNotice("Mensagem protegida. Guarde a chave, pois ela só pode ser usada uma vez.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro de conexão com a API.";
      if (errorMessage.includes("Sessão")) {
        localStorage.removeItem("cifra-token");
        router.push("/login");
        return;
      }
      setNotice(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  function renderCard(card) {
    const cardId = `${card.valor}-${card.naipe}`;
    const isSelected = selectedCards.some((selected) => `${selected.valor}-${selected.naipe}` === cardId);
    const colorClass = ["OUROS", "COPAS"].includes(card.naipe) ? "red-suit" : "black-suit";

    return (
      <button
        type="button"
        className={`playing-card ${colorClass} ${isSelected ? "selected" : ""}`}
        key={cardId}
        onClick={() => toggleCard(card)}
        aria-pressed={isSelected}
        aria-label={`${card.valor} de ${card.naipe}${isSelected ? ", selecionada" : ""}`}
        disabled={!isSelected && selectedCards.length >= 3}
      >
        <span className="card-corner">{card.valor}<small>{SUIT_SYMBOLS[card.naipe]}</small></span>
        <strong>{SUIT_SYMBOLS[card.naipe]}</strong>
      </button>
    );
  }

  return (
    <main className="workspace-shell">
      <WorkspaceHeader activeScreen="encrypt" />
      <section className="cipher-workspace">
        <div className="workspace-intro">
          <span className="section-label">NOVA CHAVE</span>
          <h2>Proteja uma mensagem</h2>
          <p>Escolha exatamente 3 cartas para definir o passo da cifra.</p>
        </div>

        <form className="cipher-form" onSubmit={submit}>
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
                  <div className="suit-cards">{DECK.filter((card) => card.naipe === suit).map(renderCard)}</div>
                </section>
              ))}
            </div>
            <div className="step-feedback" aria-live="polite">
              <span>Cartas selecionadas: {selectedCards.length ? selectedCards.map((card) => `${card.valor}${SUIT_SYMBOLS[card.naipe]}`).join(", ") : "nenhuma"}</span>
              <strong>Passo calculado: {selectedCards.length === 0 ? "0" : `${calculateSelectedStep(selectedCards) >= 0 ? "+" : ""}${calculateSelectedStep(selectedCards)}`}</strong>
            </div>
          </div>

          <button className="primary-button" type="submit" disabled={loading}>{loading ? "Processando..." : "Criptografar"}<span aria-hidden="true">→</span></button>
        </form>

        {result && (
          <div className="result-box">
            <span>Resultado criptografado</span>
            <strong>{result}</strong>
            <small>Chave privada de uso único</small>
            <code>{hash}</code>
          </div>
        )}
        {notice && <p className="workspace-notice" role="status">{notice}</p>}
      </section>
    </main>
  );
}
