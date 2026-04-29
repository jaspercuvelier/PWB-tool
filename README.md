# PWB loonkostcalculator

Statische GitHub Pages-tool op basis van barema 141/148. De calculator kan in twee richtingen rekenen: van jaarbudget naar lestijden of uren per week, en van gewenste lestijden of uren per week naar de jaarlijkse kost. De calculator maakt onderscheid tussen tijdelijk en vast personeel, en tussen standplaatstoelage en haardgeldtoelage. De toelichting in de tool verwijst naar de officiële Vlaamse onderwijsinfo over haard- en standplaatstoelage.

## Lokaal testen

Omdat de tool `data/tarieven.csv` inlaadt, open je de map best via een kleine webserver:

```bash
python3 -m http.server 8000
```

Open daarna `http://127.0.0.1:8000/`.

## Publiceren op GitHub Pages

1. Zet deze bestanden in een GitHub-repository.
2. Ga naar `Settings` -> `Pages`.
3. Kies `Deploy from a branch`.
4. Kies de branch, meestal `main`, en de map `/root`.
5. Bewaar de instelling.

GitHub toont daarna de publieke URL van de calculator.

## Tarieven bijwerken

Alle bedragen staan in `data/tarieven.csv`. De app leest die CSV bij elke publicatie opnieuw in. De kolom `table_id` bepaalt welke combinatie in de UI gebruikt wordt:

- `tijdelijk-standplaats`
- `tijdelijk-haardgeld`
- `vast-standplaats`
- `vast-haardgeld`

Laat de kolomnamen exact staan:

```text
table_id;table_label;ancienniteit;noemer24_jaar;noemer24_maand;noemer22_jaar;noemer22_maand;noemer36_jaar;noemer36_maand
```

Gebruik puntkomma's als scheidingsteken en kommagetallen zoals `2241,72`. Voor de huidige UI worden `noemer24_jaar`, `noemer24_maand`, `noemer36_jaar` en `noemer36_maand` gebruikt. De `/22`-kolommen blijven aanwezig zodat de CSV dicht bij de PDF-tabel blijft.

Na een wijziging commit je `data/tarieven.csv`; GitHub Pages publiceert de aangepaste bedragen automatisch.
