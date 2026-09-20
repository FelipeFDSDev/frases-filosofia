import { useMemo, useState } from 'react'
import './App.css'

type Mood = 'Todos' | 'Coragem' | 'Melancolia' | 'Presença' | 'Raiva' | 'Esperança'

type Quote = {
  id: number
  text: string
  author: string
  work: string
  mood: Exclude<Mood, 'Todos'>
  accent: string
}

const moods: Mood[] = ['Todos', 'Coragem', 'Melancolia', 'Presença', 'Raiva', 'Esperança']

const quotes: Quote[] = [
  { id: 1, text: 'A vida não é um problema a ser resolvido, mas uma realidade a ser experimentada.', author: 'Søren Kierkegaard', work: 'Diários', mood: 'Presença', accent: 'terracotta' },
  { id: 2, text: 'Aquele que tem um porquê para viver pode suportar quase qualquer como.', author: 'Friedrich Nietzsche', work: 'Crepúsculo dos Ídolos', mood: 'Coragem', accent: 'ochre' },
  { id: 3, text: 'A tristeza é apenas uma parede entre dois jardins.', author: 'Khalil Gibran', work: 'Areia e Espuma', mood: 'Melancolia', accent: 'sage' },
  { id: 4, text: 'Não é porque as coisas são difíceis que não ousamos. É porque não ousamos que elas parecem difíceis.', author: 'Sêneca', work: 'Cartas a Lucílio', mood: 'Coragem', accent: 'ink' },
  { id: 5, text: 'O que perturba os homens não são as coisas, mas os julgamentos sobre as coisas.', author: 'Epicteto', work: 'Manual', mood: 'Raiva', accent: 'clay' },
  { id: 6, text: 'A esperança é um sonho acordado.', author: 'Aristóteles', work: 'Retórica', mood: 'Esperança', accent: 'blue' },
  { id: 7, text: 'Você tem poder sobre sua mente, não sobre os acontecimentos. Perceba isso e encontrará força.', author: 'Marco Aurélio', work: 'Meditações', mood: 'Raiva', accent: 'sage' },
  { id: 8, text: 'A felicidade da sua vida depende da qualidade dos seus pensamentos.', author: 'Marco Aurélio', work: 'Meditações', mood: 'Presença', accent: 'ochre' },
  { id: 9, text: 'A coragem é saber o que não temer.', author: 'Platão', work: 'A República', mood: 'Coragem', accent: 'ink' },
  { id: 10, text: 'A vida deve ser compreendida para trás, mas vivida para frente.', author: 'Søren Kierkegaard', work: 'Diários', mood: 'Melancolia', accent: 'terracotta' },
  { id: 11, text: 'O essencial é invisível aos olhos.', author: 'Antoine de Saint-Exupéry', work: 'O Pequeno Príncipe', mood: 'Presença', accent: 'blue' },
  { id: 12, text: 'Não há caminho para a paz. A paz é o caminho.', author: 'Mahatma Gandhi', work: 'Pensamentos', mood: 'Esperança', accent: 'sage' },
  { id: 13, text: 'A liberdade é o direito de dizer às pessoas o que elas não querem ouvir.', author: 'George Orwell', work: 'A Revolução dos Bichos', mood: 'Coragem', accent: 'clay' },
  { id: 14, text: 'A pior solidão não é estar só, mas sentir-se sozinho quando se está entre outros.', author: 'Hannah Arendt', work: 'Origens do Totalitarismo', mood: 'Melancolia', accent: 'blue' },
  { id: 15, text: 'O homem está condenado a ser livre; condenado porque não criou a si próprio.', author: 'Jean-Paul Sartre', work: 'O Ser e o Nada', mood: 'Coragem', accent: 'ink' },
  { id: 16, text: 'No meio do inverno, descobri que havia, dentro de mim, um verão invencível.', author: 'Albert Camus', work: 'O Avesso e o Direito', mood: 'Esperança', accent: 'ochre' },
  { id: 17, text: 'A verdadeira viagem de descoberta consiste em ter novos olhos.', author: 'Marcel Proust', work: 'Em Busca do Tempo Perdido', mood: 'Presença', accent: 'terracotta' },
  { id: 18, text: 'Conhecer a si mesmo é o começo de toda sabedoria.', author: 'Aristóteles', work: 'Ética a Nicômaco', mood: 'Presença', accent: 'sage' },
  { id: 19, text: 'A alegria é a passagem do homem de uma perfeição menor para uma maior.', author: 'Baruch Spinoza', work: 'Ética', mood: 'Esperança', accent: 'blue' },
  { id: 20, text: 'Quanto mais um homem se aproxima de uma mente tranquila, mais perto está da força.', author: 'James Allen', work: 'Como um Homem Pensa', mood: 'Raiva', accent: 'ochre' },
  { id: 21, text: 'A única maneira de lidar com um mundo sem liberdade é tornar-se tão absolutamente livre que sua própria existência seja um ato de rebeldia.', author: 'Albert Camus', work: 'O Mito de Sísifo', mood: 'Raiva', accent: 'clay' },
  { id: 22, text: 'A imaginação é mais importante que o conhecimento. O conhecimento é limitado.', author: 'Albert Einstein', work: 'Ideias e Opiniões', mood: 'Esperança', accent: 'blue' },
  { id: 23, text: 'Aquele que conhece os outros é sábio; aquele que conhece a si mesmo é iluminado.', author: 'Lao-Tsé', work: 'Tao Te Ching', mood: 'Presença', accent: 'sage' },
  { id: 24, text: 'O homem que move uma montanha começa carregando pequenas pedras.', author: 'Confúcio', work: 'Analectos', mood: 'Coragem', accent: 'ochre' },
  { id: 25, text: 'O que você procura está procurando você.', author: 'Rumi', work: 'Poemas', mood: 'Esperança', accent: 'terracotta' },
  { id: 26, text: 'A vida é uma série de escolhas. Nenhuma escolha é neutra.', author: 'Simone de Beauvoir', work: 'A Ética da Ambiguidade', mood: 'Coragem', accent: 'ink' },
  { id: 27, text: 'A atenção é a forma mais rara e pura de generosidade.', author: 'Simone Weil', work: 'A Gravidade e a Graça', mood: 'Presença', accent: 'sage' },
  { id: 28, text: 'A educação é um ato de amor e, por isso, um ato de coragem.', author: 'Paulo Freire', work: 'Pedagogia do Oprimido', mood: 'Esperança', accent: 'clay' },
  { id: 29, text: 'A tristeza é uma emoção tão legítima quanto a alegria; escutá-la também é uma forma de cuidado.', author: 'bell hooks', work: 'Tudo Sobre o Amor', mood: 'Melancolia', accent: 'blue' },
  { id: 30, text: 'A nossa ansiedade não vem de pensar no futuro, mas de querer controlá-lo.', author: 'Khalil Gibran', work: 'O Profeta', mood: 'Raiva', accent: 'terracotta' },
]

