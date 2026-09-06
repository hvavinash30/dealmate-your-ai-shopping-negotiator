# DealMate: Your AI Shopping Negotiator

You are a senior product designer, senior frontend engineer, senior UX engineer, and senior full-stack engineer.

Build a production-quality web application called:

DEALMATE

Tagline:

"Shop smarter. Negotiate better."

The application is an AI-powered conversational shopping and negotiation platform for retail/e-commerce.

IMPORTANT:

The frontend must feel like a premium modern consumer product, NOT a generic SaaS dashboard.

The visual quality, interactions, animations, responsiveness, typography, spacing, micro-interactions, and overall user experience are extremely important.

The application must be built in:

- React

- TypeScript

- Vite

- Tailwind CSS

You may use additional frontend libraries when they materially improve the experience, including:

- Framer Motion / Motion

- Lucide React

- shadcn/ui where appropriate

- React Router

- Zod

- TanStack Query if useful

- Sonner or another lightweight toast system

- other small, well-maintained UI libraries when justified

Do NOT replace React + TypeScript with another frontend framework.

The code must remain clean, modular, readable, and fully editable by a developer.

Do not generate one giant component.

Do not hide important functionality inside an abstraction that makes future editing difficult.

--------------------------------------------------

1. PRODUCT VISION

--------------------------------------------------

DealMate is an AI shopping assistant that allows a shopper to:

1. Tell DealMate what they want.

2. Answer a few short preference questions.

3. Receive intelligently matched products.

4. See real-time prices and seller offers.

5. Negotiate for a better price.

6. Push back on the suggested deal.

7. Receive a bounded negotiated price.

8. Accept the deal.

9. Place a real order without leaving the conversation.

10. View previous orders and negotiation sessions.

The experience should feel like:

"Talking to a smart personal shopping agent that can actually make a deal."

The core experience is conversational commerce.

--------------------------------------------------

2. DESIGN DIRECTION

--------------------------------------------------

The design must feel:

- Premium

- Modern

- Interactive

- Trustworthy

- Warm

- Sophisticated

- Slightly futuristic

- Retail-focused

- Human rather than corporate

- High-end but not over-designed

Avoid:

- Generic admin dashboard aesthetics

- Excessive rounded cards

- Huge gradients everywhere

- Excessive glassmorphism

- Generic blue/purple AI styling

- Stock SaaS layouts

- Excessive shadows

- Empty whitespace with no purpose

- Fake statistics

- Lorem ipsum

- Generic placeholder content

- Emoji-heavy UI

- Cartoonish AI interfaces

The product should look believable as a startup that could actually launch.

--------------------------------------------------

3. VISUAL LANGUAGE

--------------------------------------------------

Primary visual theme:

Dark "premium dealmaking" aesthetic.

Base colors:

Background:

#15120E

Secondary background:

#1A1610

Panel:

#1F1B15

Elevated surface:

#28221A

Border:

#3A3226

Primary accent / negotiation gold:

#E8A33D

Secondary agent accent / sage:

#7FA88A

Negotiation warning / coral:

#E88C6B

Primary text:

#F4EFE6

Muted text:

#9C9284

Use these colors consistently.

Use direct Tailwind arbitrary hex values where practical so that the design can easily be changed later.

Typography:

Use a strong modern display sans-serif for headings.

Use a clean grotesk/system sans-serif for body text.

Use monospace typography selectively for:

- agent labels

- prices

- discounts

- order IDs

- live offer information

- technical/status information

--------------------------------------------------

4. FRONTEND-FIRST PRIORITY

--------------------------------------------------

The frontend is a major priority.

Before implementing backend functionality, establish a polished visual system.

The application should have:

- excellent typography

- intentional spacing

- clear visual hierarchy

- responsive layouts

- animated state transitions

- interactive product cards

- interactive negotiation states

- smooth page transitions

- meaningful hover states

- loading states

- empty states

- success states

- error states

- keyboard focus states

- reduced-motion support

Every important interaction should provide visual feedback.

Do not animate everything.

Animations must have purpose.

--------------------------------------------------

5. LANDING PAGE

--------------------------------------------------

Create a highly polished landing page.

The landing page should immediately communicate:

"DealMate can find products AND negotiate better prices."

Hero structure:

LEFT:

Small eyebrow:

AI-POWERED SHOPPING NEGOTIATION

Large headline:

"Don't just shop.

Make a deal."

