// Tjekker at indholdspakken hænger sammen: alle henvisninger peger på noget, der findes.
import { describe, expect, it } from 'vitest';
import { alleDokumenter, faetre, familie, manifest, ordbog, sager } from '../src/data/indhold';
import { FAETTER_IDER, type Raekke } from '../src/data/typer';

const raekkeIder = (s: (typeof sager)[number], dokId: string): string[] => {
  const d = alleDokumenter(s).find((x) => x.id === dokId);
  if (!d) throw new Error(`mangler dokument ${dokId}`);
  if (d.husstande) return d.husstande.flatMap((h) => h.raekker.map((r) => r.id));
  if (d.personer) return d.personer.map((p) => p.id);
  return (d.raekker as Raekke[] | undefined)?.map((r) => r.id) ?? [];
};

describe('indholdspakken', () => {
  it('har fire sager i rækkefølge', () => {
    expect(sager.map((s) => s.nummer)).toEqual([1, 2, 3, 4]);
  });

  it('har fem fætre med alle replikker', () => {
    expect(faetre.map((f) => f.id)).toEqual(FAETTER_IDER);
    for (const f of faetre) {
      expect(f.replikker.fejl.length).toBeGreaterThan(0);
      expect(f.replikker.valg.dialekt).toBeTruthy();
    }
  });

  for (const s of sager) {
    describe(s.id, () => {
      it('har start- og slutreplik for alle fætre', () => {
        for (const id of FAETTER_IDER) {
          expect(s.replikker[id]?.start.rigsdansk, id).toBeTruthy();
          expect(s.replikker[id]?.slut.rigsdansk, id).toBeTruthy();
        }
      });

      it('har ord i ordbogen', () => {
        for (const ord of s.ordbog) expect(ordbog.some((o) => o.ord === ord), ord).toBe(true);
      });

      it('har gyldige trin med præcis én løsning blandt kandidaterne', () => {
        for (const t of s.trin) {
          for (const e of t.ekstra_dokumenter ?? []) expect(alleDokumenter(s).some((d) => d.id === e), e).toBe(true);
          if (t.type === 'vaelg_raekke' || t.type === 'fotogenkendelse') {
            const ider = raekkeIder(s, t.dokument);
            for (const k of t.kandidater) expect(ider, `${t.id}: ${k}`).toContain(k);
            expect(t.kandidater).toContain(t.loesning);
            for (const k of t.kandidater.filter((k) => k !== t.loesning)) {
              expect(t.feedback_forkert[k], `${s.id}/${t.id}: forklaring for ${k}`).toBeTruthy();
            }
          }
          if (t.type === 'udelukkelse') {
            const ider = t.kandidater.map((k) => k.id);
            expect(ider).toContain(t.loesning);
            for (const k of ider.filter((k) => k !== t.loesning)) expect(t.udelukkelsesgrunde[k], k).toBeTruthy();
          }
          if (t.type === 'stamtrae') {
            const st = s.stamtrae!;
            for (const slot of st.slots) {
              const kortId = t.loesning[slot.id];
              const kort = st.personkort.find((k) => k.id === kortId);
              expect(kort?.korrekt_slot, slot.id).toBe(slot.id);
            }
            for (const k of st.personkort.filter((k) => k.korrekt_slot === null)) expect(k.afvisning, k.id).toBeTruthy();
          }
        }
      });

      it('henviser kun til billeder i manifestet', () => {
        const ider = new Set(manifest.billeder.map((b) => b.id));
        expect(ider.has(s.kunde.portraet), s.kunde.portraet).toBe(true);
        if (s.afslutning) expect(ider.has(s.afslutning.beloenning.billede)).toBe(true);
        for (const d of alleDokumenter(s)) {
          if (d.billede) expect(ider.has(d.billede), d.billede).toBe(true);
          for (const p of d.personer ?? []) if (p.billede) expect(ider.has(p.billede), p.billede).toBe(true);
        }
      });
    });
  }

  it('fætrenes arvestykker findes i manifestet', () => {
    const ider = new Set(manifest.billeder.map((b) => b.id));
    for (const f of faetre) expect(ider.has(f.arvestykke.billede), f.arvestykke.billede).toBe(true);
  });

  it('familie.json har oldefars kendetegn', () => {
    expect(familie.oldefar.kendetegn).toContain('ar gennem venstre øjenbryn');
  });
});
