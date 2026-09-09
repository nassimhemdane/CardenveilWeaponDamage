# Cardenveil Weapon Calculator

Application locale React + TypeScript strict + Vite. Moteur probabiliste indépendant de React. Aucun backend, aucune police externe, aucun tableau de résultats précalculé.

## Lancer sur cette machine

Double-cliquer sur **start.cmd**, puis ouvrir http://127.0.0.1:5173.

Ou depuis ce dossier :

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\npm-local.ps1 run dev
```

Node 22.14.0 portable est installé dans `.tools/` (archive officielle vérifiée par SHA-256). Le lanceur modifie uniquement le PATH de son processus. Pas besoin de modifier la configuration globale de PowerShell.

Commandes avec Node/npm déjà installés :

```sh
npm install
npm run dev
npm test
npm run validate
npm run build
npm run preview
npm run test:ui
```

Sur cette machine, remplacer `npm` par `powershell -NoProfile -ExecutionPolicy Bypass -File .\npm-local.ps1`.
Pour installer le navigateur de test : `npm exec playwright install chromium`.

Le serveur écoute uniquement 127.0.0.1. Les dépendances sont verrouillées dans package-lock.json.
Node compatible Vite : 20.19+ ou 22.12+ ([documentation Vite](https://vite.dev/guide/)).
Distribution officielle Node : [nodejs.org](https://nodejs.org/en/download).

## Organisation

- `src/calculation/types.ts` : types, configuration et paramètres par défaut.
- `dice.ts` : distribution du maximum/minimum, validation et stabilité numérique.
- `probability.ts` : probabilités et longueur analytique des chaînes.
- `attack.ts` : Engagement, Precise, modificateur, Exposition, impact complet.
- `crit.ts` : bonus de critique et plancher d'une chaîne Original explosive.
- `expectedDamage.ts` : espérance, décomposition, comptage, comparaison et optimum.
- `monteCarlo.ts` : simulation indépendante par jets de dés, générateur reproductible.
- `sweep.ts` : export de toutes les combinaisons demandées.
- `src/components/`, `src/App.tsx`, `src/styles.css` : interface.
- `src/workers/` : simulation et export hors du thread de l'interface.
- `tests/engine.test.ts` : tests mathématiques.
- `tests/browser/app.spec.ts` : parcours navigateur.
- `scripts/validate.ts` : cas d'exemple et huit validations à un million d'attaques.
- `reports/validation.json` : résultats exacts et Monte Carlo reproductibles.
- `reports/desktop.png`, `reports/mobile.png` : captures produites par les tests navigateur.

Les quatre exports de règles préexistants ne sont pas modifiés. La spécification de cette demande prime sur les anciennes règles.

## Méthode

Pour d faces et n = 1 + 2 × |avantage net| :

- maximum : P(k) = (k/d)^n − ((k−1)/d)^n ;
- minimum : P(k) = ((d−k+1)/d)^n − ((d−k)/d)^n.

Les différences de puissances utilisent expm1 pour limiter la perte de précision. Ce sont des probabilités analytiques en double précision, et non des fractions rationnelles arbitraires.

Le dé initial gardé égal à 1 annule absolument toutes les composantes de l'attaque.
Precise utilise avantage initial + 1, zéro modificateur, aucun critique et aucune Exposition.
Engagement E utilise avantage initial − E et modificateur × (E + 1).

Pour Full Impact Reproc :
- p = P(crit initial), q = P(crit secondaire) ;
- I = espérance de l'impact initial ; R = espérance d'un impact secondaire ;
- EV = I + p × R / (1−q) en récursif ;
- EV = I + p × R sans récursion.

I et R sont calculés séparément, avec leurs propres distributions et règles de miss.
La même formule s'applique à chaque composante. Le modificateur engagé et tous les bonus fixes reviennent à chaque impact.

Original Crit ajoute la moyenne d'un dé simple. Si explosif : moyenne/(1−1/d).
Crit + Modifier ajoute une seule moyenne de dé + le modificateur engagé.
Les bonus fixes ne sont pas réappliqués par ces deux modèles.

### Plancher exact

Full Impact : max(0, résultat) séparément à chaque impact.
Original / Crit + Modifier : max(0, attaque + bonus critique complet).
La décomposition conserve les contributions signées et ajoute une ligne distincte d'ajustement du plancher pour que la somme soit vérifiable.

Pour Original explosif et une somme potentiellement négative, le moteur somme analytiquement les suites de k maxima terminées par r < d :
P(k,r) = (1/d)^(k+1).
Le seuil du premier k donnant des dégâts non négatifs permet une somme géométrique exacte de la queue. Aucune limite de 10 critiques.

## Conventions explicites

- **Impacts moyens** = impacts complets réussis, miss exclus. Un impact réussi borné à zéro compte toujours.
- **Tentatives** = impacts lancés, miss inclus. Les deux compteurs sont affichés.
- Les dés supplémentaires Original et + Modifier ne sont pas de nouveaux impacts.
- **Critiques moyens** = maxima qui déclenchent un bonus. Un maximum sur un dé secondaire terminal non récursif ne déclenche rien.
- **Au moins un reproc** = au moins une tentative d'impact complet secondaire, même si elle rate.
- **Chaîne secondaire** = longueur moyenne conditionnelle au déclenchement ; affichée à zéro si aucun déclenchement n'est possible.
- Options de miss secondaire / avantage secondaire : réservées à Full Impact. Les autres bonus critiques sont des dés simples sans miss.
- Crit + Modifier ne récursive pas. Le toggle Original Crit Explodes affecte seulement Original.
- Changer le type d'arme ne remplace pas silencieusement le modèle de critique sélectionné.
- L'Exposition est un indicateur défensif. Sans attaques ennemies modélisées, ignorer l'Exposition n'ajoute aucun dégât offensif.
- Les moyennes On Hit et Imprégnation sont traitées comme des constantes. Avec un plancher non linéaire, connaître seulement une moyenne ne suffit pas pour retrouver l'EV de la véritable distribution de ces effets.
- Les ex aequo d'EV sont tous signalés dans le tableau ; la recherche d'optimum retourne le plus faible Engagement parmi les ex aequo. Precise est comparé séparément.
- Le test 26 du cahier des charges est ambigu : q = 0 signifie une chaîne secondaire de longueur 1, **pas** une attaque totale d'un seul impact si le premier impact critique. Les tests vérifient les deux cas.

## Options

Par arme : type, dé, modificateur, avantage initial (négatif inclus), Tier direct, Perfection, Imprégnation, Flat, On Hit, modèle de critique, explosion Original, récursion Full, miss Full, état Full, exemption d'Exposition Finesse, plancher.

Le module AttackRules expose également les constantes de résolution (missOnOne, critOnMax, dés par Avantage, Precise, Engagement) pour une intégration future.
L'interface conserve les constantes Cardenveil de la demande. Les distributions personnalisées sont injectables via le troisième paramètre de getExpectedDamage, notamment pour vérifier q = 1.

## Cas limites et limites techniques

- Le moteur n'impose aucun plafond de gameplay sur Engagement. Les entiers doivent rester représentables exactement par Number et le nombre de dés doit être un entier sûr.
- UI : Engagement affiché 0–50 ; Avantage initial −20 à +20 ; autres valeurs numériques jusqu'à ±1 000 000. Heatmap : engagements jusqu'à 12 et avantages −3 à +5. Ces limites ne modifient pas le moteur.
- Les valeurs saisies invalides affichent un avertissement, conservent le dernier calcul valide puis sont restaurées à la sortie du champ.
- q = 1 avec une chaîne accessible retourne status=divergent et des valeurs null, sans Infinity/NaN dans les résultats. Une chaîne inaccessible ne rend pas une attaque divergente.
- Une chaîne infinie à récompense nulle/negative est également signalée comme non terminante ; aucune simulation de cette chaîne n'est lancée.
- À des paramètres extrêmes, l'arrondi peut rendre q indiscernable de 1. Le message signale la limite, plutôt qu'un nombre trompeur.
- Le Monte Carlo refuse les cas estimés à plus de 200 millions de jets. Cela limite uniquement la validation interactive, pas le moteur analytique.
- Les presets sont locaux au navigateur et à l'origine (hôte/port). Un stockage indisponible produit un message.
- Pas de simulation comme moteur principal. Les graphes et tableaux utilisent uniquement getExpectedDamage.

## Vérification

`npm test` : distributions sur les cinq dés et avantages −5…+5, énumération exhaustive indépendante des cas d6, règles et critiques, négatifs, plancher, divergences, export et cohérence Monte Carlo.

`npm run validate` : régénère reports/validation.json. Chaque simulation utilise 1 000 000 d'attaques avec graine fixe. La validation accepte un écart ≤ 5 erreurs standards ; le rapport expose l'écart et le z-score pour examiner le résultat.

Cas simple à la main, d6 sans bonus et sans avantage :
- impact initial = (2+3+4+5+6)/6 = 20/6 ;
- Original non explosif = 20/6 + (1/6)×3,5 = 47/12 ;
- Full récursif, miss secondaire actif = (20/6)/(1−1/6) = 4 ;
- impacts complets réussis moyens = 1, tentatives moyennes = 1,2.

Les résultats du cas demandé sont dans reports/validation.json, recalculés sans anciens tableaux.
