"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export default function Dashboard() {
  const router = useRouter();
  const [activeScreen, setActiveScreen] = useState("encrypt");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState("3");
  const [encryptedMessage, setEncryptedMessage] = useState("");
  const [hash, setHash] = useState("");
  const [result, setResult] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("cifra-token")) router.push("/");
  }, [router]);

  function selectScreen(screen) {
    setActiveScreen(screen);
    setResult("");
    setNotice("");
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setResult("");
    setNotice("");

    const isEncrypting = activeScreen === "encrypt";
    const endpoint = isEncrypting ? "/api/cipher/encrypt" : "/api/cipher/decrypt";
    const body = isEncrypting ? { message, step } : { encryptedMessage, hash };

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

  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">CIFRA DE CESAR</p>
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
          <p>{activeScreen === "encrypt" ? "Escolha o deslocamento e receba uma chave privada de uso único." : "Informe a mensagem e a chave recebida na criptografia."}</p>
        </div>

        <form className="cipher-form" onSubmit={submit}>
          {activeScreen === "encrypt" ? <>
            <label htmlFor="message">Mensagem</label>
            <textarea id="message" placeholder="Digite sua mensagem" value={message} onChange={(event) => setMessage(event.target.value)} required />
            <label htmlFor="step">Passo de deslocamento</label>
            <input id="step" type="number" value={step} onChange={(event) => setStep(event.target.value)} required />
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