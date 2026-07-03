import { describe, it, expect } from "vitest";

import {
  getSelectionStateRank,
  sortSelectionGroupsByRank,
} from "./stati-selezione";

describe("getSelectionStateRank", () => {
  it("mette 'no match' in cima, sopra ogni altro stato", () => {
    const noMatch = getSelectionStateRank("no match");
    for (const stato of [
      "prospetto",
      "da colloquiare",
      "colloquio fatto",
      "match",
      "non selezionato",
      "archivio",
      "sconosciuto",
    ]) {
      expect(noMatch).toBeLessThan(getSelectionStateRank(stato));
    }
  });

  it("mette gli stati di archivio in fondo, sotto ogni stato attivo e sotto gli sconosciuti", () => {
    const active = [
      "no match",
      "prospetto",
      "da colloquiare",
      "colloquio fatto",
      "selezionato",
      "match",
    ];
    for (const archivio of ["non selezionato", "archivio", "nascosto - oot"]) {
      const rank = getSelectionStateRank(archivio);
      for (const stato of active) {
        expect(rank).toBeGreaterThan(getSelectionStateRank(stato));
      }
      // anche sopra gli sconosciuti
      expect(rank).toBeGreaterThan(getSelectionStateRank("pippo"));
    }
  });

  it("rispetta l'ordine funnel del tier centrale (candidati < da colloquiare < colloqui < post-colloquio)", () => {
    expect(getSelectionStateRank("prospetto")).toBeLessThan(
      getSelectionStateRank("da colloquiare"),
    );
    expect(getSelectionStateRank("da colloquiare")).toBeLessThan(
      getSelectionStateRank("colloquio fatto"),
    );
    expect(getSelectionStateRank("colloquio fatto")).toBeLessThan(
      getSelectionStateRank("match"),
    );
  });

  it("colloca gli stati sconosciuti e 'Senza stato' tra gli attivi e l'archivio", () => {
    for (const unknown of ["pippo", "Senza stato", "stato inventato"]) {
      const rank = getSelectionStateRank(unknown);
      expect(rank).toBeGreaterThan(getSelectionStateRank("match"));
      expect(rank).toBeLessThan(getSelectionStateRank("non selezionato"));
    }
  });

  it("normalizza maiuscole/underscore/spazi/accenti", () => {
    expect(getSelectionStateRank("No_Match")).toBe(getSelectionStateRank("no match"));
    expect(getSelectionStateRank("no  match")).toBe(getSelectionStateRank("no match"));
    expect(getSelectionStateRank("NON SELEZIONATO")).toBe(
      getSelectionStateRank("non selezionato"),
    );
    expect(getSelectionStateRank("Nascosto - OOT")).toBe(
      getSelectionStateRank("nascosto - oot"),
    );
  });
});

describe("sortSelectionGroupsByRank", () => {
  it("ordina i gruppi secondo lo schema a 3 tier", () => {
    const input: [string, number[]][] = [
      ["non selezionato", [1, 2, 3]],
      ["prospetto", [4]],
      ["no match", [5]],
      ["da colloquiare", [6]],
    ];
    const ordered = sortSelectionGroupsByRank(input).map(([label]) => label);
    expect(ordered).toEqual([
      "no match",
      "prospetto",
      "da colloquiare",
      "non selezionato",
    ]);
  });

  it("è stabile: gruppi con lo stesso rank mantengono l'ordine di input", () => {
    // "non selezionato", "archivio" e "nascosto - oot" hanno lo stesso rank (archivio).
    const input: [string, number[]][] = [
      ["archivio", [1]],
      ["nascosto - oot", [2]],
      ["non selezionato", [3]],
    ];
    const ordered = sortSelectionGroupsByRank(input).map(([label]) => label);
    expect(ordered).toEqual(["archivio", "nascosto - oot", "non selezionato"]);
  });

  it("non muta l'array in ingresso", () => {
    const input: [string, number[]][] = [
      ["non selezionato", [1]],
      ["no match", [2]],
    ];
    const snapshot = input.map(([label]) => label);
    sortSelectionGroupsByRank(input);
    expect(input.map(([label]) => label)).toEqual(snapshot);
  });
});
