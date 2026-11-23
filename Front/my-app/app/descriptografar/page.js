"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import WorkspaceHeader from "../components/WorkspaceHeader";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export default function DecryptPage() {
  const router = useRouter();
  const [encryptedMessage, setEncryptedMessage] = useState("");
  const [hash, setHash] = useState("");
  const [result, setResult] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("cifra-token")) router.push("/login");
  }, [router]);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setResult("");
    setNotice("");

    try {
      const response = await fetch(`${API_URL}/api/cipher/decrypt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("cifra-token")}`,
        },
        body: JSON.stringify({ encryptedMessage, hash }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível concluir a operação.");

      setResult(data.message);
      setNotice("Mensagem descriptografada. Esta chave não pode mais ser reutilizada.");
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

  return (
    <main className="workspace-shell">
      <WorkspaceHeader activeScreen="decrypt" />
      <section className="cipher-workspace">
        <div className="workspace-intro">
          <span className="section-label">ACESSO COM CHAVE</span>
          <h2>Recupere uma mensagem</h2>
          <p>Informe a mensagem criptografada e a chave recebida na criptografia.</p>
        </div>

        <form className="cipher-form" onSubmit={submit}>
          <label htmlFor="encrypted-message">Mensagem criptografada</label>
          <textarea id="encrypted-message" placeholder="Cole a mensagem criptografada" value={encryptedMessage} onChange={(event) => setEncryptedMessage(event.target.value)} required />

          <label htmlFor="hash">Chave privada</label>
          <input id="hash" type="text" placeholder="Ex.: 4a9f20c1b8de" value={hash} onChange={(event) => setHash(event.target.value)} required />

          <button className="primary-button" type="submit" disabled={loading}>{loading ? "Processando..." : "Descriptografar"}<span aria-hidden="true">→</span></button>
        </form>

        {result && (
          <div className="result-box">
            <span>Mensagem original</span>
            <strong>{result}</strong>
          </div>
        )}
        {notice && <p className="workspace-notice" role="status">{notice}</p>}
      </section>
    </main>
  );
}
