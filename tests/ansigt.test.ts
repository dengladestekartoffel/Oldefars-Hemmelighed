// Ansigtsgeneratoren: arret sidder altid rigtigt, og trækkene i sag 4 kan ses.
import { describe, expect, it } from 'vitest';
import { DOMParser } from '@xmldom/xmldom';
import { arLinje, geometri, tegnPerson } from '../src/grafik/ansigt/tegn';
import { beskrivAnsigt, traekFraParametre } from '../src/grafik/ansigt/traek';
import { UDTRYK } from '../src/grafik/ansigt/typer';
import { gruppefoto1916, bryllupsfoto1925, SOLDATER_1916 } from '../src/grafik/fotos';
import { personer, personFraManifest, personParam, portraetSvg } from '../src/grafik/personer';
import { tokens } from '../src/grafik/stil';
import { faetre, familie, manifestBillede, sag } from '../src/data/indhold';
import type { FotoPerson, FotogenkendelseTrin } from '../src/data/typer';

const T = tokens();

/** Træk, der skal kunne SES i SVG'en – oversat til de data-attributter, tegneren sætter. */
function synligeMarkoerer(traek: string): string[] {
  switch (traek) {
    case 'kløft i hagen': return ['data-traek="kloeft"'];
    case 'udstående ører': return ['data-traek="oerer-udstaaende"'];
    case 'små ører': return ['data-traek="oerer-smaa"'];
    case 'ar gennem venstre øjenbryn': return ['data-ar="venstre_bryn"'];
    case 'ar gennem højre øjenbryn': return ['data-ar="hoejre_bryn"'];
    case 'ar over overlæben': return ['data-ar="overlaebe"'];
    case 'overskæg': return ['data-traek="skaeg-'];
    case 'mørkt overskæg': return ['data-traek="skaeg-'];
    case 'runde briller': return ['data-traek="briller-runde"'];
    case 'lyst hår': case 'mørkt hår': return ['data-traek="haar"'];
    case 'smalt ansigt': case 'rundt ansigt': return ['data-del="hoved"'];
    default: throw new Error(`Ukendt træk i test: ${traek}`);
  }
}

const sag4 = sag('sag4');
const gruppe = sag4.dokumenter.find((d) => d.id === 'foto_ballum_1916')!;
const bryllup = sag4.dokumenter.find((d) => d.id === 'foto_bryllup_1925')!;

function paramFor(_fp: FotoPerson, billede: string) {
  const mb = manifestBillede(billede)!;
  const pv = personFraManifest(mb.tags)!;
  expect(pv, billede).toBeTruthy();
  return personParam(pv.person, pv.version);
}

describe('oldefars ar', () => {
  const versioner = [undefined, ...Object.keys(personer.oldefar.aldre ?? {})];
  for (const v of versioner) {
    it(`sidder i hans VENSTRE øjenbryn = til højre i billedet (${v ?? 'grund'})`, () => {
      for (const u of UDTRYK) {
        const p = personParam('oldefar', v, { udtryk: u });
        expect(p.ar).toBe('venstre_bryn');
        const l = arLinje(geometri(p), p)!;
        expect(l.x1).toBeGreaterThan(100);
        expect(l.x2).toBeGreaterThan(100);
        // og over øjet, på brynets højde
        const g = geometri(p);
        expect(Math.min(l.y1, l.y2)).toBeLessThan(g.browY);
        expect(Math.max(l.y1, l.y2)).toBeGreaterThan(g.browY);
        const svg = tegnPerson(p, T, 'x').krop;
        const m = svg.match(/data-ar="venstre_bryn" data-x1="([\d.]+)" data-x2="([\d.]+)"/);
        expect(m).toBeTruthy();
        expect(Number(m![1])).toBeGreaterThan(100);
        expect(Number(m![2])).toBeGreaterThan(100);
      }
    });
  }

  it('Jørgen Nissens ar sidder i hans HØJRE øjenbryn = til venstre i billedet', () => {
    const p = personParam('joergen_nissen');
    const l = arLinje(geometri(p), p)!;
    expect(l.x1).toBeLessThan(100);
    expect(l.x2).toBeLessThan(100);
  });

  it('morfar og fætrene har intet ar', () => {
    for (const id of ['morfar', 'mads', 'jp', 'kasper', 'soeren', 'anders']) {
      expect(personParam(id).ar, id).toBeNull();
      expect(portraetSvg(id)).not.toContain('data-traek="ar"');
    }
  });
});

