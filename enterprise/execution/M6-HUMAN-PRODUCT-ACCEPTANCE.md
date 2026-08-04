# M6 Human Product Acceptance

Status: ACTIVE  
Phase: Product leverage validation  
Scope: `Services.ID`, `LawyersHub`, `Indonesia Lawyers Club`

## Purpose

`M6` exists to answer one question:

> Can a human who did not help build EOS understand what each product is for and take the intended first step without coaching?

This is not a kernel gate.
This is not an architecture gate.
This is not a unit-test gate.

This is a human comprehension gate.

## Strategic Metric

`One Spine -> Three Products -> Three Valuable Experiences`

The shared governance spine remains constant.  
The human experience must not.

## Product Map

The three public domains are not three skins of one application.

- `services-id.com` -> consumer and business service front door
- `lawyershub.id` -> professional legal workbench
- `indonesialawyersclub.id` -> legal knowledge, trust, and community surface

The spine stays shared.
Jobs, vocabulary, CTA, and proof must not.

## Acceptance Gates

`P0 Identity`
- the domain immediately tells the reviewer what the product is

`P1 Audience`
- the right person recognizes themselves quickly

`P2 Value`
- there is one clear reason to use the product

`P3 Action`
- there is one obvious CTA

`P4 Proof`
- credibility comes from honest evidence, not invented testimonials or fake metrics

`P5 Journey`
- the CTA enters a meaningful product flow

`P6 Responsive`
- mobile and desktop are both usable

`P7 No Broken Surfaces`
- navigation, CTA, and key flows work

## Rule of Honesty

Do not add fake:

- testimonials
- customer counts
- completion rates
- transaction volume
- community metrics
- case studies

If proof is not yet market-scale proof, say what is true:

- `Verified product workflow`
- `Built-in evidence and verification`
- `Visible progress and evidence-backed delivery`

Use proof before claim.

## M5 vs M6

`M5`
- product implementation and presentation differentiation
- same spine across three products
- public surface is live

`M6`
- human can understand the product quickly
- CTA matches user intent
- surface does not leak EOS-internal vocabulary at the entry point
- product value is visible without explanation from the builders

## Human Review Protocol

Each reviewer receives only:

- the product URL
- one sentence: `Please open this product and tell us what you think it is for.`

No briefing about EOS.
No explanation of the governance spine.
No explanation of internal terminology.

### Questions

Ask each reviewer the same five prompts:

1. `What do you think this product is for?`
2. `Who do you think this product is for?`
3. `What would you click first?`
4. `What do you think will happen after that click?`
5. `What feels confusing, too internal, or not trustworthy?`

### Failure Rule

If the reviewer needs EOS vocabulary explained before they can act, the surface fails.

Examples of failure:

- `What is a requirement?`
- `What does verification mean here?`
- `Why am I seeing workflow/proof/spine language before I understand the product?`

## Product-Specific Acceptance

### Services.ID

Reviewer should conclude quickly:

> I have a service need and I can start it here.

Job to be done:

`demand -> service -> verified delivery`

Acceptance:

- value proposition is understood quickly
- CTA is unambiguous
- intake does not feel like an internal form
- reviewer can predict what happens after submit
- evidence feels like proof of service delivery
- verification feels like benefit, not jargon

### LawyersHub

Reviewer should conclude quickly:

> This is where legal work can start and be tracked professionally.

Job to be done:

`legal work -> structured execution -> accountable outcome`

Acceptance:

- legal context is immediately clear
- client/professional distinction feels natural
- terminology feels like legal work
- evidence feels relevant to legal work
- trust signal is visible
- CTA matches legal intent

### Indonesia Lawyers Club

Reviewer should conclude quickly:

> This is a place to explore and participate in legal knowledge and community activity.

Job to be done:

`knowledge -> community -> trust -> professional ecosystem`

Acceptance:

- immediately recognizable as legal community or knowledge surface
- discovery is primary
- community signal is visible
- professional trust is visible
- join CTA is obvious
- entry surface does not feel like a governance app

## Evidence Capture Template

For each product, record:

- reviewer id
- date and time
- URL reviewed
- first sentence spoken by reviewer
- first click chosen
- predicted next outcome
- first confusion point
- trust concern, if any
- pass/fail
- minimal change implied by the failure

## Decision Policy

If humans understand the product:

`M6 PASS -> product leverage proven -> scale usage`

If humans are confused:

`M6 FAIL -> identify exact comprehension failure -> make minimal surface change -> repeat`

If repeated human evidence shows the spine itself blocks product value:

`human evidence -> product constraint -> justified kernel change`
