# `matchSchools` – Abgleich JedeSchule ↔ OSM

Implementierung: [`scripts/lib/match.ts`](../scripts/lib/match.ts), Funktion `matchSchools`.

**Eingaben:** `OfficialInput[]` (eine Bundesland-Slice), `OsmSchoolInput[]` (aus dem GeoJSON-Slice desselben Landes), `MatchSchoolsOptions` mit `osmStateByKey` (jedes OSM-Objekt → `StateCode`).

**Ausgabe:** `MatchRowOut[]` mit Kategorien u. a. `matched`, `official_only`, `osm_only`, `match_ambiguous`, `official_no_coord`.

Die Logik ist **bundesland-lokal**: z. B. `officialsNearOsm` berücksichtigt nur Amts-Schulen desselben Landes wie das OSM-Objekt (`MATCH_RADIUS_KM`).

Einige Officials haben Nominatim-Punkte (`coord_source: nominatim`) statt fehlender Land-Koordinaten. Sie laufen dann durch die 150 m Distanz- und `ref`-Pässe statt nur Name/Website/Adresse. Das Overlay setzt die Pipeline **vor** dem Matching; `matchSchools` selbst ist unverändert.

## Ablauf (Mermaid)

Reihenfolge entspricht dem Code in `matchSchools` (nach `ref`-Pass und OSM-Restliste).

```mermaid
flowchart TB
  off[OfficialInput]
  osmIn[OsmSchoolInput]
  off --> refPass[extractRefMatches]
  osmIn --> refPass
  refPass --> phase1[Phase1: mehrere im Radius + ein Name matcht]
  phase1 --> mainLoop[Hauptschleife: pro OSM Kandidaten im Radius]
  mainLoop --> outcomes[osm_only / matched / ambiguous]
  mainLoop --> offOnly[Rest withCoord → official_only]
  offOnly --> ncName[No-coord: Name vs osm_only]
  ncName --> ncWeb[No-coord: Website]
  ncWeb --> ncAddr[No-coord: Adresse]
  ncAddr --> ncLeft[official_no_coord Rest]
```

## Kurzbeschreibung der Phasen

1. **`extractRefMatches`**  
   Paart OSM-`ref` mit dem JedeSchule-ID-Suffix (gleiches Bundesland), wenn der Index eindeutig ist. Ein eindeutiger `ref` gilt unabhängig von `amenity`/`education=college`. Die Fachschule-Prüfung (Name enthält „fachschule“ **oder** `school_type` zeigt Fachschule) gilt nur für Distanz-/Namens-Matching und den College-Name-Fallback.

2. **Phase 1 (mehrere im Radius + Name)**  
   Globale Priorisierung nach Distanz: Wenn mehrere offizielle Punkte im Radius liegen und **genau einer** den normalisierten OSM-Namen trifft, wird dieser zuerst reserviert (`distance_and_name`).

3. **Hauptschleife restliche OSM**  
   Pro Kandidatenliste im Radius: 0 → `osm_only`, 1 → `matched` (distance), mehrere → Name oder `match_ambiguous`.

4. **`official_only`**  
   Noch nicht gematchte **with-coord**-Officials.

5. **No-coord-Fallbacks** (nur `withoutCoord`, jeweils land-lokal über `groupOfficialsByState` und genau **ein** passendes `osm_only` pro Schlüssel/Land):  
   normalisierter **Name** → **Website** → **Straßenadresse**; bei mehreren Treffern → `match_ambiguous` auf der OSM-Zeile.

6. **`official_no_coord`**  
   Verbleibende Officials ohne Koordination und ohne erfolgreichen Fallback.

Details zu Normalisierung: [`src/lib/compareMatchKeys.ts`](../src/lib/compareMatchKeys.ts), Radius: [`src/lib/matchRadius.ts`](../src/lib/matchRadius.ts).

Zur übergeordneten Pipeline: [pipeline.md](pipeline.md).
