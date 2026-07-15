# Desert Portfolio — System Design

Remix SPA (`ssr: false`) + React Three Fiber. A scroll-scrubbed 3D diorama: Blender empties define the camera path; named meshes become **carriers** driven by scroll progress; the **turtle** is handed between seats by a central FSM.

---

## 1. High-level architecture

```mermaid
flowchart TB
  subgraph AppShell["App shell — `app/`"]
    Root["root.tsx → layout.tsx"]
    Route["_index.tsx → page.tsx"]
    Exp["Experience.tsx"]
    Root --> Route --> Exp
  end

  subgraph Portfolio["Feature — `features/portfolio/`"]
    Exp --> Canvas["R3F Canvas"]
    Exp --> UI["DOM UI / overlays / loaders"]
    Canvas --> Scene["Scene.tsx"]
    Scene --> Cam["Scroll / Orbit / Fixed Camera"]
    Scene --> DM["DesertModel.tsx"]
  end

  subgraph Assets["`public/`"]
    GLB["Models/testmodel.glb"]
    Audio["Audios/"]
    Img["Images / videos"]
  end

  DM --> GLB
  Portfolio --> Config["config/*Settings.ts"]
  Portfolio --> Utils["utils/ — carriers, seats, audio"]
  UI --> Audio
```

---

## 2. Repository layout

```
code/
├── app/                         # Remix SPA shell
│   ├── root.tsx / layout.tsx
│   ├── routes/_index.tsx → page.tsx → Experience
│   └── entry.client.tsx
├── features/portfolio/
│   ├── components/
│   │   ├── Experience.tsx       # Canvas + shell UI
│   │   ├── scene/               # DesertModel, Scene, Overlay, links
│   │   ├── camera/              # ScrollCamera, CameraPath
│   │   ├── animations/          # carriers, walks, banners, video
│   │   ├── audio/               # pass-by + landmark cues
│   │   ├── loading/             # LoaderSelector
│   │   └── ui/                  # AudioToggle, modals, tilt
│   ├── config/                  # Tunables + assetNames
│   ├── hooks/                   # scroll, audio, HMR, device
│   └── utils/                   # carriers, tracks, seats, audioManager
└── public/
    ├── Models/                  # GLB diorama
    ├── Audios/
    └── Images/
```

---

## 3. Runtime boot sequence

```mermaid
sequenceDiagram
  participant User
  participant Exp as Experience
  participant Nav as useScrollNavigation
  participant Scene as Scene
  participant DM as DesertModel
  participant Cam as ScrollCamera
  participant Move as *ScrollMovement

  User->>Exp: Load page
  Exp->>Nav: Create scroll refs
  Exp->>Scene: Mount Canvas
  Scene->>DM: Suspense + useGLTF
  DM->>DM: extractSceneFrame(empties)
  DM-->>Scene: sceneFrame + node map
  Scene->>Cam: Wait for sceneFrame
  Cam->>Cam: getInitialScrollProgress
  loop Each frame
    User->>Nav: wheel / drag / touch
    Nav->>Nav: targetScrollProgress
    Cam->>Cam: lerp scrollProgress → path X
    Move->>Move: carriers from progress windows
  end
```

**Scroll semantics:** progress ≈ `1` at scene-1 entrance (high world X). Forward scroll decreases progress toward western scenes (low X). `SCROLL_DIRECTION = -1`.

---

## 4. Scene component hierarchy

```mermaid
flowchart TD
  Exp["Experience"]
  Exp --> Loader["LoaderSelector"]
  Exp --> Canvas["Canvas"]
  Exp --> Overlay["Overlay — hint + progress"]
  Exp --> HUD["AudioToggle / tilt / modals"]

  Canvas --> Scene["Scene"]
  Scene --> Lights["Lights / fog / bg"]
  Scene --> CamMode{"cameraSettings.mode"}
  CamMode -->|scroll| SC["ScrollCamera"]
  CamMode -->|orbit| OC["OrbitCamera"]
  CamMode -->|manual| FC["FixedCamera"]
  Scene --> DM["DesertModel"]

  DM --> Prim["primitive — GLB scene"]
  DM --> Fix["SceneMeshLayerFix"]
  DM --> Hub["CamelScrollMovement — turtle FSM"]
  DM --> Safari["SafariCamelScrollMovement"]
  DM --> Walk["CamelWalk + SafariCamelWalk"]
  DM --> Vehicles["Boat / Car / Jetski / Yacht / Plane"]
  DM --> Ambient["Metro / Cars / Clouds / Drone / Birds / Lanterns / …"]
  DM --> FX["Banners / Video overlays / Balloons"]
  DM --> AudioR["AudioRuntime + *PassAudio / *TextAudio"]
  DM --> Links["SceneObjectLinks"]
```

