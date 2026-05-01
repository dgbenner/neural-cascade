"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";

// Face tracking via MediaPipe Face Landmarker. Returns smoothed +
// clamped head rotation through `rotationRef` so the consumer can
// read it inside an existing animation loop without forcing a
// re-render on every frame. The `videoRef` should be attached to a
// <video> element used both as input to MediaPipe and as the source
// for the webcam preview UI.
export default function useFaceTracking() {
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const rafRef = useRef(null);

  // Latest face-derived rotation (smoothed + clamped). Consumed each
  // animation frame by BrainViz's render loop. Defaults to zeros so
  // brainGroup stays at identity rotation when tracking is off.
  const rotationRef = useRef({ x: 0, y: 0, z: 0 });
  // Target rotation per detection frame; we lerp rotationRef toward
  // this every detection tick.
  const targetRef = useRef({ x: 0, y: 0, z: 0 });
  // Last detection timestamp (ms) so we never feed the same frame
  // twice to MediaPipe — it requires monotonic increase.
  const lastTsRef = useRef(0);

  const MAX_YAW = (70 * Math.PI) / 180;
  const MAX_PITCH = (30 * Math.PI) / 180;
  const MAX_ROLL = (20 * Math.PI) / 180;
  const SMOOTHING = 0.18;

  const stopTracking = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsTracking(false);
    // Smoothly returning to zero handled by the consumer.
    targetRef.current = { x: 0, y: 0, z: 0 };
  }, []);

  const startTracking = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      // Lazy-load MediaPipe so it doesn't ship until a user actually
      // turns tracking on.
      const { FaceLandmarker, FilesetResolver } = await import(
        "@mediapipe/tasks-vision"
      );

      if (!landmarkerRef.current) {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        landmarkerRef.current = await FaceLandmarker.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            numFaces: 1,
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: true,
          }
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsLoading(false);
      setIsTracking(true);

      const m4 = new THREE.Matrix4();
      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      const scl = new THREE.Vector3();
      const euler = new THREE.Euler();

      const tick = () => {
        if (
          !videoRef.current ||
          !landmarkerRef.current ||
          videoRef.current.readyState < 2
        ) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        const ts = performance.now();
        // Don't re-feed identical timestamps to MediaPipe.
        if (ts <= lastTsRef.current) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        lastTsRef.current = ts;

        const result = landmarkerRef.current.detectForVideo(
          videoRef.current,
          ts
        );

        if (
          result &&
          result.facialTransformationMatrixes &&
          result.facialTransformationMatrixes.length > 0
        ) {
          const matrix = result.facialTransformationMatrixes[0];
          m4.fromArray(matrix.data);
          m4.decompose(pos, quat, scl);
          euler.setFromQuaternion(quat, "YXZ");

          // Webcam is mirrored relative to the user, so flip yaw and
          // roll so a left turn on screen reads as a left turn in 3D.
          const yaw = -euler.y;
          const pitch = euler.x;
          const roll = -euler.z;

          targetRef.current = {
            x: Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch)),
            y: Math.max(-MAX_YAW, Math.min(MAX_YAW, yaw)),
            z: Math.max(-MAX_ROLL, Math.min(MAX_ROLL, roll)),
          };
        }

        // Lerp the public rotationRef toward the target so the
        // consumer always reads a smoothed value.
        const cur = rotationRef.current;
        const tgt = targetRef.current;
        rotationRef.current = {
          x: cur.x + (tgt.x - cur.x) * SMOOTHING,
          y: cur.y + (tgt.y - cur.y) * SMOOTHING,
          z: cur.z + (tgt.z - cur.z) * SMOOTHING,
        };

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      setIsLoading(false);
      setError(err?.message || String(err));
      stopTracking();
    }
  }, [stopTracking]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (landmarkerRef.current && landmarkerRef.current.close) {
        try {
          landmarkerRef.current.close();
        } catch {}
      }
    };
  }, []);

  return {
    isTracking,
    isLoading,
    error,
    rotationRef,
    videoRef,
    startTracking,
    stopTracking,
  };
}
