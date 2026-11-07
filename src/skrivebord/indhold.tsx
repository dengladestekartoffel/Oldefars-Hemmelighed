// Hvad man ser, når en ting åbnes: sider, faneblade og evt. bagside.
// Dokumenterne tegnes her som rigtig tekst (læsbar, skalerbar, skærmlæser-venlig).

import type { ComponentChildren, VNode } from 'preact';
import { alleDokumenter, faetre, ordbog, sag } from '../data/indhold';
import { dokumentForm, type Dokument, type Raekke, type TyskRaekke } from '../data/typer';
import { billedeUrl } from '../grafik/billeder';
import type { Ting } from './model';

export interface Side {
  id: string;
  indhold: () => VNode;
}

export type AabenArt = 'bog' | 'mappe' | 'ark' | 'foto' | 'notesblok' | 'genstand';

export interface AabenIndhold {
  titel: string;
  art: AabenArt;
  sider: Side[];
  faneblade?: { navn: string; side: number }[];
  /** Fotos: bagsiden vises ved dobbelttryk. */
  bagside?: () => VNode;
  /** Mapper: arkene kan tages ud og lægges på bordet. */
  kanUdtages?: boolean;
}

export interface Fund {
  tekst: string;
  kilde: string;
}

export interface IndholdKontekst {
  fund: Fund[];
  noter: string;
  erindringer: string[];
  saetNoter: (s: string) => void;
}

const Papir = ({ children, klasse = '' }: { children: ComponentChildren; klasse?: string }) => (
  <div class={`papir ${klasse}`}>{children}</div>
);

function raekkeTekst(kolonner: string[] | undefined, felter: string[]): string {
  return felter
    .map((f, i) => (f ? (kolonner?.[i] ? `${kolonner[i]}: ${f}` : f) : ''))
    .filter(Boolean)
    .join(' · ');
}

