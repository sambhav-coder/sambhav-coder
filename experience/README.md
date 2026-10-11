# Interactive profile experiences

Standalone, dependency-light static site that powers the two interactive sections
of the GitHub profile README:

- `journey/` — the interactive developer **journey tree** (pure HTML/CSS + tiny JS).
- `car/` — the interactive **3D sports car** connect scene (vanilla Three.js, vendored).
- `index.html` — a small landing page linking both.

Nothing here talks to a server. There are **no external network calls at runtime**:
Three.js (r160, ES modules), `GLTFLoader` and the 3D model are vendored under
`vendor/`, and all icons are inline SVG.

## Run locally

No build step. Serve the folder over HTTP (a `file://` open works too, but the
3D scene is happiest over HTTP):

```sh
# from the repository root
python3 -m http.server 5500 --directory experience
# then open http://localhost:5500/
```

## Deploy (static)

The folder is ready for any static host. For Vercel:

```sh
# from inside experience/
vercel        # preview
vercel --prod # production (only after you explicitly approve deploying)
```

`vercel.json` sets long-lived caching for `vendor/` and `assets/`.

## Accessibility & performance notes

- Project nodes and every car hotspot also exist as real `<a>` links outside the
  WebGL canvas, so the page is fully usable by keyboard and screen readers.
- The 3D scene pauses its render loop when the tab is hidden.
- `prefers-reduced-motion` disables the tree grow-in and the car's idle spin.
- If WebGL is unavailable, the car scene swaps in a static illustration plus the
  same link grid instead of a black box.

## 3D model licence & attribution

The car scene renders `vendor/models/CarConcept.glb` — the **"Car Concept"** glTF sample:

- **Original model:** "Free Concept Car 004 (public domain / CC0)" by **Unity Fan** (Sketchfab).
- **glTF version:** optimised and published by the **Khronos Group** in `glTF-Sample-Assets`.
- **Licence:** [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/) — full text in
  `vendor/models/CarConcept-LICENSE.md`. Attribution is required and is shown in the
  footer of the 3D car page as well as here.

## Destinations used (all verified)

| Where | Label | URL |
| :-- | :-- | :-- |
| Journey node | Campus Ninja | https://campusninja.vercel.app/ |
| Journey chip | Campus Ninja — Play Store | https://play.google.com/store/apps/details?id=com.campusninja.app |
| Journey chip | Campus Ninja — WhatsApp | https://chat.whatsapp.com/Lff2bHCTdrSLUbxLjyOxQ2 |
| Journey node | IPU Help | https://councelling-delta.vercel.app/ |
| Journey node | Cyber Sakhi (repo) | https://github.com/sambhav-coder/cyber-sakhi |
| Journey chip | Cyber Sakhi — website | https://cyber-sakhi-sooty.vercel.app/ |
| Journey node | Petro Forge (repo) | https://github.com/sambhav-coder/Petro_Forge |
| Journey chip | Petro Forge — website | https://petro-forge.vercel.app/ |
| Journey node | LeetCode Solutions | https://github.com/sambhav-coder/Leetcode-solutions |
| Journey node | Python journey | https://github.com/sambhav-coder/Journey_of_learning_Python |
| Car window | LinkedIn — Sambhav Yadav | https://www.linkedin.com/in/sambhav-yadav-b61001323/ |
| Car window | LinkedIn — Campus Ninja | https://www.linkedin.com/company/campusninja/ |
| Car window | YouTube — IPU Help | https://www.youtube.com/@IpuHelp-p4y |
| Car window | YouTube — Campus Ninja | https://youtube.com/@campusninja-official |
| Car rear | Email | mailto:ry526270@gmail.com |
| Car rear | GitHub | https://github.com/sambhav-coder |