Supporting text explaining that DealMate understands preferences, finds products, negotiates within real seller limits, and lets users order immediately.

Primary CTA:

"Start Deal Hunting"

Secondary CTA:

"See How It Works"

RIGHT:

Create an interactive negotiation preview.

This should look like a real DealMate conversation rather than a static screenshot.

Example interaction:

User:

"I need wireless earbuds under ₹3,000 with strong battery life."

Preference Agent:

"Got it. Any must-have features?"

User:

"Good microphone and low latency."

Deal-Hunter:

"Found 3 strong matches."

Product result appears.

Negotiation Agent:

"I can get these to ₹2,549."

Original:

₹2,999

Negotiated:

₹2,549

Show a visually satisfying price transformation.

The preview should have subtle animation.

Use Motion/Framer Motion for:

- message entrance

- product appearance

- price transition

- discount badge

- negotiation state

- CTA hover

Do not make it feel like a fake chatbot demo with excessive animation.

--------------------------------------------------

6. LANDING PAGE SECTIONS

--------------------------------------------------

After hero:

A compact trust/value strip showing concepts such as:

REAL PRODUCTS

LIVE OFFERS

BOUNDED NEGOTIATION

REAL ORDERS

Then:

"Three agents. One shopping experience."

Create three visually distinct sections/cards:

01

Preference Agent

"Understands what actually matters to you."

02

Deal-Hunter

"Finds the strongest products and active offers."

03

Negotiation Agent

"Pushes for a better deal without breaking seller rules."

Each agent should have its own visual identity:

Preference:

Gold

Deal-Hunter:

Sage

Negotiation:

Coral

Use subtle animated visual elements rather than generic icons alone.

Then create:

"Watch the price move."

Show a premium interactive before/after negotiation visualization.

Then:

"From conversation to checkout."

Visually show:

Tell us what you need

→

Find your matches

→

Negotiate

→

Order

Then final CTA.

--------------------------------------------------

7. AUTHENTICATION EXPERIENCE

--------------------------------------------------

Create a polished authentication page.

Do not make it look like a generic login form.

Use a split-screen or asymmetric layout.

LEFT:

DealMate branding and concise value proposition.

RIGHT:

Login/signup panel.

Support:

- email/password signup

- email/password login

- logout

- persistent session

- validation

- loading states

- errors

- success feedback

Auth page should maintain the same visual language as the landing page.

--------------------------------------------------

8. MAIN SHOPPING EXPERIENCE

--------------------------------------------------

This is the most important screen.

Create:

ChatSessionView

Desktop layout:

approximately:

55% conversational interface

45% product/deal workspace

But the layout must feel dynamic rather than like two rigid columns.

Use:

LEFT:

Conversation

RIGHT:

Matched products / deal workspace

Top navigation:

DealMate logo

Session indicator

Orders

Account

Logout

The interface should feel like an AI shopping workspace.

--------------------------------------------------

9. CHAT EXPERIENCE

--------------------------------------------------

Messages should look premium and compact.

Different agents should be visually identifiable.

Preference Agent:

Gold

Deal-Hunter:

Sage

Negotiation Agent:

Coral

Do NOT rely only on avatars.

Use labels such as:

PREFERENCE AGENT

DEAL-HUNTER

NEGOTIATION AGENT

Add subtle agent-specific visual accents.

The typing indicator should appear quickly after user input.

Use animated typing indicators.

Messages should enter naturally.

Avoid excessive chat bubbles.

The interface should feel closer to a premium AI product than WhatsApp.

--------------------------------------------------

10. PREFERENCE FLOW

--------------------------------------------------

Preference Agent asks at most 3 short questions.

Question 1:

"What are you shopping for?"

Category must be constrained to products in the database.

Example:

Running shoes

Earbuds

Question 2:

"What budget are you working with?"

Collect:

minimum budget

maximum budget

Currency:

INR

Question 3:

"What matters most?"

Allow 1–2 preferences/must-haves.

Examples:

Comfort

Battery life

Low latency

Lightweight

Durability

Return a structured completion object.

Do not ask unnecessary questions.

--------------------------------------------------

11. PRODUCT DISCOVERY

--------------------------------------------------

Deal-Hunter is NOT an LLM.

It should use deterministic database querying and ranking.

Query:

products

Filter by:

category

budget ±15%

Cross-reference:

active live_offers

Rank using:

- category relevance

- budget fit

- tag relevance

- effective price

- active offers

