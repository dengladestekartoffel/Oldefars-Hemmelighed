// Udviklerside: viser al grafik, så stilen kan godkendes. Kun i udviklingstilstand (/#galleri).

import { svgTilDataUrl } from '../grafik/foto';
import { bryllupsfoto1925, gruppefoto1916, SOLDATER_1916 } from '../grafik/fotos';
import { traekFraParametre } from '../grafik/ansigt/traek';
import { UDTRYK } from '../grafik/ansigt/typer';
import { personBeskrivelse, personer, personParam, portraetSvg } from '../grafik/personer';
import './galleri.css';

const FAETRE = ['mads', 'jp', 'kasper', 'soeren', 'anders'];

function Billede({ svg, alt, bred }: { svg: string; alt: string; bred?: boolean }) {
  return <img class={bred ? 'bred' : ''} src={svgTilDataUrl(svg)} alt={alt} />;
}

function Kort({ person, version, foto, titel }: { person: string; version?: string; foto?: boolean; titel?: string }) {
  const p = personParam(person, version);
  return (
    <figure class="kort">
      <Billede svg={portraetSvg(person, { version, foto })} alt={personBeskrivelse(person, version)} />
      <figcaption>
        <b>{titel ?? personer[person].navn}</b>
        {version && <span> · {version}</span>}
        <small>{traekFraParametre(p).join(' · ') || '–'}</small>
      </figcaption>
    </figure>
  );
}

export function Galleri() {
  return (
    <div class="galleri">
      <h1>Grafikgalleri</h1>
      <p class="note">Alt er tegnet som SVG i koden. Kun synligt i udviklingstilstand.</p>

      <h2>De fem fætre</h2>
      <div class="raekke">{FAETRE.map((f) => <Kort person={f} />)}</div>

      <h2>Udtryk</h2>
      {FAETRE.map((f) => (
        <div class="raekke lille">
          {UDTRYK.map((u) => (
            <figure class="kort">
              <Billede svg={portraetSvg(f, { udtryk: u })} alt={`${personer[f].navn}, ${u}`} />
              <figcaption><small>{personer[f].navn} – {u}</small></figcaption>
            </figure>
          ))}
        </div>
      ))}

      <h2>Oldefar gennem livet</h2>
      <div class="raekke">
        <Kort person="oldefar" titel="Reference" />
        <Kort person="oldefar" version="1916" foto />
        <Kort person="oldefar" version="1925" foto />
        <Kort person="oldefar" version="1945" foto />
        <Kort person="morfar" />
      </div>

      <h2>De seks soldater, Ballum 1916</h2>
      <div class="raekke">
        {SOLDATER_1916.map((s) => (
          <Kort person={s.person} version={s.version} foto titel={`${s.plads}. ${personer[s.person].navn.split(' (')[0]}`} />
        ))}
      </div>

      <h2>Gruppefoto, Ballum 1916</h2>
      <Billede bred svg={gruppefoto1916()} alt="Gruppefoto af seks unge soldater foran en kirkemur, Ballum 1916." />
      <h3>JP's arvestykke – plads 3 klippet ud</h3>
      <Billede bred svg={gruppefoto1916({ udklippet: true })} alt="Samme gruppefoto, hvor ansigtet på plads 3 er klippet ud." />

      <h2>Bryllupsfoto, Ribe 1925</h2>
      <Billede bred svg={bryllupsfoto1925()} alt="Bryllupsfoto: Karen Marie Bundgaard og »Jens Peder Iversen«." />

      <h2>Kunder og andre</h2>
      <div class="raekke">
        <Kort person="bodil" />
        <Kort person="linda" />
        <Kort person="karl_erik" />
        <Kort person="karen_marie" foto />
        <Kort person="ane_kirstine" foto />
        <Kort person="christen_nielsen" foto />
        <Kort person="niels_bundgaard" foto />
      </div>
    </div>
  );
}
