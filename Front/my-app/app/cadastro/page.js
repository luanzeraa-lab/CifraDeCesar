"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Não foi possível concluir o cadastro.");

      setMessage("Cadastro concluído. Você já pode entrar.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro de conexão com a API.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="brand-panel">
        <h1>♦ ♠ ♥ ♣</h1>
        <p className="eyebrow">BARALHO DE CESAR</p>
        <h1>Proteja cada palavra.</h1>
        <p className="brand-copy">Crie sua conta para criptografar e descriptografar mensagens de forma segura.</p>
        <div className="cipher-line" aria-hidden="true">A B C D E F G H I J K L M N O P Q R S T U V W X Y Z</div>
      </section>

      <section className="form-panel">
        <div className="form-heading">
          <span className="section-label">NOVO CADASTRO</span>
          <h2>Crie sua conta</h2>
          <p>Cadastre-se para começar a proteger suas mensagens.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="username">Nome de usuário</label>
          <input id="username" type="text" placeholder="Ex.: ana.silva" value={username} onChange={(event) => setUsername(event.target.value)} required />

          <label htmlFor="email">Email</label>
          <input id="email" type="email" placeholder="voce@email.com" value={email} onChange={(event) => setEmail(event.target.value)} required />

          <label htmlFor="password">Senha</label>
          <input id="password" type="password" placeholder="Mínimo de 6 caracteres" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />

          <button type="submit" disabled={isLoading}>{isLoading ? "Aguarde..." : "Criar conta"}<span aria-hidden="true">→</span></button>
        </form>

        {message && <p className="form-message" role="status">{message}</p>}
        <p className="switch-mode">Já possui uma conta? <button type="button" onClick={() => router.push("/login")}>Entrar</button></p>
      </section>
    </main>
  );
}