Return top 3.

--------------------------------------------------

12. PRODUCT GRID

--------------------------------------------------

ProductGrid must look visually premium.

Cards should contain:

Product image

Product name

Category

Relevant tags

Original price

Effective price

Discount indicator

Stock status

Negotiation state

Product cards must be clickable.

Use subtle hover interactions:

- slight elevation

- image movement

- border emphasis

- price emphasis

Do NOT use excessive card animation.

Product ordering should animate when ranked results appear.

Use Motion layout animations.

--------------------------------------------------

13. PRODUCT IMAGES

--------------------------------------------------

Use real product images.

Seed at least:

8 products

Exactly 2 categories:

1. Running shoes

2. Earbuds

Example products can include believable retail products.

Do not use copyrighted brand imagery if licensing is unclear.

Prefer appropriate royalty-free or generated product visuals.

Each product should have an image_url.

Images must be optimized and responsive.

--------------------------------------------------

14. NEGOTIATION EXPERIENCE

--------------------------------------------------

This is the signature DealMate interaction.

Negotiation should feel exciting but trustworthy.

Example:

Product:

Running Shoes X

Original:

₹4,999

DealMate:

"I found room to improve this one."

Then:

"₹4,999 → ₹4,399"

Then user:

"Can you do ₹4,000?"

Negotiation Agent:

"I can't go that far, but I can do ₹4,249."

The UI should clearly communicate that DealMate has a seller-defined boundary.

Show:

Seller limit protected

or:

Within seller deal rules

Do NOT expose the actual internal discount-limit configuration.

The user should understand that DealMate cannot negotiate infinitely.

--------------------------------------------------

15. NEGOTIATION RULES

--------------------------------------------------

Hard server-side rules:

Maximum single-item discount:

15%

Maximum bundle discount:

20%

Bundle minimum:

2 items

These rules MUST NOT be enforced only on the frontend.

The server must validate every negotiated price.

LLM output is never trusted directly.

The client must never contain:

- LLM API keys

- seller secret limits

- negotiation authority

The frontend only displays the validated server result.

--------------------------------------------------

16. NEGOTIATION UI

--------------------------------------------------

When negotiation succeeds:

Original price:

₹4,999

Use strikethrough.

Negotiated price:

₹4,249

Make the new price visually dominant.

Use one deliberate scale-in animation.

Do NOT repeatedly animate the price.

The price change should feel satisfying.

Add a small:

DEAL SECURED

state.

--------------------------------------------------

17. ORDER EXPERIENCE

--------------------------------------------------

Clicking the negotiated product opens:

OrderModal

The modal must feel like a premium checkout confirmation.

Include:

Product

Quantity stepper

Negotiated unit price

Delivery address

Subtotal

Total

Confirm Order button

Do not integrate a payment gateway.

The order is a real database record.

On confirmation:

1. Validate user

2. Validate negotiated price

3. Validate stock

4. Atomically decrement stock

5. Insert order

6. Return real order ID

Do not simulate this.

--------------------------------------------------

18. ORDER SUCCESS

--------------------------------------------------

After successful order:

Show a strong success state.

Example:

"Deal locked in."

Then:

Order #DM-XXXX

Product

Quantity

Total

Delivery address

Use subtle celebratory animation.

Do not use excessive confetti.

--------------------------------------------------

19. REALTIME EXPERIENCE

--------------------------------------------------

Use Supabase Realtime.

Realtime changes must propagate without page refresh.

Relevant events:

live_offers changes

stock changes

When a seller changes an active offer in another browser:

the shopper interface updates automatically.

When stock changes:

product availability updates automatically.

Do NOT use polling.

Do NOT use setInterval to fake realtime.

Target:

updates visible within approximately 2 seconds.

--------------------------------------------------

20. ORDERS HISTORY

--------------------------------------------------

Create:

OrdersHistoryPage

Show previous orders in a clean timeline/list.

Each order should display:

Order ID

Product

Quantity

Negotiated price

Total

Date

Status

Also show previous negotiation sessions where useful.

Provide:

empty state

loading state

error state

responsive layout

--------------------------------------------------

21. ADMIN / SELLER VIEW

--------------------------------------------------

Create:

AdminView

This is a lightweight seller dashboard for the demo.

Seller should be able to:

- view products

- change stock

- create/update live offers

- activate/deactivate offers

- see current offer expiry

- view basic order information

The purpose is to demonstrate that the shopper experience is connected to real seller-controlled data.

