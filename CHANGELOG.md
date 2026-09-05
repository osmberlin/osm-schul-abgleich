# Changelog

Automatisch aus `changelog.registry.yaml` erzeugt.

## 2026-09

### `bc8f5d0`

MapRoulette Tag-Fix ist eine Kampagne mit einer GeoJSON-Datei: lizenzfreie amtliche Vorschläge wo möglich, sonst bundesweit nur aus OSM (ohne `ref`/Betreiber).
Länder ohne amtliche Lizenz erscheinen in derselben Kampagne; Übersicht und Schuldetail verlinken MapRoulette überall.

### `857c5df`, `654e5c6`

Neue Seite [`/download`](/download): eine CSV für Deutschland mit dem Abgleich (amtlich, OSM, gematcht), verlinkt im Footer und auf der Land-Übersicht.
Jede Zeile hat Bundesland, amtliche Lizenz und Quellen-URL; OSM-Anteile sind als ODbL gekennzeichnet.
Die Datei ist zum Prüfen und Verstehen gedacht — OSM (ODbL) gemischt mit amtlichen Quellen ergibt keine klare Weiterverwendungslizenz.

### `1697166`

Im Footer hat jede MapRoulette-Kampagne eine eigene Zeile: Link zur Kampagne, ein Spezial-iD-Editor zum direkten Mappen, und die Rohdaten (JSON).

### `362beb8`

Schulen ohne amtliche Koordinaten (vor allem in Niedersachsen) können jetzt per Distanz zugeordnet werden.
Die Adresse wurde einmalig mit Nominatim geocodiert; auf der Detailseite steht, wenn der Punkt eine Straßenadresse ist und nicht ein vermessener Schulstandort.
Nominatim-Treffer, die mehr als 2 km von einem bestehenden Namens-, Website- oder Adress-Match liegen, werden nicht verwendet.

## 2026-08

### `6142c3f`

MapRoulette-Aufgaben sind übersichtlicher formuliert:
- Tag-Fix aus amtlichen Daten: kompakter Text (Name und Land, kurzer Hinweis, Links zur Schul-Website und Detailseite, Tags in Codeblöcken); bei `ref` ein eigener Abschnitt mit kurzer Begründung, warum die Referenz hilft.
- Neu: Challenge für fehlende Schulen in BE, BB und SH — amtliche Schulen ohne OSM-Zuordnung (`official_only`) als Create-Aufgaben mit vorgeschlagenem Tag-Paket; der Aufgabentext folgt dem gleichen kompakten Aufbau.

### `77a980d`

In der Suche & Filter-Ansicht sitzt die Namenssuche jetzt neben einer kurzen Auswahl Amtlich+OSM / Nur amtlich / Nur OSM.
Bei den Schulform-Filtern kann man zusätzlich eingrenzen, ob das Schulform-Signal aus amtlichen Daten oder aus OSM kommt.

### `6220d1d`, `d7da64f`, `951d759`

MapRoulette Tag-Fix für Schulen: Vorschläge werden als GeoJSON-Feed erzeugt und nach dem Pages-Deploy neu aufgebaut.
- Für OSM-lizenzkompatible Länder (BE, BB, SH) gibt es Aufgaben aus amtlichen Daten zu Schulform, `ref` und Betreiber; Übersicht und Schuldetail verlinken MapRoulette, die Startseite kennzeichnet diese Länder.
- Bundesweit kommen zusätzliche Aufgaben nur aus vorhandenen OSM-Daten (Name, Website-URL, `school:de` oder unvollständige `school`/`isced:level`-Tags) — ohne amtliche Lizenz und ohne `ref`/Betreiber-Vorschläge; kombinierte Campus-Namen (z. B. Grund- und Hauptschule) werden ausgelassen.
- In den Aufgaben erscheint unter Hilfsmittel ein Link zur Schul-Website, wenn amtliche oder OSM-Daten eine URL haben.
- Die Lizenz-Tabelle listet recherchierte Nutzungsbedingungen für weitere Länder (u. a. BW, HB, RP, SL, ST, TH) mit Verweis auf die Research-Notizen.

## 2026-05

### `63d654e`

Logo, Favicon und Social Sharing sind aktualisiert.

### `01a2e5e`

Auf der Detailseite werden Schulen die zwar zugeordnet werden konnten aber bei denen einige der wichtigen OSM Tags fehlen mit einem roten Ring hervorgehoben.

### `e04826d`

Schulen mit einem `school_type` "Integrierte Sekundarschule" werden jetzt intern als "gymnasium"
verstanden, so dass die Such-Filter sie verstehen, so dass es tagging-Button gibt und Gruppierung in der Tag-Tabelle.

### `da38bb7`

Die Daten werden jetzt um 2:00 Berliner Zeit aktualisiert.

### `c27a7eb`

Beim Abgleich wird jetzt `education=school|college` gleich behandelt mit `amenity`.

## 2026-04

### `9c3458f`

Neuer Filter: fehlender `ref`-Tag in OSM, aber erkennbare ID aus den amtlichen Daten (sinnvoll zum Nachtaggern).

### `3caf6cf`, `0e7f530`, `3691fcb`

Add [`/changelog`](/changelog) page and `CHANGELOG.md` file based on a custom changelog registry that monitors git commits to keep the changelog up to date. The changelog is linked from the home page and footer.

### `c5f02c4`

Die [`/status`](/status) Seite (siehe Footer) ist überarbeitet und jetzt deutlich hilfreicher. Sie zeigt vor allem die Daten der verschiedenen Datenquellen sowie die letzten Durchläufe des Datenabgleichs.

### `05622a9`

Wir matchen Schulen per `ref` Tag. Dieses Matching wurde verbessern. Außerdem wird der Vergleich von `ref` (OSM) und `id` (Jedeschule) jetzt in der Attribut-Tabelle angezeigt. Und außerdem gibt es einen Button, um die `ref` in OSM zu taggen basierend auf den amtlichen Daten (nur wenn eine solide ID erkannt wurde).

### `76674a2`

In der Suche auf der Startseite kann man jetzt für "Grundschulen" und "Weiterführende Schulen" verschiedene Filter anweden. Darüber ist es bspw. einfacher solche zu finden, bei denen Tags fehlen. Die Auswahl hat einen Hinweis, welche Handlung vermutlich sinnvoll ist mit den Daten dieser Kategorie.

### `95b09ca`

In der Attribut-Tabelle werden jetzt weitere, eher technisch Attribute in einer eigenen Kategorie aufgeführt. Das hilft vor allem, die Daten besser zu verstehen und den Blick auf die wichtigeren Attribte darüber zu lenken.
