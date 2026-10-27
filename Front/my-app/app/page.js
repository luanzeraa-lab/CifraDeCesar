"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export default function Home() {
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function changeMode() {
    setIsRegistering((currentMode) => !currentMode);
    setMessage("");
    setEmail("");
    setPassword("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      const endpoint = isRegistering ? "/api/auth/register" : "/api/auth/login";
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Não foi possível concluir a operação.");

      if (data.token) localStorage.setItem("cifra-token", data.token);
      if (!isRegistering) {
        router.push("/dashboard");
        return;
      }
      setMessage("Cadastro concluído. Você já pode entrar.");
      if (isRegistering) {
        setIsRegistering(false);
        setEmail("");
        setPassword("");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro de conexão com a API.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="brand-panel">
        <div className="brand-mark">C</div>
        <p className="eyebrow">CIFRA DE CESAR</p>
        <h1>Suas mensagens, sob seu controle.</h1>
        <p className="brand-copy">Entre para continuar sua experiência de criptografia com segurança e simplicidade.</p>
        <div className="cipher-line" aria-hidden="true">A  B  C  D  E  F  G  H  I  J  K  L  M</div>
      </section>

      <section className="form-panel">
        <div className="form-heading">
          <span className="section-label">ÁREA SEGURA</span>
          <h2>{isRegistering ? "Crie sua conta" : "Bem-vindo de volta"}</h2>
          <p>{isRegistering ? "Cadastre-se para começar a proteger suas mensagens." : "Informe seus dados para acessar sua conta."}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="username">Nome de usuário</label>
          <input id="username" type="text" placeholder="Ex.: ana.silva" value={username} onChange={(event) => setUsername(event.target.value)} required />

          {isRegistering && <>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" placeholder="voce@email.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </>}

          <label htmlFor="password">Senha</label>
          <input id="password" type="password" placeholder="Mínimo de 6 caracteres" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />

          <button type="submit" disabled={isLoading}>{isLoading ? "Aguarde..." : isRegistering ? "Criar conta" : "Entrar"}<span aria-hidden="true">→</span></button>
        </form>

        {message && <p className="form-message" role="status">{message}</p>}
        <p className="switch-mode">{isRegistering ? "Já possui uma conta?" : "Ainda não possui uma conta?"} <button type="button" onClick={changeMode}>{isRegistering ? "Entrar" : "Cadastre-se"}</button></p>
      </section>
    </main>
  );
}