'use client';
// r2026-10-06.128 — single source of truth. The face engine lives in
// @amoji/robot-face (packages/robot-face); the app consumed a forked copy that
// had drifted ahead (v2: gaze, lipsync, hint blending). This shim keeps every
// existing app import working while the B2C app and the B2B SDK share exactly
// one implementation — fixes propagate to licensees the moment they ship.
export * from '@amoji/robot-face';
