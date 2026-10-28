"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
const SUIT_SYMBOLS = { OUROS: "♦", ESPADAS: "♠", COPAS: "♥", PAUS: "♣" };

export default function Dashboard() {
  const router = useRouter();
  const [activeScreen, setActiveScreen] = useState("encrypt");
  const [message, setMessage] = useState("");
  const [encryptedMessage, setEncryptedMessage] = useState("");
  const [hash, setHash] = useState("");
  const [result, setResult] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [trucoHand, setTrucoHand] = useState(null);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("cifra-token")) router.push("/");
  }, [router]);

  function selectScreen(screen) {
    setActiveScreen(screen);
    setResult("");
    setNotice("");
    setTrucoHand(null);
  }

  async function drawTrucoHand() {
    setDrawing(true);
    setNotice("");

    try {
      const response = await fetch(`${API_URL}/api/cipher/truco`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("cifra-token")}` },
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Não foi possível sortear as cartas.");
      setTrucoHand(data);
    } catch (error) {
      if (error.message.includes("Sessão")) {
        localStorage.removeItem("cifra-token");
        router.push("/");
        return;
      }
      setNotice(error.message);
    } finally {
      setDrawing(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setResult("");
    setNotice("");

    const isEncrypting = activeScreen === "encrypt";
    const endpoint = isEncrypting ? "/api/cipher/encrypt" : "/api/cipher/decrypt";
    const body = isEncrypting
      ? { message, mao: trucoHand?.mao, vira: trucoHand?.vira }
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

    return <div className={`playing-card ${colorClass} ${extraClass}`} key={`${card.valor}-${card.naipe}`}>
      <span className="card-corner">{card.valor}<small>{SUIT_SYMBOLS[card.naipe]}</small></span>
      <strong>{SUIT_SYMBOLS[card.naipe]}</strong>
      <span className="card-suit">{card.naipe}</span>
    </div>;
  }

  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <div>
          <h1 className="eyebrow">♦ ♠ ♥ ♣</h1>
          <p className="eyebrow">TRUCO DE CESAR</p>
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
          <p>{activeScreen === "encrypt" ? "O passo será calculado a partir de uma mão de truco sorteada." : "Informe a mensagem e a chave recebida na criptografia."}</p>
        </div>

        <form className="cipher-form" onSubmit={submit}>
          {activeScreen === "encrypt" ? <>
            <label htmlFor="message">Mensagem</label>
            <textarea id="message" placeholder="Digite sua mensagem" value={message} onChange={(event) => setMessage(event.target.value)} required />
            <button className="draw-button" type="button" onClick={drawTrucoHand} disabled={drawing || loading}>
              {drawing ? "Sorteando..." : "Sortear vira e 3 cartas"}
            </button>
            {trucoHand && <div className="truco-table" aria-label="Cartas sorteadas">
              <div className="turned-card">
                <span>Vira</span>
                {renderCard({ valor: trucoHand.vira, naipe: trucoHand.viraNaipe }, "turned-playing-card")}
              </div>
              <div className="hand-cards">
                {trucoHand.mao.map((card) => renderCard(card))}
              </div>
              <small>Passo calculado: {trucoHand.step}</small>
            </div>}
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