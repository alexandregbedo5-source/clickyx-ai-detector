# ClickyX AI Detector — site + moteur de détection

Site web qui estime la probabilité qu'une image ait été **générée par une IA**, à partir de
trois analyses indépendantes fusionnées par un modèle calibré :

| Détecteur | Principe | AUC |
|---|---|---|
| Spectre fréquentiel (FFT) | pics périodiques, résidu hautes fréquences du suréchantillonnage | 0,920 |
| Bruit résiduel | bruit de photon, matrice de Bayer (CFA), grille JPEG | 0,928 |
| CNN (EfficientNet-B0, ONNX) | réseau entraîné sur images réelles vs générées | 1,000 |
| **Fusion calibrée** | régression logistique sur les trois scores | **1,000** |

*AUC hors-pli (K=5) sur 360 images de validation issues de générateurs jamais vus à
l'entraînement. Le modèle a été entraîné sur Google Colab ; le notebook complet est fourni.*

Le site expose deux pages : le **détecteur** (glisser-déposer une image) et une page
**Modèle & Entraînement** qui lit les métriques réelles depuis les artefacts d'entraînement.

## Architecture

Un seul projet Vercel, deux services (fonctionnalité [Vercel Services](https://vercel.com/docs/services))
servis sur le même domaine :

```
┌─────────────────────── Projet Vercel ────────────────────────┐
│                                                                │
│  /            → service frontend   Next.js 16 + Tailwind 4     │
│                                    pages statiques             │
│                                          │                     │
│                                          │ fetch relatif       │
│                                          ▼                     │
│  /svc/api/*   → service backend    FastAPI + ai_detector       │
│                                    GET  /health, /model-info   │
│                                    POST /detect-image          │
└────────────────────────────────────────────────────────┘
```

Le navigateur appelle le moteur en **URL relative** (`/svc/api/...`) : même origine, donc pas
de CORS, pas de variable d'environnement à configurer, et aucun rebond par une route Next.js
intermédiaire — ce qui compte, car chaque saut est soumis au plafond de 4,5 Mo par requête.

### Deux choses ne sont pas dans ce dépôt, volontairement

| Élément | Où il vit | Comment il arrive en production |
|---|---|---|
| Le moteur `ai_detector` | dépôt [clickyX](https://github.com/alexandregbedo5-source/clickyX) | installé au build par la dépendance git de `backend/requirements.txt` |
| Les artefacts du modèle (dont `detector.onnx`, 16 Mo) | `clickyX/model/` | téléchargés au premier démarrage du service, mis en cache dans `/tmp` |

Le moteur n'est donc jamais dupliqué : une seule source de vérité, et le poids de 16 Mo ne
gonfle pas ce dépôt. Si le téléchargement échoue, le service démarre quand même en **mode
dégradé** (FFT + bruit seulement, AUC 0,980 au lieu de 1,000) et `/health` renvoie
`status: degraded` au lieu de `ok`.

```
clickyx-ai-detector/
├── vercel.json          les deux services et leurs routes publiques
├── backend/
│   ├── main.py          entrypoint (`main:app`) : préfixe, artefacts, routes ajoutées
│   └── requirements.txt dépendance git vers le moteur + dépendances d'exécution
└── frontend/
    └── src/
        ├── app/         pages / et /model
        ├── components/  panneau de détection, barres de score, badge de verdict
        └── lib/         base d'API, types
```

## Déploiement sur Vercel

Il n'y a **aucune étape manuelle** : ni fichier à copier, ni variable d'environnement à
renseigner, ni réglage à changer dans l'interface.

1. Sur [vercel.com/new](https://vercel.com/new), importez ce dépôt GitHub.
2. Laissez le « Root Directory » à la racine : Vercel lit `vercel.json`, détecte le preset
   `services` et construit les deux services séparément.
3. Cliquez sur **Deploy**.

Chaque `git push` sur `main` redéploie automatiquement.

### Vérifier un déploiement

```bash
curl https://<votre-projet>.vercel.app/svc/api/health
```

Une réponse saine ressemble à ceci — `status: ok` et `fusion_mode: full` signifient que le
CNN a bien été chargé :

```json
{ "status": "ok", "model": { "loaded": true, "arch": "efficientnet_b0" }, "fusion_mode": "full" }
```

Sur le site, la pastille en haut de la page d'accueil doit afficher **« Moteur connecté »**.

## Lancer en local

> Chaque commande se lance **séparément**. « puis » / « ensuite » ne sont pas des commandes.

### Terminal 1 — le moteur (Python)

Prérequis : **Python 3.11 ou 3.12** (`onnxruntime` ne publie pas encore de paquets pour
3.13 / 3.14).

```bash
cd backend
```
```bash
python -m venv .venv
```
```bash
source .venv/bin/activate
```
Sous Windows (PowerShell) : `.venv\Scripts\Activate.ps1` — sous `cmd` : `.venv\Scripts\activate.bat`

```bash
python -m pip install -r requirements.txt
```
```bash
python -m uvicorn main:app --port 32188
```

Au premier lancement, le service télécharge les artefacts du modèle (16 Mo) : comptez
quelques secondes. Ils sont ensuite réutilisés depuis le cache.

### Terminal 2 — le site (Next.js)

Prérequis : **Node.js 18 ou 20**.

```bash
cd frontend
```
```bash
npm install
```
```bash
npm run dev
```

En local, le site et le moteur sont sur deux ports différents : indiquez au site où trouver
le moteur en créant `frontend/.env.local` :

```
NEXT_PUBLIC_API_BASE=http://127.0.0.1:32188/svc/api
```

Le site est alors sur **http://localhost:42817**. En production ce fichier est inutile : la
valeur par défaut `/svc/api` suffit.

## Contrat d'API

Toutes les routes sont accessibles sous `/svc/api` en production, et à la racine en local.

| Route | Rôle |
|---|---|
| `GET /health` | état du service, version du modèle, mode de fusion |
| `GET /model-info` | fiche du modèle et rapport de calibration issus de l'entraînement |
| `POST /detect-image` | analyse une image envoyée en **octets bruts** |
| `POST /detect-ai-image` | même analyse, corps JSON `{"image_base64": "..."}` (contrat historique) |

Réponse d'une analyse :

```json
{
  "is_ai_generated": true,
  "confidence": 0.997,
  "fft_score": 0.81,
  "noise_score": 0.73,
  "cnn_score": 0.95
}
```

Les erreurs suivent la forme `{"error": {"code": "...", "message": "..."}}`.

## Contraintes connues

| Contrainte | Détail | Conséquence |
|---|---|---|
| Corps de requête Vercel : 4,5 Mo | limite plateforme | Images limitées à **4 Mo**, envoyées en octets bruts (le base64 aurait ajouté 33 %). L'analyse se fait à la résolution native : redimensionner détruirait les indices forensiques, donc aucune compression automatique. |
| Taille de fonction Python : 500 Mo | limite Vercel | Le bundle backend pèse ~255 Mo (`scipy`, `onnxruntime`, `numpy`). Ça passe, mais n'ajoutez pas de grosse dépendance sans vérifier. |
| Démarrage à froid | téléchargement du modèle + chargement d'ONNX Runtime | Première requête après inactivité : quelques secondes. Les suivantes sont rapides. |
| Python 3.13 / 3.14 | pas de wheels `onnxruntime` / `protobuf` | Utiliser **3.11 ou 3.12** en local. |

## Dépannage

| Symptôme | Cause | Solution |
|---|---|---|
| « Moteur injoignable » en local | moteur non démarré, ou `NEXT_PUBLIC_API_BASE` absent | Lancer le moteur, et créer `frontend/.env.local` (voir plus haut) |
| « Moteur injoignable » en production | le service backend n'a pas démarré | `curl https://<projet>.vercel.app/svc/api/health` et lire les logs de build Vercel |
| « Moteur dégradé (CNN absent) » | artefacts du modèle non téléchargés | Vérifier que `clickyX/model/detector.onnx` est accessible publiquement |
| Page `/model` en erreur | backend injoignable | Cliquer sur « Réessayer » : le premier appel réveille le service |
| `ModuleNotFoundError: numpy` | dépendances non installées, ou Python 3.13+ | Recréer le venv en Python 3.12, puis réinstaller |
| `npm error 404 ... GET .../puis` | « puis » tapé comme une commande | Lancer les commandes une par une |

## Entraînement du modèle

Le modèle a été entraîné sur Google Colab (EfficientNet-B0 pré-entraîné, échantillonnage
équilibré, augmentations JPEG / redimensionnement / flou, EMA, arrêt anticipé), puis exporté
en ONNX (opset 17) avec vérification numérique torch ↔ onnxruntime, et enfin la fusion a été
calibrée par régression logistique hors-pli sur la validation.

La page **Modèle & Entraînement** du site détaille les 12 blocs du pipeline et affiche les
hyperparamètres réels, lus au moment de l'affichage depuis `GET /svc/api/model-info`.

## Licence

MIT
