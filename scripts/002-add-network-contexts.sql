-- Tabela de contextos de rede
CREATE TABLE IF NOT EXISTS network_contexts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL, -- Ex: Casa, Trabalho
  ip_range TEXT NOT NULL, -- Ex: 192.168.0.0/24 ou um IP específico
  context_slug TEXT NOT NULL, -- Ex: home, work
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_network_contexts_user ON network_contexts(user_id);

-- Adicionar campo context_id na tabela tasks (SQLite não suporta ADD COLUMN com FOREIGN KEY diretamente em versões antigas, mas aqui usaremos apenas a referência lógica por enquanto ou recriaremos se necessário. Para simplicidade, adicionamos a coluna)
ALTER TABLE tasks ADD COLUMN network_context_id TEXT REFERENCES network_contexts(id) ON DELETE SET NULL;
