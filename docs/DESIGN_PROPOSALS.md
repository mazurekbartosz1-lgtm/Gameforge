# Gameforge — Design Proposals

## Status
Zapisane 2026-03-29. Do implementacji po security audicie (W48).
Podzielone na dwa zadania: T-COMBAT i T-GOALS.

---

## T-COMBAT: Skalowanie potworów, śmierć gracza, odrodzenie

### Śmierć — model "Knockout"
- HP = 0 → gracz pada, 10s okno na ożywienie przez innego gracza (klawisz E)
- Brak ożywienia → respawn przy ostatnim ognisku/domu grupy
- Kara: -25% głodu, -20% sanity (NIE utrata ekwipunku)
- Wyjątek: śmierć w strefie bossów bez ekwipunku → upuszcza 50% surowych zasobów

### Skalowanie przestrzenne (strefy)
| Strefa | Dystans od spawna | HP wroga | DMG | Drop pool |
|--------|-------------------|----------|-----|-----------|
| 0 | 0–500px | 20 | 3 | bone items, raw_meat |
| 1 | 500–1500px | 40 | 6 | iron items, cooked_meat |
| 2 | 1500–3000px | 70 | 10 | rare weapons, chain mail |
| Boss | Boss zone | 150 | 15 | unique + elemental items |

### Skalowanie czasowe ("wiek grupy")
- Dzień 1–3: standardowe statsy
- Dzień 4–7: wrogowie +20% HP
- Dzień 8+: nowe typy wrogów (Skeleton Mage), nowe receptury craftingowe

---

## T-GOALS: System celów i motywacja graczy

### Propozycja oryginalna — Etyczny Hook
- Tygodniowe Wyzwania Grupowe generowane przez grę
- Mody graczy jako user-generated goals
- Mastery Milestones (indywidualne, nie publiczne)
- Rytm tygodniowy: Wyzwanie pojawia się w poniedziałek, wyniki w niedzielę

### Alternatywa 1 — Model Ekspedycji
- Każda sesja = odrębna wyprawa z celem (dungeon, boss, artefakt)
- Baza permanentna, ekspedycja przynosi loot który ją ulepsza
- Naturalne zakończenie sesji, czytelny progress
- Mody mogą dodawać nowe typy ekspedycji

### Alternatywa 2 — Model Legacy (Żywy Świat)
- Świat permanentnie zmienia się na podstawie działań grupy
- Zbudowaliście młyn → pszenica rośnie na mapie
- Pokonaliście bossa → jego legowisko staje się eksplorowalnym obszarem
- Mody wygrane przez głosowanie → trwała część świata grupy
- "Grób Bartosza" jeśli ktoś umrze 5 razy w tym samym miejscu

### Alternatywa 3 — Model Sezonu z Narracją
- 4-tygodniowe sezony: Przybycie → Zagrożenie → Kuźnia → Finał
- Każdy sezon = nowy motyw, nowi wrogowie, nowe receptury
- Soft reset po sezonie — nowa mapa, kilka kluczowych itemów przenoszone
- Mody graczy mogą wpływać na oficjalny event sezonu

### Alternatywa 4 — Role Asymetryczne
| Rola | Zdolność | Cel |
|------|----------|-----|
| Odkrywca | Szybszy ruch, większe pole widzenia | Odkryj 80% mapy |
| Budowniczy | Buduje 2× szybciej | Postaw wszystkie typy budynków |
| Wojownik | +30% dmg, widzi HP wrogów | Pokonaj wszystkich bossów |
| Kucharz | Gotuje 2× szybciej | Opanuj wszystkie przepisy |
| Kowal Modów | Forge dostępny w grze | 2 zatwierdzone mody aktywne jednocześnie |

### Alternatywa 5 — Tablica Miasta (Community Board)
- Jedna wspólna tablica z 3-5 aktywnymi celami
- Mix: gra generuje podstawowe + gracze zgłaszają swoje przez ModInput
- Ukończone cele fizycznie budują Miasto widoczne na mapie
- Gracze nie wiedzą co pojawi się po ukończeniu (niespodzianka)

### Porównanie alternatyw
| | Narracja | Swoboda | Tech | Rola modów |
|---|---|---|---|---|
| Oryginalny | ★★★ | ★★★ | ★★ | Centralna |
| Ekspedycje | ★★★★ | ★★ | ★★★★ | Dodają ekspedycje |
| Legacy | ★★ | ★★★★★ | ★★★★★ | Trwałe zmiany świata |
| Sezony | ★★★★★ | ★★ | ★★★ | Wpływają na sezon |
| Role | ★★★ | ★★ | ★★ | Specjalne dla Kowala |
| Tablica Miasta | ★★★ | ★★★★ | ★★★ | Bezpośrednie cele |
