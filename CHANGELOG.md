# Changelog

Automatisch aus `changelog.registry.yaml` erzeugt.

## 2026-05

### `da38bb7`

Die Daten werden jetzt um 2:00 Berliner Zeit aktualisiert.

### `c27a7eb`

Beim Abgleich wird jetzt `education=school|college` gleich behandelt mit `amenity`.

## 2026-04

### `9c3458f`

Neuer Filter: fehlender `ref`-Tag in OSM, aber erkennbare ID aus den amtlichen Daten (sinnvoll zum Nachtaggern).

### `3caf6cf`, `0e7f530`, `3691fcb`

Add `/changelog` page and `CHANGELOG.md` file based on a custom changelog registry that monitors git commits to keep the changelog up to date. The changelog is linked from the home page and footer.

### `c5f02c4`

Die `/status` Seite (siehe Footer) ist überarbeitet und jetzt deutlich hilfreicher. Sie zeigt vor allem die Daten der verschiedenen Datenquellen sowie die letzten Durchläufe des Datenabgleichs.

### `05622a9`

Wir matchen Schulen per `ref` Tag. Dieses Matching wurde verbessern. Außerdem wird der Vergleich von `ref` (OSM) und `id` (Jedeschule) jetzt in der Attribut-Tabelle angezeigt. Und außerdem gibt es einen Button, um die `ref` in OSM zu taggen basierend auf den amtlichen Daten (nur wenn eine solide ID erkannt wurde).

### `76674a2`

In der Suche auf der Startseite kann man jetzt für "Grundschulen" und "Weiterführende Schulen" verschiedene Filter anweden. Darüber ist es bspw. einfacher solche zu finden, bei denen Tags fehlen. Die Auswahl hat einen Hinweis, welche Handlung vermutlich sinnvoll ist mit den Daten dieser Kategorie.

### `95b09ca`

In der Attribut-Tabelle werden jetzt weitere, eher technisch Attribute in einer eigenen Kategorie aufgeführt. Das hilft vor allem, die Daten besser zu verstehen und den Blick auf die wichtigeren Attribte darüber zu lenken.
