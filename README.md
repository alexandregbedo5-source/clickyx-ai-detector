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
l'entraînement. Le modèle a été entraîné sur Google Colab.*

Le site expose deux pages : le **détecteur** (glisser-déposer une image) et une page
**Modèle & Entraînement** qui affiche les métriques réelles lues depuis les artefacts
d'entraînement.

## Architecture

Un seul projet Vercel, deux services ([Vercel Services](https://vercel.com/docs/services)) :

```
+------------------------ Projet Vercel ------------------------+
|                                                               |
|  frontend/  Next.js 16 + React 19 + Tailwind 4                |
|      |      routes /api/detect, /api/health, /api/model       |
|      |                                                        |
|      v  BACKEND_URL (binding de service, prive)               |
|  backend/   FastAPI + ai_detector                             |
|             POST /detect-ai-image . GET /health, /model-info  |
|             detector.onnx (EfficientNet-B0, 16 Mo)            |
+---------------------------------------------------------------+
```

Le backend n'est **pas exposé publiquement** : seul le frontend l'appelle, via la variable
`BACKEND_URL` injectée automatiquement par le binding déclaré dans `vercel.json`.

```
clickyx-ai-detector/
|-- vercel.json          configuration des deux services
|-- backend/
|   |-- main.py          entrypoint (main:app) + route /model-info
|   |-- requirements.txt
|   |-- ai_detector/     moteur : preprocessing, frequency, noise, cnn, fusion, server
|   +-- model/           detector.onnx, calibration.json, model_card.json, rapport
+-- frontend/
    +-- src/
        |-- app/         pages / et /model, routes API
        |-- components/  panneau de detection, barres de score, badge de verdict
        +-- lib/         configuration, types
```

## Déploiement sur Vercel

### 1. Compléter le backend (moteur + modèle)

Deux dossiers sont à récupérer depuis le dépôt
[clickyX](https://github.com/alexandregbedo5-source/clickyX), afin qu'ils soient **copiés à
l'identique** plutôt que dupliqués à la main :

| À ajouter | Contenu |
|---|---|
| `backend/ai_detector/` | code du moteur : `preprocessing`, `frequency`, `noise`, `cnn`, `fusion`, `server` |
| `backend/model/` | `detector.onnx` (16 Mo), `calibration.json`, `model_card.json`, `calibration_report.json` |

Sans `detector.onnx`, le moteur démarre quand même, mais en **mode dégradé** (FFT + bruit
seulement : AUC 0,980 au lieu de 1,000) et `/health` renvoie `status: degraded`.

**Windows (PowerShell)** — une commande par ligne, depuis la racine de ce dépôt :

```powershell
git clone https://github.com/alexandregbedo5-source/clickyX.git ..\clickyX
```
```powershell
Copy-Item -Recurse -Force ..\clickyX\ai_detector backend\
```
```powershell
Copy-Item -Recurse -Force ..\clickyX\model backend\
```

**macOS / Linux** :

```bash
git clone https://github.com/alexandregbedo5-source/clickyX.git ../clickyX
```
```bash
cp -r ../clickyX/ai_detector backend/
```
```bash
cp -r ../clickyX/model backend/
```

Puis committez :

```bash
git add backend/ai_detector backend/model
```
```bash
git commit -m "chore: ajout du moteur et du modele entraine"
```
```bash
git push
```

Vérifiez que le modèle est bien suivi par git (16 Mo attendus) :

```bash
git ls-files -s backend/model/detector.onnx
```

### 2. Importer le projet

1. Sur [vercel.com/new](https://vercel.com/new), importez ce dépôt GitHub.
2. **Ne changez pas le « Root Directory »** : laissez la racine. Vercel lit `vercel.json` et
   construit les deux services tout seul.
3. Cliquez sur **Deploy**.

Aucune variable d'environnement n'est requise : `BACKEND_URL` est fournie par le binding.

### 3. Vérifier

Une fois déployé, ouvrez l'URL du projet. La pastille en haut de la page d'accueil doit
afficher **« Moteur connecté »**, `Fusion : full` et `Modèle : v1.0.0`.

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
Sous Windows (PowerShell) : `.venv\Scripts\Activate.ps1`

```bash
python -m pip install -r requirements.txt
```
```bash
python -m uvicorn main:app --port 32188
```

> `uvicorn` n'est pas dans `requirements.txt` (Vercel fournit son propre serveur ASGI).
> Pour le lancement local, installez-le une fois : `python -m pip install uvicorn`.

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

Le site est sur **http://localhost:42817**. Il contacte le moteur sur `127.0.0.1:32188` par
défaut ; pour une autre adresse, créez `frontend/.env.local` :

```
AI_DETECTOR_BASE_URL=http://127.0.0.1:32188
```

## Contrat d'API

`POST /detect-ai-image` — corps `{"image_path": "..."}` ou `{"image_base64": "..."}` :

```json
{
  "is_ai_generated": true,
  "confidence": 0.997,
  "fft_score": 0.81,
  "noise_score": 0.73,
  "cnn_score": 0.95
}
```

`GET /health` renvoie l'état du service, la version du modèle et le mode de fusion
(`full` avec le CNN, `handcrafted` sans). Les erreurs suivent la forme
`{"error": {"code": "...", "message": "..."}}`.

## Contraintes connues

| Contrainte | Détail | Conséquence |
|---|---|---|
| Corps de requête Vercel : 4,5 Mo | limite plateforme | Images limitées à **4 Mo**. L'analyse se fait à la résolution native : redimensionner détruirait les indices forensiques, donc aucune compression automatique. |
| Taille de fonction Python : 500 Mo | limite Vercel | Le bundle backend pèse ~330 Mo (`scipy` 139 Mo, `onnxruntime` 66 Mo, `numpy` 70 Mo, modèle 16 Mo). Ça passe, mais n'ajoutez pas de grosse dépendance sans vérifier. |
| Démarrage à froid | chargement d'ONNX Runtime + modèle | Première requête après inactivité : quelques secondes. Les suivantes sont rapides. |
| Python 3.13 / 3.14 | pas de wheels `onnxruntime` / `protobuf` | Utiliser **3.11 ou 3.12** en local. |

## Dépannage

| Symptôme | Cause | Solution |
|---|---|---|
| « Moteur injoignable » | moteur non démarré (local) | Lancer `python -m uvicorn main:app --port 32188` dans `backend/` |
| « Moteur dégradé (CNN absent) » | `backend/model/detector.onnx` manquant | Ajouter et committer le modèle (étape 1 du déploiement) |
| Page `/model` vide | backend injoignable ou `model_card.json` absent | Vérifier `GET /health` du backend |
| `ModuleNotFoundError: numpy` | dépendances non installées, ou Python 3.13+ | Recréer le venv en Python 3.12, puis réinstaller |
| `ModuleNotFoundError: ai_detector` | `backend/ai_detector/` non copié | Refaire l'étape 1 du déploiement |
| `npm error 404 ... GET .../puis` | « puis » tapé comme une commande | Lancer les commandes une par une |

## Entraînement du modèle

Le modèle a été entraîné sur Google Colab (EfficientNet-B0 pré-entraîné, échantillonnage
équilibré, augmentations JPEG / redimensionnement / flou, EMA, arrêt anticipé), puis exporté
en ONNX (opset 17) avec vérification numérique torch / onnxruntime, et enfin la fusion a été
calibrée par régression logistique hors-pli sur la validation.

La page **Modèle & Entraînement** du site détaille les 12 blocs du pipeline et affiche les
hyperparamètres réels lus depuis `backend/model/model_card.json`.

Le notebook complet se trouve dans le dépôt
[clickyX](https://github.com/alexandregbedo5-source/clickyX) :
`training/colab/ai_detector_colab.ipynb`.

## Licence

MIT
