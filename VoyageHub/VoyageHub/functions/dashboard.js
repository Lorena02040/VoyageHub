import { useState } from "react";
import { Menu } from "lucide-react";

export default function Dashboard() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex h-screen">
      {/* Menu lateral principal */}
      <aside className="hidden md:flex w-64 bg-gray-900 text-white p-4">
        <p>Menu Principal</p>
      </aside>

      {/* Conteúdo + Header */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between bg-gray-100 p-4 shadow">
          <h1 className="text-xl font-bold">Dashboard</h1>

          {/* Botão só aparece em telas pequenas */}
          <button 
            className="md:hidden p-2 bg-gray-200 rounded"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Menu />
          </button>
        </header>

        {/* Conteúdo principal */}
        <main className="flex-1 p-4">
          <p>Conteúdo aqui...</p>
        </main>
      </div>

      {/* Menu lateral secundário */}
      <aside 
        className={`
          fixed md:static top-0 right-0 h-full w-64 bg-gray-200 p-4 shadow-lg 
          transform transition-transform 
          ${menuOpen ? "translate-x-0" : "translate-x-full"} 
          md:translate-x-0
        `}
      >
        <p>Menu Secundário</p>
      </aside>
    </div>
  );
}
