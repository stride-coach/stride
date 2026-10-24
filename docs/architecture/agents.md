# Agent responsibilities

Agents are specialized actors selected by an orchestrator. Each has a narrow responsibility, declared inputs, allowed tools, and structured output. An agent is not a folder of prompts and is not interchangeable with a skill.

## Planned roles

The [coaching engine RFC](coaching-engine/agents-and-delegation.md) (#86, proposed) refines the earlier role list:

- **Coach:** the only tool-using agent. It merges the former orchestrator and training-coach roles: it understands the request, runs the workflow chosen by code, designs and adapts plans within computed bounds, synthesizes specialist opinions and explains decisions.
- **Sports Director:** race roles, season feasibility and spacing between races; a deterministic module with an optional bounded consult.
- **Course Strategist:** training implications of a race course, built on the race workspace's course analysis. It may propose a race strategy (instructions, and per segment a note and a pace factor that keeps the target time) as a race proposal; the athlete accepts or refuses it on the Plan de course tab, and race-day pacing stays computed by the race workspace.
- **Recovery & Health:** readiness assessment, red flags and load restrictions, never diagnosis.
- **Performance:** the deterministic Progression measures; no separate agent.
- **Nutritionist:** daily targets and race nutrition. Stride's deterministic allocation computes race fueling from the athlete's products; the nutritionist proposes targets, products per role, the start setup, and exact items per segment as a race proposal that the athlete accepts or refuses on the Nutrition tab. Drop bag extras such as clothes are the athlete's own list on the Équipement tab.

The roles above describe future responsibilities. They are not implemented agents. Specialists should not independently change athlete data or bypass application authorization: race strategies and nutrition plans change only when the athlete accepts a race proposal.