---

## 5. Core data flow (one frame)

```mermaid
flowchart LR
  Input["Wheel / touch / drag"] --> Target["targetScrollProgress"]
  Target --> Lerp["lerp → scrollProgress"]
  Lerp --> Cam["ScrollCamera — path X + lookAt"]
  Lerp --> Tracks["*ScrollMovement — carrier X"]
  Lerp --> FSM["CamelScrollMovement — handoffs"]
  Tracks --> Carriers["THREE carriers"]
  FSM --> Turtle["Turtle parenting"]
  Turtle --> Gates["Walk / banners / audio gates"]
  Carriers --> Gates
```

Shared refs (owned by `DesertModel`, consumed by systems):

| Ref family | Purpose |
|------------|---------|
| `scrollProgress` / `targetScrollProgress` | Camera + travel scrubbing |
| `turtleOn*Ref` | Which seat owns the turtle |
| `*TravelProgressRef` | Boat / car / jetski / yacht / safari progress |
| `isScrollLocked` | Journey CTA / transfer locks |
| `carPassState` | Mutable blackboard for mid-arc docks (no React re-render) |

---

## 6. Turtle journey — state machine

`CamelScrollMovement` owns parenting. Vehicles move independently; they park when `carPassState.*Transfer` is true.

### Mounts

`camel` → `boat` → `car` → `jetski` → `yacht` → `safariCamel` (+ transient `transfer`)

### Transfer modes

```mermaid
stateDiagram-v2
  [*] --> camel: start (camel001)

  camel --> toBoat: near boat + forward
  toBoat --> boat: arc complete

  boat --> toCar: near car + forward
  toCar --> car: arc complete

  car --> toJetski: near jetski + forward
  toJetski --> jetski: arc complete

  jetski --> toYacht: near Atlantis yacht + forward
  toYacht --> yacht: arc complete

  yacht --> toSafariCamel: near camel002 + forward
  toSafariCamel --> safariCamel: arc complete

  safariCamel --> toAtlantisYachtFromSafariCamel: Lahbab end + forward
  toAtlantisYachtFromSafariCamel --> yacht: mosque yacht002

  boat --> toCamel: reverse hold
  toCamel --> camel: arc complete
  car --> toBoatFromCar: reverse
  jetski --> toCarFromJetski: reverse
  yacht --> toJetskiFromYacht: reverse
  safariCamel --> toYachtFromSafariCamel: reverse
```

### Forward journey map

```mermaid
flowchart LR
  C1["camel001<br/>Al Fahidi"] --> B["boat001"]
  B --> Car["carbody"]
  Car --> J["jetski"]
  J --> Y1["Atlantis yacht"]
  Y1 --> C2["camel002<br/>Lahbab safari"]
  C2 --> Y2["mosque yacht002"]
```

Each transfer: detach turtle → temporary `transferCarrier` → eased arc (`transferArcHeight` / duration) → `mountTurtleOn*` → sync refs + `carPassState`.

---

## 7. Major systems map

```mermaid
flowchart TB
  subgraph Journey["Journey / carriers"]
    Camel["CamelScrollMovement"]
    SafariM["SafariCamelScrollMovement"]
    Boat["BoatScrollMovement"]
    CarM["CarScrollMovement"]
    Jet["JetskiScrollMovement"]
    Yacht["YachtScrollMovement ×2"]
    Plane["PlaneScrollMovement"]
  end

  subgraph Walk["Walk rigs"]
    CW["CamelWalkAnimation<br/>camel001 + bodyOffsetY"]
    SCW["SafariCamelWalkAnimation<br/>camel002 + bodyOffsetY"]
  end

  subgraph Ambient["Ambient loops"]
    Metro["MetroTrainAnimation"]
    Cars["CarAnimation + CarBodyAnimation"]
    Cloud["CloudAnimation"]
    Drone["DroneAnimation"]
    Bird["BirdAnimation"]
    Lantern["LanternAnimation"]
    Camp["CampfireSmoke / SafariCampWind"]
  end

  subgraph FX["FX / overlays"]
    Banner["SceneBannerRoll<br/>Dubai Frame / New Atlantis"]
    Video["Firecracker / Burj / Desert Safari video"]
    Balloon["WaterBalloonAnimation"]
  end

  subgraph Audio["Audio"]
    AM["audioManager"]
    AR["AudioRuntime.tick"]
    Pass["*PassAudio"]
    Text["*TextAudio"]
  end

  Camel --- CW
  SafariM --- SCW
  Camel -.-> Boat & CarM & Jet & Yacht
  AR --> AM
  Pass --> AM
  Text --> AM
```