describe('sag 4: trækkene ses på de tegnede ansigter', () => {
  const alle: [FotoPerson, string][] = [
    ...gruppe.personer!.map((p) => [p, p.billede!] as [FotoPerson, string]),
    [bryllup.personer!.find((p) => p.id === 'brudgom')!, bryllup.billede!],
  ];
  for (const [fp, billede] of alle) {
    it(`${fp.navn} (${billede})`, () => {
      const p = paramFor(fp, billede);
      const vist = traekFraParametre(p);
      for (const t of fp.traek) expect(vist, `${fp.navn}: ${t}`).toContain(t);
      const svg = tegnPerson(p, T, 'x').krop;
      for (const t of fp.traek) for (const m of synligeMarkoerer(t)) expect(svg, `${fp.navn}: ${t}`).toContain(m);
      // manifestets træk for samme billede skal også passe
      const mb = manifestBillede(billede)!;
      for (const t of mb.tags.traek ?? []) expect(vist, `manifest ${billede}: ${t}`).toContain(t);
    });
  }

  it('kun plads 3 matcher brudgommen på de afgørende træk', () => {
    const trin = sag4.trin.find((t) => t.type === 'fotogenkendelse') as FotogenkendelseTrin;
    const afgoerende = ['kløft i hagen', 'udstående ører', 'ar gennem venstre øjenbryn'];
    const brudgom = traekFraParametre(paramFor(bryllup.personer![0], bryllup.billede!));
    for (const a of afgoerende) expect(brudgom).toContain(a);
    const match = gruppe.personer!.filter((fp) => {
      const vist = traekFraParametre(paramFor(fp, fp.billede!));
      return afgoerende.every((a) => vist.includes(a));
    });
    expect(match.map((m) => m.id)).toEqual([trin.loesning]);
  });

  it('gruppefotoet har soldaterne i sagens rækkefølge, og kun plads 3 har ar i venstre bryn', () => {
    expect(SOLDATER_1916.map((s) => s.plads)).toEqual(gruppe.personer!.map((p) => p.plads));
    for (const s of SOLDATER_1916) {
      const fp = gruppe.personer!.find((p) => p.plads === s.plads)!;
      const pv = personFraManifest(manifestBillede(fp.billede!)!.tags)!;
      expect(pv.person).toBe(s.person);
    }
    const svg = gruppefoto1916();
    const dele = svg.split('data-plads="').slice(1);
    const medAr = dele.filter((d) => d.split('data-plads=')[0].includes('data-ar="venstre_bryn"')).map((d) => d[0]);
    expect(medAr).toEqual(['3']);
  });

  it('bryllupsfotoet viser brudgommen med arret i venstre bryn', () => {
    const svg = bryllupsfoto1925();
    const gom = svg.split('data-person-rolle="brudgom"')[1];
    expect(gom).toContain('data-ar="venstre_bryn"');
    expect(gom).toContain('data-traek="kloeft"');
  });
});

describe('slægtslighed', () => {
  it('fætrene har de arvelige træk, faetre.json angiver', () => {
    for (const f of faetre) {
      const vist = traekFraParametre(personParam(f.id));
      for (const t of f.arvelige_traek) expect(vist, `${f.id}: ${t}`).toContain(t);
    }
  });
  it('morfar har de arvelige træk, familie.json angiver', () => {
    const vist = traekFraParametre(personParam('morfar'));
    for (const t of familie.morfar.arvelige_traek) expect(vist).toContain(t);
  });
  it('oldefar har alle arvelige træk og kendetegn i alle aldre', () => {
    for (const v of ['1916', '1925']) {
      const vist = traekFraParametre(personParam('oldefar', v));
      for (const t of [...familie.oldefar.arvelige_traek, ...familie.oldefar.kendetegn]) expect(vist, `${v}: ${t}`).toContain(t);
    }
    const ældre = traekFraParametre(personParam('oldefar', '1945'));
    for (const t of ['kløft i hagen', 'udstående ører', ...familie.oldefar.kendetegn]) expect(ældre).toContain(t);
  });
});

describe('skærmlæsertekst', () => {
  it('beskriver oldefars ar', () => {
    expect(beskrivAnsigt(personParam('oldefar', '1925'))).toContain('ar gennem venstre øjenbryn');
  });
});

describe('alle personer kan tegnes som gyldig SVG', () => {
  for (const id of Object.keys(personer)) {
    it(id, () => {
      for (const v of [undefined, ...Object.keys(personer[id].aldre ?? {})]) {
        const svg = portraetSvg(id, { version: v });
        expect(svg.startsWith('<svg')).toBe(true);
        // ingen attributter uden værdi eller ugyldige navne
        expect(svg).not.toMatch(/"[a-z-]+=/);
        expect(svg).not.toMatch(/NaN|undefined/);
        gyldigXml(svg);
      }
    });
  }
});

function gyldigXml(svg: string) {
  const fejl: string[] = [];
  new DOMParser({ onError: (_niveau: string, besked: string) => fejl.push(besked) }).parseFromString(svg, 'image/svg+xml');
  expect(fejl).toEqual([]);
}

describe('fotos er gyldig SVG', () => {
  it('gruppefoto, udklippet gruppefoto og bryllupsfoto', () => {
    gyldigXml(gruppefoto1916());
    gyldigXml(gruppefoto1916({ udklippet: true }));
    gyldigXml(bryllupsfoto1925());
  });
});