function App() {
  const [activeMood, setActiveMood] = useState<Mood>('Todos')
  const [search, setSearch] = useState('')
  const [saved, setSaved] = useState<number[]>([2])

  const filteredQuotes = useMemo(() => quotes.filter((quote) => {
    const matchesMood = activeMood === 'Todos' || quote.mood === activeMood
    const query = search.toLowerCase()
    const matchesSearch = !query || `${quote.text} ${quote.author} ${quote.work}`.toLowerCase().includes(query)
    return matchesMood && matchesSearch
  }), [activeMood, search])

  const toggleSaved = (id: number) => {
    setSaved((current) => current.includes(id) ? current.filter((quoteId) => quoteId !== id) : [...current, id])
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Entrelinhas, início"><span className="brand-mark">∴</span><span>entrelinhas</span></a>
        <nav className="main-nav" aria-label="Navegação principal">
          <a className="active" href="#explorar">Explorar</a>
          <a href="#autores">Autores</a>
          <a href="#sobre">Sobre o projeto</a>
        </nav>
        <button className="saved-button" type="button" onClick={() => setActiveMood('Todos')}><span className="bookmark-icon">♡</span> Minha coleção <span className="saved-count">{saved.length}</span></button>
      </header>

      <main id="inicio">
        <section className="intro" id="explorar">
          <div className="intro-copy">
            <p className="eyebrow">Um lugar para pensar devagar</p>
            <h1>Palavras que<br /><em>ficam.</em></h1>
            <p className="intro-text">Ideias de quem dedicou a vida a perguntar. Encontre uma frase para o momento que você está vivendo.</p>
          </div>
          <div className="orbit-art" aria-hidden="true"><span className="orbit orbit-one" /><span className="orbit orbit-two" /><span className="orbit-dot" /><span className="orbit-label">desde<br />470 a.C.</span></div>
        </section>

        <section className="toolbar" aria-label="Filtros de frases">
          <div className="toolbar-heading"><span className="section-number">01</span><h2>Como você está hoje?</h2></div>
          <div className="filter-row">
            <div className="mood-filters">{moods.map((mood) => <button key={mood} type="button" className={activeMood === mood ? 'mood-chip selected' : 'mood-chip'} onClick={() => setActiveMood(mood)}>{mood}</button>)}</div>
            <label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por autor ou palavra" aria-label="Buscar por autor ou palavra" /></label>
          </div>
        </section>

        <section className="content-grid">
          <div className="quote-list">
            <div className="results-header"><p><strong>{filteredQuotes.length}</strong> pensamentos encontrados</p><button className="sort-button" type="button">Mais recentes <span>⌄</span></button></div>
            {filteredQuotes.map((quote, index) => <article className={`quote-card ${quote.accent}`} key={quote.id}>
              <div className="quote-index">{String(index + 1).padStart(2, '0')}</div>
              <div className="quote-body"><blockquote>“{quote.text}”</blockquote><p className="quote-meta"><strong>{quote.author}</strong><span>{quote.work}</span></p></div>
              <button className="save-quote" type="button" onClick={() => toggleSaved(quote.id)} aria-label={saved.includes(quote.id) ? 'Remover dos favoritos' : 'Salvar nos favoritos'}>{saved.includes(quote.id) ? '♥' : '♡'}</button>
            </article>)}
            {filteredQuotes.length === 0 && <div className="empty-state">Nenhum pensamento encontrou esse caminho. Tente outra palavra.</div>}
          </div>

          <aside className="daily-note" id="autores"><div className="note-top"><span className="section-number">02</span><span>Leitura do dia</span></div><div className="note-glyph">“</div><p className="note-quote">Conhece-te a ti mesmo.</p><p className="note-author">— Inscrição no templo de Apolo<br /><span>atribuída a Sócrates</span></p><div className="note-divider" /><p className="note-reflection">Antes de procurar respostas no mundo, que pergunta você faria a si mesmo?</p><button className="read-button" type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Ler outra reflexão <span>↗</span></button></aside>
        </section>
      </main>
      <footer id="sobre"><span>entrelinhas © 2026</span><span>Feito para quem ainda se permite perguntar.</span><span>GitHub Actions · pipeline ativa</span></footer>
    </div>
  )
}

export default App