function Tabel({ dok, raekker }: { dok: Dokument; raekker: Raekke[] }) {
  const k = dok.kolonner ?? [];
  return (
    <div class="dok-tabel-ramme">
      <table class="dok-tabel">
        <thead>
          <tr>{k.map((c) => <th scope="col">{c}</th>)}</tr>
        </thead>
        <tbody>
          {raekker.map((r) => (
            <tr data-raekke={r.id} data-fastgoer={raekkeTekst(k, r.felter)}>
              {r.felter.map((f, i) => (
                <td data-kolonne={k[i]}>{f || ' '}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Sider for et dokument. Lange dokumenter fordeles over flere sider. */
export function dokumentSider(dok: Dokument): { sider: Side[]; faneblade?: { navn: string; side: number }[] } {
  const form = dokumentForm(dok);
  const hoved = (undertekst?: string) => (
    <header class="dok-hoved">
      <h2>{dok.titel}</h2>
      {undertekst && <p class="dok-under">{undertekst}</p>}
    </header>
  );
  switch (form) {
    case 'folketaelling': {
      const hs = dok.husstande!;
      return {
        sider: hs.map((h, i) => ({
          id: `${dok.id}-${i}`,
          indhold: () => (
            <Papir klasse="protokol">
              {hoved(`Side ${i + 1} af ${hs.length}`)}
              <p class="husstand" data-fastgoer={`${h.sted} (${dok.titel})`}>
                {h.sted}
              </p>
              <Tabel dok={dok} raekker={h.raekker} />
            </Papir>
          ),
        })),
        faneblade: hs.map((h, i) => ({ navn: kortSted(h.sted), side: i })),
      };
    }
    case 'tabel': {
      const r = dok.raekker as Raekke[];
      const pr = 3;
      const sider: Side[] = [];
      for (let i = 0; i < r.length; i += pr) {
        const del = r.slice(i, i + pr);
        sider.push({
          id: `${dok.id}-${i}`,
          indhold: () => (
            <Papir klasse="protokol">
              {hoved(r.length > pr ? `Side ${i / pr + 1} af ${Math.ceil(r.length / pr)}` : undefined)}
              <Tabel dok={dok} raekker={del} />
            </Papir>
          ),
        });
      }
      return { sider };
    }
    case 'tysk': {
      const r = dok.raekker as TyskRaekke[];
      return {
        sider: r.map((x, i) => ({
          id: `${dok.id}-${i}`,
          indhold: () => (
            <Papir klasse="tysk">
              {hoved(`Side ${i + 1} af ${r.length}`)}
              <p class="tysk-tekst" lang="de" data-fastgoer={x.dansk}>
                {x.tysk}
              </p>
              <aside class="oversaettelse">
                <strong>Oversættelse</strong>
                <p data-fastgoer={x.dansk}>{x.dansk}</p>
              </aside>
            </Papir>
          ),
        })),
      };
    }
    case 'tekst':
      return {
        sider: [
          {
            id: dok.id,
            indhold: () => (
              <Papir klasse="attest">
                {hoved()}
                <p class="attest-tekst" data-fastgoer={dok.tekst}>
                  {dok.tekst}
                </p>
              </Papir>
            ),
          },
        ],
      };
    case 'foto':
      return {
        sider: [
          {
            id: dok.id,
            indhold: () => <FotoForside billede={dok.billede!} titel={dok.titel} />,
          },
        ],
      };
  }
}

function kortSted(s: string): string {
  const m = s.match(/Matr\. ?\d+/);
  if (m) return m[0];
  return s.split(',')[0];
}

function FotoForside({ billede, titel }: { billede: string; titel: string }) {
  const url = billedeUrl(billede);
  return (
    <div class="foto-forside">
      {url ? <img src={url} alt={titel} draggable={false} /> : <div class="foto-mangler">{titel}</div>}
    </div>
  );
}

function FotoBagside({ tekst }: { tekst: string }) {
  return (
    <div class="foto-bagside">
      <p class="haandskrift" data-fastgoer={tekst}>
        {tekst}
      </p>
    </div>
  );
}

/** Indholdet af en åben ting. */
export function indholdFor(t: Ting, k: IndholdKontekst): AabenIndhold {
  const d = (t.data ?? {}) as Record<string, string | string[] | undefined>;
  const titel = t.etiket ?? t.beskrivelse ?? t.slags;
  switch (t.slags) {
    case 'bog':
    case 'ark': {
      if (d.sag && d.dokument) {
        const s = sag(d.sag as string);
        const dok = alleDokumenter(s).find((x) => x.id === d.dokument)!;
        const { sider, faneblade } = dokumentSider(dok);
        return { titel: dok.titel, art: t.slags === 'bog' ? 'bog' : 'ark', sider, faneblade };
      }
      if (d.tekst) {
        return {
          titel,
          art: 'ark',
          sider: [{ id: t.id, indhold: () => <Papir klasse="attest"><p data-fastgoer={d.tekst as string}>{d.tekst as string}</p></Papir> }],
        };
      }
      break;
    }
    case 'mappe': {
      const s = sag((d.sag as string) ?? 'sag1');
      const arkIder = (d.ark as string[] | undefined) ?? ['kunde'];
      const sider: Side[] = arkIder.map((a) =>
        a === 'kunde'
          ? {
              id: `${t.id}-kunde`,
              indhold: () => (
                <Papir klasse="brev">
                  <header class="dok-hoved">
                    <h2>{s.kunde.navn}</h2>
                    {s.kunde.fra && <p class="dok-under">{[s.kunde.alder && `${s.kunde.alder} år`, s.kunde.fra].filter(Boolean).join(', ')}</p>}
                  </header>
                  <p class="brev-tekst">{s.kunde.intro}</p>
                  {s.kunde.kundens_noter && (
                    <section class="kundens-noter">
                      <h3>Kundens noter</h3>
                      <ul>
                        {s.kunde.kundens_noter.map((n) => (
                          <li data-fastgoer={n}>{n}</li>
                        ))}
                      </ul>
                    </section>
                  )}
                  {s.opgave && (
                    <p class="opgave" data-fastgoer={s.opgave}>
                      <strong>Opgave:</strong> {s.opgave}
                    </p>
                  )}
                </Papir>
              ),
            }
          : {
              id: `${t.id}-${a}`,
              indhold: () => {
                const dok = alleDokumenter(s).find((x) => x.id === a)!;
                return dokumentSider(dok).sider[0].indhold();
              },
            },
      );
      return { titel: t.etiket ?? `Sag: ${s.titel}`, art: 'mappe', sider, kanUdtages: sider.length > 1 };
    }
    case 'foto': {
      const billede = d.billede as string;
      const bag = d.bagside as string | undefined;
      return {
        titel,
        art: 'foto',
        sider: [{ id: t.id, indhold: () => <FotoForside billede={billede} titel={titel} /> }],
        bagside: () => <FotoBagside tekst={bag ?? 'Bagsiden er tom.'} />,
      };
    }
    case 'notesblok':
      return {
        titel: 'Notesblok',
        art: 'notesblok',
        sider: [
          {
            id: 'noter',
            indhold: () => (
              <Papir klasse="notesblok-side">
                <h2>Mine noter</h2>
                <label class="skjult" for="egne-noter">Mine noter</label>
                <textarea
                  id="egne-noter"
                  class="egne-noter"
                  value={k.noter}
                  placeholder="Skriv dine egne noter her …"
                  onInput={(e) => k.saetNoter((e.target as HTMLTextAreaElement).value)}
                />
              </Papir>
            ),
          },
          {
            id: 'fund',
            indhold: () => (
              <Papir klasse="notesblok-side">
                <h2>Fastgjorte fund</h2>
                {k.fund.length === 0 ? (
                  <p class="tom">Tryk og hold på en linje i et dokument for at fastgøre den her.</p>
                ) : (
                  <ul class="sedler">
                    {k.fund.map((f) => (
                      <li class="seddel">
                        <span>{f.tekst}</span>
                        <small>{f.kilde}</small>
                      </li>
                    ))}
                  </ul>
                )}
              </Papir>
            ),
          },
          {
            id: 'morfar',
            indhold: () => (
              <Papir klasse="notesblok-side">
                <h2>Morfars erindringer</h2>
                {k.erindringer.length === 0 ? (
                  <p class="tom">Når du har løst en sag, husker morfar måske noget.</p>
                ) : (
                  <ul class="erindringer">
                    {k.erindringer.map((e) => (
                      <li>{e}</li>
                    ))}
                  </ul>
                )}
              </Papir>
            ),
          },
        ],
        faneblade: [
          { navn: 'Noter', side: 0 },
          { navn: 'Fund', side: 1 },
          { navn: 'Morfar', side: 2 },
        ],
      };
    case 'ordbog': {
      const sorteret = [...ordbog].sort((a, b) => a.ord.localeCompare(b.ord, 'da'));
      const pr = 5;
      const sider: Side[] = [];
      const faneblade: { navn: string; side: number }[] = [];
      for (let i = 0; i < sorteret.length; i += pr) {
        const del = sorteret.slice(i, i + pr);
        const bogstav = del[0].ord[0].toUpperCase();
        if (!faneblade.some((f) => f.navn === bogstav)) faneblade.push({ navn: bogstav, side: sider.length });
        sider.push({
          id: `ordbog-${i}`,
          indhold: () => (
            <Papir klasse="ordbog-side">
              <dl>
                {del.map((o) => (
                  <>
                    <dt data-fastgoer={`${o.ord}: ${o.forklaring}`}>{o.ord}</dt>
                    <dd>{o.forklaring}</dd>
                  </>
                ))}
              </dl>
            </Papir>
          ),
        });
      }
      return { titel: 'Ordbog', art: 'bog', sider, faneblade };
    }
    case 'arvestykke': {
      const f = faetre.find((x) => x.arvestykke.id === d.arvestykke) ?? faetre[0];
      const url = billedeUrl(f.arvestykke.billede);
      return {
        titel: f.arvestykke.navn,
        art: 'genstand',
        sider: [
          {
            id: t.id,
            indhold: () => (
              <Papir klasse="genstand">
                <h2>{f.arvestykke.navn}</h2>
                {url && <img class="genstand-billede" src={url} alt={f.arvestykke.navn} />}
                <p data-fastgoer={f.arvestykke.beskrivelse}>{f.arvestykke.beskrivelse}</p>
              </Papir>
            ),
          },
        ],
      };
    }
  }
  return {
    titel,
    art: 'genstand',
    sider: [{ id: t.id, indhold: () => <Papir klasse="genstand"><h2>{titel}</h2><p>{t.beskrivelse ?? ''}</p></Papir> }],
  };
}
