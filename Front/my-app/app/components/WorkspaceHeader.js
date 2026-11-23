"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function WorkspaceHeader({ activeScreen }) {
  const router = useRouter();

  function logout() {
    localStorage.removeItem("cifra-token");
    router.push("/login");
  }

  return (
    <>
      <header className="workspace-header">
        <div>
          <h1 className="eyebrow">♦ ♠ ♥ ♣</h1>
          <p className="eyebrow">BARALHO DE CESAR</p>
          <h1>Central de mensagens</h1>
        </div>
        <button className="logout-button" type="button" onClick={logout}>Sair</button>
      </header>

      <nav className="workspace-nav" aria-label="Operações">
        <Link className={activeScreen === "encrypt" ? "nav-option active" : "nav-option"} href="/criptografar">Criptografar</Link>
        <Link className={activeScreen === "decrypt" ? "nav-option active" : "nav-option"} href="/descriptografar">Descriptografar</Link>
      </nav>
    </>
  );
}
