// Startopstilling af skrivebordet. Bruges indtil sagerne lægger deres egne ting frem.

import type { FaetterId } from '../data/typer';
import { faetter } from '../data/indhold';
import { billedeMaal } from '../grafik/billeder';
import { nytBord, type Bord, type Ting } from './model';

export function faste(): Ting[] {
  return [
    { id: 'lampe', slags: 'lampe', x: 24, y: 24, w: 240, h: 240, rot: 0, z: 0, fast: true, form: 'rund', beskrivelse: 'Skrivebordslampe med hint-pære' },
    { id: 'indbakke', slags: 'indbakke', x: 660, y: 20, w: 320, h: 240, rot: 2, z: 0, fast: true, beskrivelse: 'Indbakke' },
    { id: 'papirkurv', slags: 'papirkurv', x: 820, y: 1320, w: 170, h: 170, rot: 0, z: 0, fast: true, form: 'rund', beskrivelse: 'Papirkurv' },
    { id: 'skuffe', slags: 'skuffe', x: 320, y: 1412, w: 360, h: 80, rot: 0, z: 0, fast: true, beskrivelse: 'Skrivebordsskuffe' },
  ];
}

export function proeveBord(fid: FaetterId = 'mads'): Bord {
  const f = faetter(fid);
  const foto = billedeMaal('oldefar_bryllup_1925');
  const ting: Ting[] = [
    ...faste(),
    { id: 'mappe-sag1', slags: 'mappe', x: 300, y: 290, w: 300, h: 380, rot: -4, z: 3, etiket: 'Bodil Kjær', beskrivelse: 'Kundemappe: Bodil Kjær', data: { sag: 'sag1', ark: ['kunde', 'kb_hviding_1853_1855'] } },
    { id: 'bog-ft1880', slags: 'bog', x: 60, y: 330, w: 280, h: 360, rot: 3, z: 2, etiket: 'Folketælling 1880', beskrivelse: 'Protokol: Folketælling 1880, Vilslev', data: { sag: 'sag1', dokument: 'ft1880_vilslev', farve: '#2f4f6b' } },
    { id: 'bog-kb-hviding', slags: 'bog', x: 620, y: 330, w: 280, h: 360, rot: -2, z: 4, etiket: 'Hviding kirkebog', beskrivelse: 'Kirkebog: Hviding 1853–1855', data: { sag: 'sag1', dokument: 'kb_hviding_1853_1855', farve: '#6b2f2a' } },
    { id: 'foto-bryllup', slags: 'foto', x: 560, y: 760, w: foto.w, h: foto.h, rot: 6, z: 5, etiket: undefined, beskrivelse: 'Bryllupsfoto, Ribe 1925', data: { billede: 'oldefar_bryllup_1925', bagside: 'Karen Marie og Jens Peder. Ribe, 16. maj 1925.' } },
    { id: 'notesblok', slags: 'notesblok', x: 70, y: 760, w: 240, h: 320, rot: -5, z: 6, beskrivelse: 'Notesblok', kanKasseres: false, data: {} },
    { id: 'ordbog', slags: 'ordbog' as Ting['slags'], x: 330, y: 820, w: 190, h: 250, rot: 4, z: 7, etiket: 'Ordbog', beskrivelse: 'Ordbog over gamle ord', kanKasseres: false },
    { id: 'lup', slags: 'lup', x: 360, y: 1110, w: 180, h: 180, rot: 0, z: 8, form: 'rund', beskrivelse: 'Lup' },
    { id: 'stempel', slags: 'stempel', x: 120, y: 1130, w: 130, h: 160, rot: -8, z: 9, beskrivelse: 'FUNDET-stempel', kanAabnes: false },
    { id: 'roedblyant', slags: 'roedblyant', x: 560, y: 1180, w: 320, h: 44, rot: -14, z: 10, beskrivelse: 'Rødblyant', kanAabnes: false },
    { id: 'kaffekop', slags: 'kaffekop', x: 820, y: 1080, w: 150, h: 150, rot: 0, z: 11, form: 'rund', beskrivelse: 'Kaffekop', kanAabnes: false },
    { id: 'telefon', slags: 'telefon', x: 40, y: 1250, w: 150, h: 260, rot: 8, z: 12, beskrivelse: 'Telefon: ring til morfar og familiechatten', kanKasseres: false },
    { id: 'arvestykke', slags: 'arvestykke', x: 400, y: 1200, w: 220, h: 220, rot: -6, z: 13, iSkuffe: true, kanKasseres: false, etiket: undefined, beskrivelse: f.arvestykke.navn, data: { arvestykke: f.arvestykke.id, billede: f.arvestykke.billede } },
  ];
  return nytBord(ting);
}