---

## 8. Carrier pattern

```mermaid
flowchart LR
  Mesh["Named Blender mesh<br/>e.g. camel.001"] --> Attach["attachAnimationCarrier"]
  Attach --> Carrier["Group — CamelScrollCarrier001"]
  Carrier --> MeshLocal["mesh at local origin"]
  Carrier --> Legs["legs / rider reparented"]
  Scroll["scroll window → world X"] --> Carrier
```

**Why world-space body offsets:** `camel.001` / `camel.002` carry **negative Blender scale**. The carrier inherits it, so a local `position.y -= n` moves the body **up**. Tunables:

| Camel | Config | Key |
|-------|--------|-----|
| camel001 | `camelScrollSettings.ts` | `bodyOffsetY` (world, negative = down) |
| camel002 | `endCamelScrollSettings.ts` | `bodyOffsetY` (world, negative = down) |

Shared geometry helpers live in `utils/sceneObjectUtils.ts`: find objects, floors, tracks, carriers, `setObjectWorldPosition`.

---

## 9. Audio pipeline

```mermaid
flowchart TB
  Unlock["User gesture / AudioToggle"] --> AM["audioManager"]
  AR["AudioRuntime useFrame"] --> AM
  AM --> BGM["BGM loops"]
  AM --> Pass["Pass-by SFX"]
  AM --> OneShot["Landmark one-shots"]

  CarA["CarPassAudio"] --> Pass
  MetroA["MetroPassAudio"] --> Pass
  PlaneA["PlanePassAudio"] --> Pass
  FireA["Firecracker / text audios"] --> OneShot
```

---

## 10. Config + HMR model

```mermaid
flowchart LR
  Edit["Edit *Settings.ts"] --> HMR["import.meta.hot.accept"]
  HMR --> Hook["use*Hmr → revision++"]
  Hook --> Rebuild["useLayoutEffect rebuilds rig"]
  Edit --> Asset["assetNames.ts — Blender ↔ runtime IDs"]
```

| Area | Config module (examples) |
|------|--------------------------|
| Naming | `assetNames.ts` |
| Camera | `cameraSettings.ts` |
| Scene-1 camel | `camelScrollSettings.ts`, `camelWalkSettings.ts` |
| Safari camel | `endCamelScrollSettings.ts` |
| Vehicles | `boat*`, `car*`, `jetski*`, `yacht*`, `plane*` |
| Ambient | `metroTrainSettings`, `bird*`, `lantern*`, `drone*`, `cloud*` |
| FX | `dubaiFrameBanner*`, `newAtlantisBanner*`, `firecracker*`, `burj*` |
| Audio | `audioSettings.ts` |
| Journey / CTA | `journeySettings.ts`, `sceneLinkSettings.ts` |

---

## 11. Cross-cutting concerns

| Concern | Mechanism |
|---------|-----------|
| Mesh IDs | `assetNames.ts` — single source for Blender vs loader names |
| Negative scale | World-space transforms via `setObjectWorldPosition` |
| Mid-transfer docking | `carPassState` blackboard |
| Device UX | `useDeviceType`, tilt prompt, iOS standalone helpers |
| Clickable mesh links | `SceneObjectLinks` + `sceneLinkSettings` |
| Protect / inspect | `useInspectProtection`, `assetProtectionSettings` |

---

## 12. Mental model

> **Scroll-scrubbed diorama.** Blender empties → camera X range. Named meshes → **carriers** driven by progress windows. The **turtle** is a reusable seat attachment driven by one FSM in `CamelScrollMovement`, coordinated through **refs + `carPassState`** so boat / car / jetski / yacht / safari camel move without fighting over the character graph.
