FBX / glTF sources pending FBX→VRMA conversion (do NOT ship raw Mixamo here).

IdleKenneySurvivors.fbx
  CC0-1.0 Kenney Animated Characters Survivors (identical idle also in Protagonists/Retro packs)
  https://kenney.nl/assets/animated-characters-survivors
  Convert via Unity humanoid + AnimationClipToVrmaSample → suggested id IdleKenneyStand

quaternius-ual/
  CC0 Quaternius Universal Animation Library (free Godot Standard glTF subset)
  Clip of interest: Idle_Loop (also Idle_Talking_Loop)
  https://quaternius.itch.io/universal-animation-library
  Convert Idle_Loop → suggested id IdleQuaterniusLoop
  Convert Idle_Talking_Loop → suggested id IdleTalkLoop (cheerful/talkative stand)

Mixamo: DO NOT place raw FBX in public redistributable folder without embedding-only plan.
  Manual download with Adobe ID from https://www.mixamo.com/ — see HANDOFF.md

kaykit/
  CC0 KayKit Character Animations (Kay Lousberg)
  https://kaylousberg.itch.io/kaykit-character-animations
  Clips: Idle_A, Idle_B in Rig_Medium_General.{fbx,glb} (and Large)
  Convert extract → VRMA for three-vrm. Prefer Medium for Amoji-scale humanoids.
  Suggested ids (not wired yet): IdleKaykitA (Idle_A), IdleKaykitB (Idle_B)

quaternius-animated-human/
  CC0 Quaternius Animated Human (low poly)
  https://opengameart.org/content/animated-human-low-poly
  Multi-clip FBX; extract the Idle clip.
  Suggested id (not wired yet): IdleQuaterniusHuman

Noted for a later convert, not in the idle playlist yet:
  IdleKaykitA, IdleKaykitB, IdleQuaterniusHuman