Do not turn this into a huge admin system.

Keep it focused on the demo.

--------------------------------------------------

22. DATABASE

--------------------------------------------------

Use Supabase Postgres.

Tables:

products

live_offers

negotiation_sessions

conversation_messages

orders

Supabase Auth:

auth.users

products:

id

name

category

price

tags

image_url

stock_count

created_at

live_offers:

id

product_id

discount_pct

expires_at

active

created_at

negotiation_sessions:

id

user_id

created_at

category

budget_min

budget_max

preferences

stage

product_id

final_price

conversation_messages:

id

session_id

role

agent

content

created_at

orders:

id

user_id

product_id

quantity

negotiated_price

delivery_address

created_at

status

Use appropriate:

- foreign keys

- indexes

- constraints

- enums

- timestamps

--------------------------------------------------

23. SECURITY

--------------------------------------------------

Implement Supabase Row Level Security.

Users must only be able to access their own:

negotiation_sessions

conversation_messages

orders

Admin functionality must be protected appropriately.

Never expose:

LLM API keys

seller negotiation limits

service-role keys

private server logic

in the browser.

Use environment variables correctly.

--------------------------------------------------

24. BACKEND AI ARCHITECTURE

--------------------------------------------------

Use Supabase Edge Functions.

Functions:

preference-agent

negotiation-agent

place-order

LLM calls must happen server-side.

Supported LLM providers can include:

OpenAI

or

Anthropic Claude

Keep provider-specific code isolated so it can be changed later.

--------------------------------------------------

25. LLM OUTPUT

--------------------------------------------------

All LLM prompts must require strict JSON.

Server must:

1. Call LLM

2. Parse JSON

3. Validate schema

4. Retry malformed output once

5. Return graceful error if still invalid

Use Zod or equivalent server-side validation.

Never trust raw LLM output.

--------------------------------------------------

26. FRONTEND ARCHITECTURE

--------------------------------------------------

Use this structure:

src/

  components/

    MessageBubble.tsx

    ProductCard.tsx

    ProductGrid.tsx

    AgentSidebar.tsx

    OrderModal.tsx

    ...

  pages/

    LandingPage.tsx

    AuthPage.tsx

    ChatSessionView.tsx

    OrdersHistoryPage.tsx

    AdminView.tsx

  hooks/

  lib/

  services/

  types/

  utils/

  routes/

  styles/

Keep business logic separate from UI wherever practical.

Use TypeScript types/interfaces.

Avoid `any` unless absolutely necessary.

Create reusable UI primitives only where they actually improve maintainability.

--------------------------------------------------

27. RESPONSIVE DESIGN

--------------------------------------------------

The entire application must work from:

360px mobile

to

large desktop screens.

Desktop:

chat + product workspace

Tablet:

adaptive layout

Mobile:

conversation first

products below or accessible through a compact deal panel

The mobile experience must not feel like a shrunken desktop.

Touch targets should be appropriate.

--------------------------------------------------

28. MOTION DESIGN

--------------------------------------------------

Use Motion/Framer Motion where beneficial.

Animations should include:

- page transitions

- message entrance

- typing indicator

- product appearance

- product ranking

- price transition

- modal entrance

- success state

- hover interactions

Respect:

prefers-reduced-motion

When reduced motion is enabled:

remove non-essential movement.

Avoid:

- infinite decorative animations

- excessive bouncing

- constant floating elements

- slow transitions that make the app feel sluggish

--------------------------------------------------

29. MICRO-INTERACTIONS

--------------------------------------------------

Pay attention to:

button hover

button press

input focus

loading states

disabled states

success states

error states

copy order ID

quantity changes

offer expiry

stock updates

negotiation acceptance

Product card hover

Use micro-interactions to make the interface feel alive.

--------------------------------------------------

30. LIVE OFFER EXPIRY

--------------------------------------------------

Live offers should visually communicate remaining validity.

Example:

LIVE DEAL

Ends in 04:21

Do not use fake timers for actual offer validity.

The server/database must remain the source of truth.

The frontend may display a countdown based on expires_at.

--------------------------------------------------

31. EMPTY / LOADING / ERROR STATES

--------------------------------------------------

Every important page must handle:

Loading

Empty

Error

Success

Examples:

No products found

No previous orders

Negotiation unavailable

Offer expired

Product out of stock

Network error

Authentication error

Order failed

Do not leave blank screens.

