import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { anvendPaaSiden } from './system/indstillinger';
import { hent } from './system/lager';
import { Skrivebord } from './skrivebord/Skrivebord';
import { proeveBord } from './skrivebord/proevebord';
import type { Bord } from './skrivebord/model';
import './stil.css';

anvendPaaSiden();

const NOEGLE = 'bord:proeve';

function Spil() {
  const [start, setStart] = useState<Bord | null>(null);
  useEffect(() => {
    const nulstil = new URLSearchParams(location.search).has('nyt');
    void hent<Bord>(NOEGLE).then((b) => setStart(!nulstil && b ? b : proeveBord()));
  }, []);
  if (!start) return null;
  return <Skrivebord start={start} gemNoegle={NOEGLE} />;
}

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
  return <Spil />;
}

render(<App />, document.getElementById('app')!);
