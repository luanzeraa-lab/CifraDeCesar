"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Não foi possível entrar.");

      localStorage.setItem("cifra-token", data.token);
      router.push("/criptografar");
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
        <h1>Suas mensagens, sob seu controle.</h1>
        <p className="brand-copy">Entre para continuar sua experiência de criptografia com segurança e simplicidade.</p>
        <div className="cipher-line" aria-hidden="true">A B C D E F G H I J K L M N O P Q R S T U V W X Y Z</div>
      </section>

      <section className="form-panel">
        <div className="form-heading">
          <span className="section-label">ÁREA SEGURA</span>
          <h2>Bem-vindo de volta</h2>
          <p>Informe seus dados para acessar sua conta.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="username">Nome de usuário</label>
          <input id="username" type="text" placeholder="Ex.: ana.silva" value={username} onChange={(event) => setUsername(event.target.value)} required />

          <label htmlFor="password">Senha</label>
          <input id="password" type="password" placeholder="Sua senha" value={password} onChange={(event) => setPassword(event.target.value)} required />

          <button type="submit" disabled={isLoading}>{isLoading ? "Aguarde..." : "Entrar"}<span aria-hidden="true">→</span></button>
        </form>

        {message && <p className="form-message" role="status">{message}</p>}
        <p className="switch-mode">Ainda não possui uma conta? <button type="button" onClick={() => router.push("/cadastro")}>Cadastre-se</button></p>
      </section>
    </main>
  );
}
