# Changelog

Automatisch aus `changelog.registry.yaml` erzeugt.

## 2026-08

### `d7da64f`

In MapRoulette-Aufgaben erscheint unter Hilfsmittel ein Link zur Website der Schule, wenn amtliche oder OSM-Daten eine URL haben.

### `6220d1d`

MapRoulette Tag-Fix-Challenge für OSM-lizenzkompatible Länder (BE, BB, SH): Vorschläge zu Schulform, `ref` und Betreiber.

- Auf Übersicht und Schuldetail gibt es einen MapRoulette-Link; die Startseite kennzeichnet Länder mit MapRoulette.
- Nach dem Pages-Deploy wird die Challenge aus dem veröffentlichten GeoJSON-Feed neu aufgebaut.
- Die Lizenz-Tabelle listet recherchierte Nutzungsbedingungen für weitere Länder (u. a. BW, HB, RP, SL, ST, TH) mit Verweis auf die Research-Notizen.

## 2026-05

### `ab7b259`

Packages: Add min release age
Co-authored-by: Cursor <cursoragent@cursor.com>

### `c5f77dd`

Update packages and changelog helper scripts

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
