import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import './stil.css';

function App() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const fn = () => setHash(location.hash);
    addEventListener('hashchange', fn);
    return () => removeEventListener('hashchange', fn);
  }, []);
  const [Galleri, setGalleri] = useState<null | (() => preact.JSX.Element)>(null);
  useEffect(() => {
    // Grafikgalleriet findes kun i udviklingstilstand.
    if (import.meta.env.DEV && hash === '#galleri') {
      import('./galleri/Galleri').then((m) => setGalleri(() => m.Galleri));
    }
  }, [hash]);
  if (import.meta.env.DEV && hash === '#galleri') return Galleri ? <Galleri /> : <p class="midt">Henter galleri…</p>;
  return (
    <main class="midt">
      <h1>Oldefars Hemmelighed</h1>
      <p>Spillet er under opbygning.</p>
    </main>
  );
}

render(<App />, document.getElementById('app')!);
