import { cookies } from "next/headers";
import { isAuthed, AUTH_COOKIE } from "../../lib/auth";

// Fire-and-forget log to Google Sheets via an Apps Script web app.
// Set GOOGLE_SHEET_WEBHOOK in env vars to the Apps Script deploy URL.
async function logToSheet(data) {
  const url = process.env.GOOGLE_SHEET_WEBHOOK;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {
    // Best-effort — don't let logging failures affect the user.
  }
}

const MODIFIER_CONTEXT = {
  caffeine:
    "The subject has recently consumed caffeine. Adenosine receptors are blocked, norepinephrine and dopamine are elevated. Expect heightened alertness, faster transitions between steps, stronger prefrontal and attention-related engagement, and a slightly amped baseline before the scenario even begins.",
  sleep_deprivation:
    "The subject has been awake for 24+ hours. Prefrontal cortex function is significantly degraded, amygdala is hyperreactive, hippocampal memory encoding is impaired, and thalamic sensory gating is sloppy. Expect blunted executive responses, exaggerated emotional reactions, poor memory consolidation, and slower, less coordinated processing.",
  acute_stress:
    "The subject is under acute stress — a fight-or-flight state with cortisol and adrenaline active. Amygdala dominates, prefrontal deliberation is suppressed, motor cortex and brainstem are primed for action, sensory processing is sharpened, and hippocampal encoding is compromised. Expect a much faster, more reactive cascade that bypasses careful thought.",
};

const BRAIN_REGIONS = [
  { id: "frontal", name: "Frontal Lobe", description: "Executive function, decision-making, planning, personality, motor control" },
  { id: "prefrontal", name: "Prefrontal Cortex", description: "Complex planning, social behavior, impulse control, working memory" },
  { id: "parietal", name: "Parietal Lobe", description: "Spatial awareness, sensory integration, navigation, attention" },
  { id: "temporal_left", name: "Temporal Lobe (Left)", description: "Language comprehension, verbal memory, speech processing" },
  { id: "temporal_right", name: "Temporal Lobe (Right)", description: "Music perception, face recognition, emotional memory" },
  { id: "occipital", name: "Occipital Lobe", description: "Visual processing, color recognition, spatial orientation" },
  { id: "cerebellum", name: "Cerebellum", description: "Motor coordination, balance, timing, procedural memory" },
  { id: "brainstem", name: "Brain Stem", description: "Breathing, heart rate, consciousness, sleep/wake cycles" },
  { id: "amygdala", name: "Amygdala", description: "Fear processing, emotional responses, threat detection" },
  { id: "hippocampus", name: "Hippocampus", description: "Memory formation, spatial memory, learning, navigation" },
  { id: "thalamus", name: "Thalamus", description: "Sensory relay station, attention regulation, consciousness" },
  { id: "motor_cortex", name: "Motor Cortex", description: "Voluntary movement initiation, fine motor control" },
];

export async function POST(request) {
  if (!(await isAuthed())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Server missing ANTHROPIC_API_KEY" },
      { status: 500 }
    );
  }

  const { scenario, modifier } = await request.json().catch(() => ({}));
  if (!scenario || typeof scenario !== "string" || scenario.length > 500) {
    return Response.json({ error: "Invalid scenario" }, { status: 400 });
  }

  // Log usage to Google Sheet (fire-and-forget, non-blocking).
  const store = await cookies();
  const usedPassword = store.get(AUTH_COOKIE)?.value || "unknown";
  logToSheet({
    timestamp: new Date().toISOString(),
    password: usedPassword,
    scenario,
    modifier: modifier || "none",
  });

  const modifierContext =
    modifier && MODIFIER_CONTEXT[modifier]
      ? `\n\nBrain state modifier: ${MODIFIER_CONTEXT[modifier]}\n\nYour description field for each step MUST reference how this state shapes the neural response. Your intensity values should already reflect this modulation — do not let the visualization layer compensate.`
      : "";

  const regionList = BRAIN_REGIONS.map(
    (r) => `- ${r.id}: ${r.name} (${r.description})`
  ).join("\n");

  const prompt = `You are a neuroscience expert. Given a scenario, determine which brain regions activate, in what temporal order, and with what intensity.

Available brain regions:
${regionList}

Scenario: "${scenario.trim()}"${modifierContext}

Respond ONLY with a JSON array of activation steps in temporal order. Each step represents a moment in the neural response. A step can activate multiple regions simultaneously. Format:

[
  {
    "time_label": "0 – 0.1 seconds",
    "description": "Brief description of what's happening neurally",
    "regions": {
      "region_id": { "intensity": 0.0-1.0, "reason": "why this region activates" }
    }
  }
]

Include 4-8 steps showing the cascade of neural activity. Include baseline/always-on regions (like brainstem) at low intensity. Be specific about WHY each region activates for this particular scenario.

CRITICAL: Always express time_label in SECONDS, fully spelled out, with spaces around the en-dash. Use the format "X – Y seconds". Examples: "0 – 0.1 seconds", "0.1 – 0.3 seconds", "0.3 – 0.8 seconds", "0.8 – 1.5 seconds", "1.5 – 3 seconds". Never use "ms", never use "s" as an abbreviation, never use milliseconds.

No markdown, no backticks, just JSON.`;

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 2500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return Response.json(
        { error: `Anthropic API error: ${upstream.status}`, detail: errText },
        { status: 502 }
      );
    }

    const data = await upstream.json();
    const text = data.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("");

    const cleaned = text.replace(/```json|```/g, "").trim();
    try {
      const steps = JSON.parse(cleaned);
      return Response.json({ steps });
    } catch (parseErr) {
      console.error("[process-scenario] JSON parse failed:", parseErr);
      console.error("[process-scenario] raw model output:", cleaned);
      return Response.json(
        {
          error: "Model returned invalid JSON",
          detail: String(parseErr),
          raw: cleaned.slice(0, 800),
        },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("[process-scenario] unexpected error:", err);
    return Response.json(
      { error: "Failed to process scenario", detail: String(err) },
      { status: 500 }
    );
  }
}
