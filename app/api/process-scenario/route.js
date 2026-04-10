import { isAuthed } from "../../lib/auth";

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

  const { scenario } = await request.json().catch(() => ({}));
  if (!scenario || typeof scenario !== "string" || scenario.length > 500) {
    return Response.json({ error: "Invalid scenario" }, { status: 400 });
  }

  const regionList = BRAIN_REGIONS.map(
    (r) => `- ${r.id}: ${r.name} (${r.description})`
  ).join("\n");

  const prompt = `You are a neuroscience expert. Given a scenario, determine which brain regions activate, in what temporal order, and with what intensity.

Available brain regions:
${regionList}

Scenario: "${scenario.trim()}"

Respond ONLY with a JSON array of activation steps in temporal order. Each step represents a moment in the neural response. A step can activate multiple regions simultaneously. Format:

[
  {
    "time_label": "0-100ms",
    "description": "Brief description of what's happening neurally",
    "regions": {
      "region_id": { "intensity": 0.0-1.0, "reason": "why this region activates" }
    }
  }
]

Include 4-8 steps showing the cascade of neural activity. Include baseline/always-on regions (like brainstem) at low intensity. Be specific about WHY each region activates for this particular scenario. No markdown, no backticks, just JSON.`;

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
        max_tokens: 1500,
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
    const steps = JSON.parse(cleaned);
    return Response.json({ steps });
  } catch (err) {
    return Response.json(
      { error: "Failed to process scenario", detail: String(err) },
      { status: 500 }
    );
  }
}