--------------------------------------------------

32. ACCESSIBILITY

--------------------------------------------------

Implement:

semantic HTML

keyboard navigation

visible focus states

ARIA labels where required

sufficient contrast

accessible modals

accessible buttons

accessible form validation

reduced motion

Do not sacrifice accessibility for visual design.

--------------------------------------------------

33. PERFORMANCE

--------------------------------------------------

Avoid unnecessary re-renders.

Lazy-load pages where appropriate.

Optimize images.

Do not install large libraries unnecessarily.

Do not create expensive animations.

Keep the application responsive even during AI requests.

--------------------------------------------------

34. NO FAKE FUNCTIONALITY

--------------------------------------------------

This rule is extremely important.

Do NOT:

fake authentication

fake database operations

fake order creation

fake stock changes

fake negotiation validation

fake realtime

fake seller limits

fake LLM responses in production code

mock backend functionality that is explicitly required to be real.

The landing-page negotiation preview may use controlled demo data because it is marketing content.

The actual authenticated application must use real backend functionality.

--------------------------------------------------

35. SEED DATA

--------------------------------------------------

Seed at least 8 products.

Exactly two categories:

Running Shoes

Earbuds

Create:

2–3 active live offers

with short expiry windows suitable for demonstrating realtime and expiry behavior.

Ensure products have:

realistic prices

tags

stock counts

images

category

--------------------------------------------------

36. DEMO EXPERIENCE

--------------------------------------------------

The complete demo should feel like this:

User enters DealMate.

User says:

"I need running shoes under ₹5,000."

Preference Agent asks:

"What matters most?"

User:

"Comfort and lightweight."

Deal-Hunter finds 3 products.

Products appear with animated ranking.

Negotiation Agent proactively presents the best match.

User pushes back.

DealMate negotiates within seller rules.

The price changes.

User accepts.

User clicks the negotiated product.

Order modal opens.

User selects quantity and enters address.

Order is created in Supabase.

Stock decreases.

Real order ID appears.

Open seller/admin view in another browser.

Change stock or live offer.

Shopper sees the update without refreshing.

This entire flow must work end-to-end.

--------------------------------------------------

37. CODE QUALITY

--------------------------------------------------

Write production-quality code.

Use:

TypeScript

clear naming

small reusable components

comments only where useful

error handling

loading states

proper types

clean imports

separation of concerns

No dead code.

No unused dependencies.

No placeholder components.

No TODOs for core functionality.

No "coming soon" sections.

--------------------------------------------------

38. DEVELOPMENT PROCESS

--------------------------------------------------

DO NOT immediately generate the entire application.

First:

Analyze this specification.

Then produce a detailed implementation plan divided into:

PHASE 1

Project setup + design system

PHASE 2

Supabase database + RLS

PHASE 3

Authentication

PHASE 4

Frontend landing page

PHASE 5

Chat experience

PHASE 6

Preference Agent

PHASE 7

Deal-Hunter

PHASE 8

Negotiation Agent

PHASE 9

Realtime

PHASE 10

Atomic order placement

PHASE 11

Orders history

PHASE 12

Admin/Seller view

PHASE 13

Responsive polish + animations

PHASE 14

Testing

PHASE 15

Deployment

For every phase specify:

- files created/modified

- dependencies

- database changes

- security implications

- implementation steps

- tests

- prerequisites

Do not write the complete implementation yet.

STOP after presenting the plan.

Wait for approval before starting Phase 1.

--------------------------------------------------

39. IMPORTANT AI CODING RULE

--------------------------------------------------

Do not make architectural decisions silently.

If an implementation choice materially affects:

security

database structure

frontend architecture

performance

maintainability

or deployment,

explain the decision briefly before implementing it.

Never replace an explicit requirement with an easier mock implementation.

--------------------------------------------------

40. FINAL QUALITY BAR

--------------------------------------------------

The final result should look like a real startup product that could be shown in:

- a hackathon

- a startup demo

- a portfolio

- a product presentation

- an investor demo

The most important feeling should be:

"Wow, this actually feels like a real AI shopping product."

The UI should be visually impressive without becoming confusing.

The negotiation interaction should be the visual centerpiece.

The application must remain understandable, usable, responsive, accessible, and maintainable.

Build the experience, not just the features. 
Use This Image As A Logo And Make The Frontend And Backend Both Easily Accessable

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/193625d6-6ac0-412a-9190-24414f7992b0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
