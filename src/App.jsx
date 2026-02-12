import { useState, useEffect, useCallback, useRef } from "react";

const STORE_KEY = "quietly-board-v12";
const START_DATE = "2026-02-11";

// ============ VISION & NORTH STAR ============
const VISION_90 = "By May 2026, Julia's system runs autonomously, we have 2 paying clients, and outreach generates 3+ discovery calls per week.";
const YEAR_GOAL = "By Dec 2026 — 10 paying clients, $100K+ revenue, Quietly is the go-to AI automation partner for Montreal professional services.";
const NORTH_STAR = { label: "Conversations started", icon: "💬", description: "Two-way conversations with potential clients this week" };
const EXPERIMENTS = { label: "Experiments run", icon: "🧪", description: "Outreach variations, pitch tests, process tweaks tried this week" };

const ROADMAP = [
  { month:"Feb", label:"Foundation", status:"now", focus:"Legal, Julia discovery call, LinkedIn profiles set up, first experiments",
    milestone:"Partnership signed. Julia build started. LinkedIn profiles live." },
  { month:"Mar", label:"First proof", status:"future", focus:"Julia build complete, case study written, outreach engine running daily",
    milestone:"Julia system live. 200+ outreach messages sent. 3–5 discovery calls booked." },
  { month:"Apr", label:"Pipeline", status:"future", focus:"Close first paying client, refine pitch from call learnings, content rhythm",
    milestone:"1 paying client ($8K+). 3 LinkedIn posts/week. Repeatable outreach process." },
  { month:"May", label:"Traction", status:"future", focus:"Second client, Julia case study driving inbound, refine delivery process",
    milestone:"2 paying clients. Julia runs autonomously. 3+ calls/week from outreach." },
  { month:"Jun–Aug", label:"Scale", status:"future", focus:"Hire help or systematize delivery, expand to clinics, raise prices",
    milestone:"4–5 clients. $50K+ cumulative revenue. Second vertical explored." },
  { month:"Sep–Dec", label:"Authority", status:"future", focus:"Inbound leads from content, referrals, known name in Montreal RE/clinic AI",
    milestone:"10 clients. $100K+ revenue. Quietly is the go-to." },
];

// ============ DAILY EXPERIMENTS ============
// 60 experiments, 2 per day = 30-day rotation. Each is specific enough to run in <30 min.
// Tagged by discipline: outreach, positioning, product, process, content, psychology
const experimentBank = [
  // ===== PHASE 1: FOUNDATION (Days 0-13) — Setup before execution =====
  // Annie: LinkedIn profile build
  { id:"f1", owner:"Annie", phase:1, cat:"positioning", title:"Write your LinkedIn headline — test 3 versions",
    hyp:"The headline is the first thing anyone sees. Transformation statement outperforms job title.",
    action:"Write 3: (A) 'Cofounder @ Quietly — AI Automation' (B) 'I build AI systems that handle the work you hate' (C) 'Psychology grad turned AI builder.' Ask 3 people which makes them want to click.",
    measure:"Which gets the most 'tell me more'? Pick that one.",
    credit:"📕 DOAC Law 18 — First 5 Seconds" },
  { id:"f2", owner:"Annie", phase:1, cat:"positioning", title:"Write your LinkedIn About section",
    hyp:"Story-first outperforms resume-style.",
    action:"Mini story: (1) Dion drowning in admin (2) You combined psych + tech (3) Quietly handles the boring stuff (4) CTA: 'If you're curious, let's talk.' Under 200 words.",
    measure:"Read aloud. Would a stranger get what you do in 10 seconds?",
    credit:"📕 DOAC Law 7 — Self-Story + StoryBrand" },
  { id:"f10", owner:"Annie", phase:1, cat:"psychology", title:"Write your private 'why' anchor",
    hyp:"Knowing WHY sustains you through the cringe of early posting.",
    action:"Write privately: Why Quietly? What does it mean? What person do I want to become? Not for posting — your anchor on bad days.",
    measure:"Does it make you feel something? Would it pull you forward?",
    credit:"📕 DOAC Law 22 — Plan-A Thinker + 📗 Atomic Habits — Identity" },
  { id:"f4", owner:"Annie", phase:1, cat:"content", title:"Write + publish your intro post",
    hyp:"Honest 'here's who I am' posts work because people root for founders.",
    action:"Post: 'I'm Annie. Psych degree from McGill, modeled 10 years, became a broker, now building AI with my husband. Here's why...' End with a question.",
    measure:"Impressions, comments, connection requests in 48hrs. This is your baseline.",
    credit:"📕 DOAC Law 7 — Self-Story" },
  { id:"f5", owner:"Annie", phase:1, cat:"positioning", title:"Connect with 50 target prospects",
    hyp:"You need audience before testing anything. 50 right people > 500 random.",
    action:"Search: Montreal RE brokers, PMs, clinic owners. 50 connection requests with short personal note (NOT a pitch): 'Building in [their space] in Montreal, would love to connect.'",
    measure:"Acceptance rate. Aim 40%+. Below 30% = profile needs work.",
    credit:"📕 DOAC Law 1 — Fill Your Five Buckets" },
  { id:"f6", owner:"Annie", phase:1, cat:"content", title:"Build a swipe file — study 5 founders who post well",
    hyp:"Understanding what works saves weeks of trial and error.",
    action:"Find 5 small agency/service founders with strong LinkedIn. Save 3 high-engagement posts each. Note: hook style, length, story vs insight, CTA format.",
    measure:"Swipe file created? Top 3 formats identified to try first?",
    credit:"📕 DOAC Law 19 — Sweat the Small Stuff" },
  { id:"f7", owner:"Annie", phase:1, cat:"psychology", title:"Define your 3 content pillars",
    hyp:"3 clear topics = memorable and followable. Everything = confusing.",
    action:"Pick 3: (1) Building Quietly — founder journey (2) AI for RE/clinics — expertise (3) Psychology of work — unique angle. Write 2 post ideas per pillar.",
    measure:"Can you say what you post about in one sentence?",
    credit:"📕 DOAC Law 11 — Avoid Wallpaper" },
  { id:"f8", owner:"Annie", phase:1, cat:"content", title:"Draft your 3-touch outreach DM sequence",
    hyp:"Writing before you need it = sending from calm, not desperation.",
    action:"(1) Warm intro, no pitch, one question (2) 3 days later: share something useful (3) 7 days later: soft ask for 15-min chat. Get Dion's feedback.",
    measure:"Read aloud. Human or template? Would YOU reply?",
    credit:"📕 DOAC Law 3 — Open With Common Ground" },
  { id:"f9", owner:"Annie", phase:1, cat:"positioning", title:"Set posting schedule + batch first week",
    hyp:"Consistency > frequency. 3x/week sustainable beats daily burnout.",
    action:"Pick 3 days + times. Calendar block. Set reminders. Write week 1's 3 posts in one sitting.",
    measure:"Posts written and scheduled? Decision fatigue removed?",
    credit:"📗 Atomic Habits — Implementation Intentions" },
  { id:"f3", owner:"Annie", phase:1, cat:"content", title:"Profile photo + banner image",
    hyp:"Visual first impression — professional but human > corporate headshot.",
    action:"Approachable photo (not modeling shot — creates distance). Canva banner that shows what Quietly does at a glance.",
    measure:"Ask 3 people: 'What does this person do?' in 3 seconds. Can't answer? Iterate.",
    credit:"📕 DOAC Law 15 — The Frame Matters" },
  // Dion: outreach setup & Julia documentation
  { id:"f11", owner:"Dion", phase:1, cat:"outreach", title:"Audit your LinkedIn for broker credibility",
    hyp:"9 years as a broker IS the credibility. Lead with that.",
    action:"Headline: '9 years in RE → now building AI for the admin I used to drown in.' About = your real story. Add broker experience prominently.",
    measure:"Ask a broker friend: 'Would you trust this person to get your problems?'",
    credit:"📕 DOAC Law 26 — Your Context Is Valuable" },
  { id:"f12", owner:"Dion", phase:1, cat:"outreach", title:"Map your existing broker network",
    hyp:"Warm outreach is 5-10x more effective than cold.",
    action:"Phone + LinkedIn + old email. List every RE person you know. Star top 10 closest — these are first conversations, not cold outreach.",
    measure:"How many names? Target: 20+.",
    credit:"📕 DOAC Law 1 — Five Buckets" },
  { id:"f13", owner:"Dion", phase:1, cat:"outreach", title:"3 coffee chats with broker friends",
    hyp:"Before pitching anyone, understand pain from people who'll be honest.",
    action:"Call 3 friends. Not a pitch: 'Can I pick your brain? Building something, want to solve a real problem.' Ask: biggest admin headache? What've you tried? What would you pay?",
    measure:"Write their exact words — this becomes your outreach language.",
    credit:"Mom Test + 📕 DOAC Law 6 — Ask, Don't Tell" },
  { id:"f14", owner:"Dion", phase:1, cat:"product", title:"Prepare Julia discovery call questions",
    hyp:"Structured questions get 10x better answers than winging it.",
    action:"Write 10 specific questions for the Julia call: What's the exact flow when a tenant reports an issue? How many steps? Who's involved? What tool? What falls through the cracks? How many hrs/week?",
    measure:"Are your questions specific enough to map a full workflow from answers alone?",
    credit:"📕 DOAC Law 13 — Psychological Moonshots" },
  { id:"f15", owner:"Dion", phase:1, cat:"product", title:"Choose + set up a simple tracking system",
    hyp:"Simple tracking from day 1 prevents chaos. You don't need a fancy tool — just a system.",
    action:"HubSpot Free (recommended) or Notion table. Fields: Name, Company, Source (warm/cold), Status (not contacted → messaged → replied → call → done), Notes. Import your warm contact list.",
    measure:"Every known contact loaded? Can you filter by status?",
    credit:"📕 DOAC Law 20 — Small Miss → Big Miss" },
  { id:"f16", owner:"Dion", phase:1, cat:"outreach", title:"Write your warm contact message",
    hyp:"Dion-the-broker-they-know converts differently than Dion-the-AI-cofounder.",
    action:"'Hey [name], after 9 years in RE, I got tired of [pain] and started automating it. Looking for brokers open to trying it — no cost, just honest feedback.' Send to top 3 today.",
    measure:"Read aloud. Sounds like you? Did you actually send 3?",
    credit:"📕 DOAC Law 7 — Self-Story" },
  { id:"f17", owner:"Dion", phase:1, cat:"product", title:"Create a 'what we build' one-pager for conversations",
    hyp:"Having a simple visual to show people makes every coffee chat more productive.",
    action:"One page: (1) Problem — brokers spend X hrs on admin (2) Solution — we automate it with AI (3) Example — tenant request flow before/after (4) Why us — 9 yrs RE experience. Can be Canva, Google Doc, or Notion page.",
    measure:"Show to someone outside RE. Do they get it in 30 seconds?",
    credit:"📕 DOAC Law 18 — First 5 Seconds + StoryBrand" },
  { id:"f18", owner:"Dion", phase:1, cat:"process", title:"Create outreach tracking template",
    hyp:"What gets measured gets managed.",
    action:"Daily row in your tracker: Date, DMs Sent, Replies, Calls Booked. Feeds North Star on the board.",
    measure:"Can you fill it in under 2 min? If longer, simplify.",
    credit:"📕 DOAC Law 19 — Kaizen" },
  // Both: foundation rituals
  { id:"f19", owner:"Both", phase:1, cat:"process", title:"Define your daily standup",
    hyp:"5-min check-in prevents drift and catches blocks early.",
    action:"Pick time (9am?). Each says: (1) #1 task (2) Blocked? (3) One thing learned yesterday. 5-min timer — stop when it rings.",
    measure:"Did you do it daily this week?",
    credit:"Scrum standup + 📕 DOAC Law 19" },
  { id:"f20", owner:"Both", phase:1, cat:"positioning", title:"Finalize your elevator pitch",
    hyp:"Can't explain Quietly in 15 seconds = fumble every conversation.",
    action:"Each write 15-sec pitch alone. Compare. Combine. Practice 5x aloud. Must answer: What? For whom? What changes?",
    measure:"Both say it naturally? Actually under 15 seconds?",
    credit:"📕 DOAC Law 18 + StoryBrand" },
  { id:"f21", owner:"Both", phase:1, cat:"process", title:"Set weekly reflection time",
    hyp:"Unscheduled rituals die in 2 weeks.",
    action:"Block Friday 4pm. Both calendars. Non-negotiable. Use Pulse tab questions.",
    measure:"Both showed up? If not, fix time or format.",
    credit:"📗 Atomic Habits + 📕 DOAC Law 20" },
  // --- OUTREACH: LinkedIn DM variations ---
  { id:"x1", owner:"Dion", phase:2, cat:"outreach", title:"Pain-first vs compliment-first DMs",
    hyp:"Opening with the prospect's pain point gets more replies than opening with a compliment about their work.",
    action:"Send 5 DMs that start with 'I noticed [specific admin pain they likely have]...' and 5 that start with 'Loved your recent [listing/post/achievement]...' — same CTA on both.",
    measure:"Reply rate within 48 hours. Screenshot both batches.",
    credit:"📕 DOAC Law 18 — Fight for the First 5 Seconds" },
  { id:"x2", owner:"Dion", phase:2, cat:"outreach", title:"Question-hook vs statement-hook",
    hyp:"DMs that open with a genuine question get more engagement than those that open with a claim.",
    action:"A: 'Quick question — how many hours a week do you spend on tenant requests?' B: 'Most property managers I've talked to spend 10+ hours a week on tenant requests.' Send 5 of each.",
    measure:"Reply rate + quality of reply (one-word vs conversation-starting).",
    credit:"📕 DOAC Law 6 — Ask, Don't Tell" },
  { id:"x3", owner:"Dion", phase:2, cat:"outreach", title:"Short vs long first message",
    hyp:"A 2-sentence DM outperforms a 5-sentence DM for cold outreach to busy brokers.",
    action:"A: 2 sentences max (pain + question). B: 5 sentences (context + social proof + pain + solution hint + question). 5 each, same prospect profile.",
    measure:"Reply rate. Time-to-reply.",
    credit:"Copyblogger / Direct response copywriting" },
  { id:"x4", owner:"Dion", phase:2, cat:"outreach", title:"Personal detail DM opener",
    hyp:"Referencing something specific from their profile (a post, listing, or achievement) dramatically increases reply rate.",
    action:"Spend 2 min per prospect reading their recent activity. Open with 'I saw your [specific thing] and it made me think...' Compare to generic opener batch from yesterday.",
    measure:"Reply rate. Does the personalization add enough lift to justify 2 min/prospect?",
    credit:"Chris Voss — Never Split the Difference (tactical empathy)" },
  { id:"x5", owner:"Dion", phase:2, cat:"outreach", title:"Voice note vs text DM",
    hyp:"A 30-second LinkedIn voice note feels more human and gets higher reply rates than text.",
    action:"Send 5 voice DMs (keep under 40 sec, warm tone, one question at the end). Compare to 5 text DMs with identical content.",
    measure:"Reply rate + response warmth (scale 1-5).",
    credit:"📕 DOAC Law 15 — The Frame Matters More Than the Picture" },
  { id:"x6", owner:"Dion", phase:2, cat:"outreach", title:"Loom video DM",
    hyp:"A 60-sec Loom showing one specific pain point from their website gets attention because it's absurdly high-effort for a cold message.",
    action:"Pick 3 real estate brokerages. Record a 60-sec Loom for each showing one thing you'd automate on their site. Send with a 1-line DM: 'Made this for you — curious what you think.'",
    measure:"Reply rate, meeting booked rate. Track time invested per Loom.",
    credit:"📕 DOAC Law 10 — Useless Absurdity Defines You + Alex Hormozi ($100M Leads)" },
  { id:"x7", owner:"Dion", phase:2, cat:"outreach", title:"Second-touch timing test",
    hyp:"Following up exactly 3 days after no reply outperforms 7 days.",
    action:"Split your no-replies into two groups. Follow up group A on day 3, group B on day 7. Same follow-up message.",
    measure:"Reply rate on follow-up. Track if day-3 feels pushy (any negative responses?).",
    credit:"Salesforce research on optimal follow-up cadence" },
  { id:"x8", owner:"Dion", phase:2, cat:"outreach", title:"The 'I built this for someone like you' DM",
    hyp:"Showing Julia's system (anonymized) as a real case study makes the offer tangible and irresistible.",
    action:"Create a 3-screenshot sequence: before (messy inbox), the automation flow, after (clean dashboard). DM 5 property managers: 'Just finished building this for a PM in Montreal — thought of you.'",
    measure:"Reply rate + 'tell me more' rate.",
    credit:"📕 DOAC Law 13 — Psychological Moonshots + Show Don't Tell" },
  // --- OUTREACH: Channel experiments ---
  { id:"x9", owner:"Both", phase:2, cat:"outreach", title:"LinkedIn comment-first strategy",
    hyp:"Commenting thoughtfully on a prospect's post for 3 days before DMing creates warm familiarity.",
    action:"Pick 5 prospects. Comment genuinely on their posts for 3 consecutive days (not 'great post!' — add real value). DM on day 4. Compare reply rate to cold DMs.",
    measure:"Reply rate + tone of reply (warm vs guarded).",
    credit:"Gary Vaynerchuk — Jab Jab Jab Right Hook" },
  { id:"x10", owner:"Dion", phase:2, cat:"outreach", title:"Email vs LinkedIn for clinic outreach",
    hyp:"Clinic managers check email more than LinkedIn — email might outperform for that vertical.",
    action:"Find 10 clinics. Send 5 cold LinkedIn DMs and 5 cold emails (same message, adapted for format). Use a free email finder tool.",
    measure:"Reply rate per channel. Which gets faster responses?",
    credit:"HubSpot channel research + 📕 DOAC Law 21 — Out-Fail the Competition" },
  // --- POSITIONING: How you describe Quietly ---
  { id:"x11", owner:"Annie", phase:2, cat:"positioning", title:"One-liner A/B test",
    hyp:"Leading with the outcome ('Your phone stops ringing at midnight') outperforms leading with the mechanism ('AI-powered automation').",
    action:"Use outcome-first description in today's 5 outreach messages. Compare to yesterday's mechanism-first batch. Could also test in LinkedIn headline.",
    measure:"Reply rate + 'how does that work?' question rate (shows curiosity).",
    credit:"Donald Miller — StoryBrand framework (lead with transformation)" },
  { id:"x12", owner:"Annie", phase:2, cat:"positioning", title:"'We only take 3 clients' scarcity test",
    hyp:"Mentioning limited capacity increases urgency and perceived quality.",
    action:"Add 'We only onboard 3 clients per quarter so we can obsess over every detail' to 5 DMs. Compare to 5 without it.",
    measure:"Reply rate + quality of reply. Does it feel authentic or salesy?",
    credit:"📕 DOAC Law 15 — The Frame + Cialdini's Scarcity principle" },
  { id:"x13", owner:"Both", phase:2, cat:"positioning", title:"Annie's origin story vs Dion's origin story",
    hyp:"Dion's '9 years drowning in admin' broker story resonates more with broker prospects than Annie's diverse background.",
    action:"Send 5 DMs from Annie's angle ('As someone who's modeled, studied psych, and sold real estate...') and 5 from Dion's angle ('After 9 years as a broker, I was drowning in...'). Same CTA.",
    measure:"Reply rate. Which story creates more 'me too' responses?",
    credit:"📕 DOAC Law 7 — Never Compromise Your Self-Story" },
  { id:"x14", owner:"Both", phase:2, cat:"positioning", title:"Price anchor test",
    hyp:"Mentioning 'clients typically invest $8-15K' early filters serious prospects and increases perceived value.",
    action:"In 3 discovery conversations this week, mention the price range in the first 5 minutes vs waiting until they ask. Note reaction.",
    measure:"Did they stay engaged? Ask more questions? Or go quiet?",
    credit:"📕 DOAC Law 15 — The Frame + Dan Ariely — Predictably Irrational" },
  // --- CONTENT: LinkedIn posts ---
  { id:"x15", owner:"Annie", phase:2, cat:"content", title:"Contrarian take vs helpful tip post",
    hyp:"A contrarian opinion ('Most real estate automation is garbage — here's why') gets more engagement than a helpful tip ('3 ways to automate your follow-ups').",
    action:"Write both posts. Publish the contrarian one today. Publish the tip one tomorrow. Same length, same posting time.",
    measure:"Impressions, comments, profile views, DMs received within 48hrs.",
    credit:"📕 DOAC Law 12 — You Must Piss People Off" },
  { id:"x16", owner:"Annie", phase:2, cat:"content", title:"Story post vs insight post",
    hyp:"'I used to spend 3 hours every night answering tenant emails...' outperforms 'Here are 5 signs you need automation.'",
    action:"Write a personal narrative post from Dion's real experience. Compare engagement to the last insight/listicle post.",
    measure:"Impressions, saves, DMs. Do stories drive more inbound conversations?",
    credit:"📕 DOAC Law 18 — First 5 Seconds + Seth Godin (marketing is storytelling)" },
  { id:"x17", owner:"Annie", phase:2, cat:"content", title:"Behind-the-scenes build post",
    hyp:"Showing the actual n8n workflow you're building for Julia makes AI tangible and non-scary.",
    action:"Screenshot or record a 30-sec clip of the live automation workflow. Post: 'Here's what happens behind the scenes when a tenant sends a maintenance request to our client.' No jargon.",
    measure:"Saves (people bookmark useful stuff), DMs, comments asking 'can you build this for me?'",
    credit:"📕 DOAC Law 13 — Psychological Moonshots (make the invisible visible)" },
  { id:"x18", owner:"Annie", phase:2, cat:"content", title:"Posting time experiment",
    hyp:"7:30am EST (brokers checking phone before showings) outperforms 12pm for LinkedIn engagement.",
    action:"Post identical-quality content at 7:30am this week and 12pm next week (or alternate days). Same content type.",
    measure:"Impressions at 24hr mark. When do brokers actually scroll?",
    credit:"Hootsuite/Buffer research on LinkedIn optimal posting" },
  { id:"x19", owner:"Annie", phase:2, cat:"content", title:"Carousel vs text-only post",
    hyp:"A visual carousel ('5 tasks AI handles for brokers while they sleep') gets more saves and shares than a text post with the same info.",
    action:"Create a simple 5-slide carousel in Canva (1 task per slide, clean design). Compare to a text-only version.",
    measure:"Impressions, saves, shares, profile visits.",
    credit:"LinkedIn algorithm research (carousels get 3x dwell time)" },
  { id:"x20", owner:"Annie", phase:2, cat:"content", title:"Poll for market research",
    hyp:"A LinkedIn poll ('What takes the most time in your brokerage? A) Leads B) Follow-ups C) Paperwork D) Tenant requests') generates both data and visibility.",
    action:"Post the poll. Every voter is a warm prospect — check their profile. DM anyone who picks C or D.",
    measure:"Number of votes, profile quality of voters, DM conversion rate from voters.",
    credit:"📕 DOAC Law 6 — Ask, Don't Tell + Growth hacking (poll-to-DM funnel)" },
  // --- PRODUCT & DELIVERY ---
  { id:"x21", owner:"Dion", phase:2, cat:"product", title:"Demo video vs live demo preference",
    hyp:"Prospects prefer a 2-min pre-recorded demo they can watch anytime over scheduling a live call.",
    action:"Create a polished 2-min Loom showing Julia's automation in action (anonymized). Offer next 5 prospects 'Want to see a quick 2-min video or hop on a call?' Track which they pick.",
    measure:"Preference ratio. Does video-first lead to more calls or fewer?",
    credit:"Product-led growth (Dropbox's famous demo video)" },
  { id:"x22", owner:"Dion", phase:2, cat:"product", title:"Free audit as lead magnet",
    hyp:"Offering a free 15-min 'automation audit' of their current workflow converts better than pitching a build.",
    action:"DM 5 prospects: 'I'll do a free 15-min audit of your workflow and show you exactly where you're leaking time — no strings.' Compare to 5 pitching the service directly.",
    measure:"Reply rate, call booking rate.",
    credit:"Alex Hormozi — $100M Leads (give away the diagnosis, sell the cure)" },
  { id:"x23", owner:"Both", phase:2, cat:"product", title:"ROI calculator as conversation tool",
    hyp:"Showing '10 hrs/week × $50/hr × 52 weeks = $26K/year you're burning' makes the $8-15K price feel like a no-brainer.",
    action:"Build a simple ROI calculator (or do it manually in a DM). Use it with the next 3 prospects. Do they light up at the math?",
    measure:"Prospect reaction. Does the math create urgency?",
    credit:"📕 DOAC Law 13 — Psychological Moonshots + Value-based selling" },
  { id:"x24", owner:"Dion", phase:2, cat:"product", title:"Pilot offer: one workflow free",
    hyp:"'Let us automate one workflow for free — if you love it, we'll build the rest' reduces risk and gets feet in doors.",
    action:"Offer this to 3 warm prospects. One specific workflow (e.g., 'We'll automate your showing confirmations for free this week').",
    measure:"Acceptance rate. Does it lead to full engagement or do they ghost after the freebie?",
    credit:"📕 DOAC Law 17 — Let Them Try and They Will Buy" },
  // --- PROCESS: Internal experiments ---
  { id:"x25", owner:"Both", phase:2, cat:"process", title:"Morning standup check-in",
    hyp:"A 5-min standup at 9am where Annie and Dion each say their #1 priority prevents drift and increases accountability.",
    action:"Try a 5-min call every morning this week. Each person says: (1) My #1 task today, (2) Am I blocked on anything? Time it — stop at 5 min.",
    measure:"Did you both finish your #1 task more often? Rate the week 1-10 vs last week.",
    credit:"Scrum methodology + 📕 DOAC Law 19 — Sweat the Small Stuff" },
  { id:"x26", owner:"Both", phase:2, cat:"process", title:"Deep work blocks",
    hyp:"Blocking 2 hours (no Slack, no phone) for focused build work produces more output than scattered work throughout the day.",
    action:"Both Annie and Dion: block 9-11am as 'deep work.' Phone on airplane mode. Track what you shipped in those 2 hours vs a normal morning.",
    measure:"Number of tasks completed by noon. Subjective focus rating 1-10.",
    credit:"Cal Newport — Deep Work" },
  { id:"x27", owner:"Dion", phase:2, cat:"process", title:"Batch outreach vs spread outreach",
    hyp:"Sending all 5 DMs in one 30-min batch is faster and better than spreading them across the day.",
    action:"Monday: batch all 5 DMs in one sitting. Tuesday: spread them out (1 every 2 hours). Compare quality and how drained you feel.",
    measure:"Time spent total. Quality of messages (re-read them). Energy level at end of day.",
    credit:"Tim Ferriss — The 4-Hour Workweek (batching principle)" },
  { id:"x28", owner:"Dion", phase:2, cat:"process", title:"Tracker update cadence",
    hyp:"Updating your tracker immediately after each conversation (not at end of day) captures better notes and takes less time.",
    action:"Today: update tracker within 5 min of each conversation. Tomorrow: update at end of day as usual. Compare note quality. Use Notion, Google Sheet, or even Apple Notes — whatever you'll actually use.",
    measure:"Time spent logging. Richness of notes (count specific details captured).",
    credit:"GTD methodology — capture at the point of inspiration" },
  // --- PSYCHOLOGY: Buyer behavior ---
  { id:"x29", owner:"Dion", phase:2, cat:"psychology", title:"Social proof in DMs",
    hyp:"Mentioning 'We're building this for another broker in Montreal right now' creates FOMO and urgency.",
    action:"Add a social proof line to 5 DMs: 'We just started building a system like this for another [broker/PM] in Montreal.' Compare to 5 without.",
    measure:"Reply rate + quality. Does social proof make them curious or suspicious?",
    credit:"Cialdini — Influence (social proof principle) + 📕 DOAC Law 29 — Cult Mentality" },
  { id:"x30", owner:"Annie", phase:2, cat:"psychology", title:"Loss framing vs gain framing",
    hyp:"'You're losing 10 hours a week to admin' hits harder than 'You could save 10 hours a week.'",
    action:"Send 5 loss-framed DMs ('Every week without automation, you're losing...') and 5 gain-framed ('Imagine getting back 10 hours...'). Same prospects profile.",
    measure:"Reply rate. Which framing generates more emotional responses?",
    credit:"Kahneman & Tversky — Prospect Theory (loss aversion)" },
  { id:"x31", owner:"Dion", phase:2, cat:"outreach", title:"Mutual connection intro request",
    hyp:"Asking a mutual LinkedIn connection for an intro converts 3-5x better than cold outreach.",
    action:"Find 3 prospects who share a mutual connection with Annie or Dion. Ask the mutual for a warm intro. Compare conversion to cold.",
    measure:"Intro acceptance rate, meeting booking rate.",
    credit:"Network science + 📕 DOAC Law 1 — Fill Your Five Buckets (network bucket)" },
  { id:"x32", owner:"Annie", phase:2, cat:"content", title:"'Day in the life' building Quietly",
    hyp:"Founder journey content creates parasocial investment — people root for you and eventually buy.",
    action:"Post a raw, honest 'here's what building an AI company actually looks like' post. Include a real struggle, not just wins.",
    measure:"Engagement + DMs. Do people relate? Do they share?",
    credit:"📕 DOAC Law 7 — Self-Story + Gary Vee (document, don't create)" },
  { id:"x33", owner:"Dion", phase:2, cat:"positioning", title:"Vertical-specific language test",
    hyp:"Using exact real estate jargon ('listing coordination,' 'showing feedback,' 'deal pipeline') signals insider credibility.",
    action:"Rewrite 5 DMs using hyper-specific industry terms vs generic business language. Same structure, different vocabulary.",
    measure:"Reply rate + tone of replies. Do they treat you as an insider or outsider?",
    credit:"📕 DOAC Law 26 — Your Context Is Valuable" },
  { id:"x34", owner:"Dion", phase:2, cat:"outreach", title:"The 'noticed you're hiring' angle",
    hyp:"Reaching out to brokerages that are hiring admin staff means they're in active pain — perfect timing for an automation pitch.",
    action:"Search LinkedIn/Indeed for Montreal brokerages hiring admin or transaction coordinators. DM: 'Noticed you're hiring for admin — curious if you've considered what AI could handle instead?'",
    measure:"Reply rate. Is this angle more relevant than generic outreach?",
    credit:"Timing-based selling + 📕 DOAC Law 5 — Lean In to Bizarre Behaviour" },
  { id:"x35", owner:"Dion", phase:2, cat:"product", title:"Before/after screenshot proof",
    hyp:"A visual before/after of a real client's workflow (messy → clean) is more persuasive than any description.",
    action:"Create a polished before/after image from Julia's project. Use in next 5 outreach messages as an attachment.",
    measure:"Reply rate when image is included vs text-only.",
    credit:"📕 DOAC Law 15 — The Frame Matters + Direct response (proof elements)" },
  { id:"x36", owner:"Annie", phase:2, cat:"psychology", title:"The 'what would you do with 10 extra hours?' question",
    hyp:"Making prospects imagine the outcome (not the product) creates desire.",
    action:"End 5 DMs with: 'Genuine question — if you got 10 hours back every week, what would you do with them?' Track what people say.",
    measure:"Reply rate + depth of response. This also reveals their real motivation for follow-up conversations.",
    credit:"Motivational interviewing + 📕 DOAC Law 6 — Ask, Don't Tell" },
  { id:"x37", owner:"Annie", phase:2, cat:"content", title:"Comment engagement sprint",
    hyp:"Spending 20 min commenting on other people's posts drives more profile visits than posting your own content.",
    action:"Set a timer for 20 min. Leave thoughtful comments on 10 posts from people in your target market. Not 'great post' — real insights.",
    measure:"Profile views in next 24hrs. Compare to a day you only posted.",
    credit:"📕 DOAC Law 19 — Sweat the Small Stuff + LinkedIn algorithm (comments > posts for reach)" },
  { id:"x38", owner:"Dion", phase:2, cat:"outreach", title:"Weekend DM test",
    hyp:"DMs sent Sunday evening get opened Monday morning when inboxes are fresh — higher visibility.",
    action:"Send 5 DMs on Sunday 7pm. Compare open/reply rate to same messages sent Tuesday morning.",
    measure:"Reply rate + time-to-reply.",
    credit:"Email marketing timing research (Sunday sends)" },
  { id:"x39", owner:"Both", phase:2, cat:"process", title:"Weekly pre-mortem session",
    hyp:"Spending 15 min on Sunday asking 'What could go wrong this week?' prevents at least one fire.",
    action:"Sit down together Sunday evening. List 3 things that could derail the week. Write one preventive action for each.",
    measure:"Did any of the 3 things actually happen? Was the prevention effective? Rate the week.",
    credit:"📕 DOAC Law 25 — Negative Manifestation + Gary Klein (pre-mortem technique)" },
  { id:"x40", owner:"Annie", phase:2, cat:"positioning", title:"The 'anti-agency' positioning test",
    hyp:"Saying 'We're not an agency — we're two obsessive builders who only work with 3 clients at a time' resonates more than professional agency framing.",
    action:"Use anti-agency framing in today's outreach and LinkedIn activity. Compare to previous agency-style messaging.",
    measure:"Engagement quality. Do people respond differently to 'boutique builders' vs 'AI automation agency'?",
    credit:"📕 DOAC Law 10 — Useless Absurdity + 📕 DOAC Law 12 — Piss People Off" },
  // --- EXTRA: Advanced experiments for later weeks ---
  { id:"x41", owner:"Dion", phase:2, cat:"product", title:"Automate your own outreach tracking",
    hyp:"Building a simple automation for your own DM tracking reveals friction points you can then solve for clients.",
    action:"Build a quick n8n flow or Notion automation that logs every DM sent, reply received, and next action. Dogfood your own product.",
    measure:"Time saved vs manual tracking. Insights about your own workflow that translate to client pitch points.",
    credit:"📕 DOAC Law 19 — Kaizen + Dogfooding (eat your own cooking)" },
  { id:"x42", owner:"Dion", phase:2, cat:"outreach", title:"Industry event proximity outreach",
    hyp:"Reaching out around an industry event ('Heading to [event]? Would love to chat about...') creates a natural reason to connect.",
    action:"Find the next Montreal real estate networking event or webinar. DM 5 people attending: 'Are you going to [event]? I'm curious about...'",
    measure:"Reply rate. Does the event context make the DM feel more natural?",
    credit:"Warm outreach principles + 📕 DOAC Law 14 — Friction Can Create Value" },
  { id:"x43", owner:"Annie", phase:2, cat:"content", title:"Client success micro-story",
    hyp:"A 4-sentence story about one specific result for Julia ('Julia used to get midnight tenant calls. Now...') outperforms general capability posts.",
    action:"Write and post: 'Our first client used to [specific pain]. Last week, [specific result]. The system cost [effort]. She hasn't [pain] since.' Real numbers, real result.",
    measure:"Engagement + DMs. Specificity should dramatically outperform generic posts.",
    credit:"📕 DOAC Law 18 — First 5 Seconds + Made to Stick (concrete, credible stories)" },
  { id:"x44", owner:"Dion", phase:2, cat:"psychology", title:"Reciprocity trigger: give value first",
    hyp:"Sending a genuinely useful resource (article, template, tool) before pitching creates obligation to reciprocate with attention.",
    action:"Find 5 prospects. Send each something useful with no ask: 'Thought of you when I saw this [article about real estate tech/template for managing tenants].' Follow up 3 days later with your pitch.",
    measure:"Reply rate on the follow-up vs cold pitch. Does giving first create goodwill?",
    credit:"Cialdini — Influence (reciprocity) + 📕 DOAC Law 17 — Let Them Try" },
  { id:"x45", owner:"Dion", phase:2, cat:"outreach", title:"The specific number hook",
    hyp:"Messages with a specific number ('saves 11.5 hours per week' vs 'saves hours') feel more credible.",
    action:"Send 5 DMs with a precise number ('Our system handled 847 tenant messages last month') and 5 with round numbers ('hundreds of messages'). Same structure.",
    measure:"Reply rate + perceived credibility. Do people ask 'really, 847?' (meaning it landed).",
    credit:"Chip & Dan Heath — Made to Stick (concreteness principle)" },
  { id:"x46", owner:"Both", phase:2, cat:"process", title:"Energy-based task scheduling",
    hyp:"Doing outreach during your peak energy hours and admin during low-energy hours increases output.",
    action:"Annie: track your energy 1-5 at 9am, 12pm, 3pm for 3 days. Schedule outreach during your peak and admin during your trough.",
    measure:"Messages sent, quality of writing, overall task completion rate.",
    credit:"Daniel Pink — When (chronotype research)" },
  { id:"x47", owner:"Annie", phase:2, cat:"content", title:"Annie's unique angle: psychology + AI",
    hyp:"Annie's psych degree is a positioning superpower — 'I studied how people think, now I build systems that think for them' is a unique angle no competitor has.",
    action:"Write a LinkedIn post that leans into the psychology angle: how understanding human behavior informs how you design AI workflows. Test engagement.",
    measure:"Engagement + profile views + DMs. Does the psych angle attract a different audience?",
    credit:"📕 DOAC Law 26 — Your Context Is Valuable + Annie's unique background" },
  { id:"x48", owner:"Annie", phase:2, cat:"positioning", title:"'Ask me anything' LinkedIn post",
    hyp:"An AMA-style post ('I build AI automations for real estate — ask me anything') generates inbound questions that become sales conversations.",
    action:"Post the AMA. Answer every single response within 1 hour. DM anyone who asks a meaty question.",
    measure:"Number of questions, quality of conversations started, meetings booked from comments.",
    credit:"Reddit AMA format + 📕 DOAC Law 6 — Ask, Don't Tell" },
  { id:"x49", owner:"Dion", phase:2, cat:"outreach", title:"The competitor's unhappy clients",
    hyp:"People who follow or engage with generic AI/automation agencies but seem frustrated are warm prospects for a boutique alternative.",
    action:"Find 3-5 people who've commented negatively on generic automation agency posts ('didn't work for me,' 'too expensive,' 'stopped working'). DM them with empathy.",
    measure:"Reply rate + conversation quality. Are these ultra-warm leads?",
    credit:"📕 DOAC Law 23 — Don't Be an Ostrich (see what competitors miss)" },
  { id:"x50", owner:"Dion", phase:2, cat:"product", title:"Speed-to-value test",
    hyp:"Showing a prospect a working demo of their specific use case within 24 hours of first contact closes deals faster.",
    action:"Next prospect who replies: build a basic mockup of their specific workflow within 24 hours. Send it: 'Made a quick prototype for you.'",
    measure:"Conversion rate. How blown away are they?",
    credit:"📕 DOAC Law 19 — Sweat the Small Stuff + Superhuman's personalized onboarding" },
  { id:"x51", owner:"Annie", phase:2, cat:"content", title:"Controversial stat post",
    hyp:"Leading with a surprising statistic ('87% of real estate admin work can be automated — but only 3% of brokerages have tried') stops the scroll.",
    action:"Research or calculate a real stat about automation in real estate. Lead the post with it. Make it specific to Montreal if possible.",
    measure:"Impressions vs average post. Comments arguing or agreeing (both = engagement).",
    credit:"📕 DOAC Law 11 — Avoid Wallpaper + 📕 DOAC Law 18 — First 5 Seconds" },
  { id:"x52", owner:"Annie", phase:2, cat:"psychology", title:"Anchoring with a bigger number",
    hyp:"Mentioning '26K/year in wasted admin time' before your price makes 8-15K feel like a bargain.",
    action:"Calculate the real annual cost of manual admin for a typical brokerage (hours × rate × 52 weeks). Lead conversations with this number before mentioning your price.",
    measure:"Prospect reaction when you reveal price. Do they flinch less?",
    credit:"📕 DOAC Law 13 — Psychological Moonshots + Anchoring bias (Tversky & Kahneman)" },
  { id:"x53", owner:"Dion", phase:2, cat:"outreach", title:"The 'I don't know if this is for you' frame",
    hyp:"Anti-selling ('This might not be the right fit for you, but...') reduces resistance and increases curiosity.",
    action:"Open 5 DMs with 'I'm not sure if this is relevant to how you run your brokerage, but...' Compare to direct pitch.",
    measure:"Reply rate. Does the uncertainty frame create more curiosity?",
    credit:"Chris Voss — Never Split the Difference (calibrated 'no')" },
  { id:"x54", owner:"Annie", phase:2, cat:"content", title:"Video vs static image post",
    hyp:"A 30-sec video of an automation running in real-time (screen recording) outperforms a static screenshot carousel.",
    action:"Record a clean 30-sec screen capture of Julia's automation handling a request. Post side-by-side with a static version the next day.",
    measure:"Views, watch-through rate, engagement, DMs.",
    credit:"LinkedIn algorithm (video gets priority in feed)" },
  { id:"x55", owner:"Both", phase:2, cat:"process", title:"The 'two-pizza team' communication audit",
    hyp:"With only 2 people, you should be able to make any decision in under 5 minutes. If something takes longer, the decision framework is broken.",
    action:"Track every decision today. How long did each take? Any decision over 10 minutes — what caused the delay? Is there a missing framework?",
    measure:"Number of decisions, average time. Identify the slowest one and fix the framework.",
    credit:"Jeff Bezos (two-pizza teams) + 📕 DOAC Law 28 — Ask Who Not How" },
  { id:"x56", owner:"Dion", phase:2, cat:"outreach", title:"Referral request from Julia",
    hyp:"Julia (even as a free client) likely knows other property managers who'd pay.",
    action:"Ask Julia: 'Who are 3 other PMs you think would benefit from something like this?' Don't be shy. She's seeing the value being built.",
    measure:"Number of names. Quality of introductions. Did she hesitate or enthusiastically offer?",
    credit:"📕 DOAC Law 1 — Five Buckets (network) + Referral-based sales" },
  { id:"x57", owner:"Annie", phase:2, cat:"positioning", title:"The 'quiet' brand test",
    hyp:"Leaning into the name 'Quietly' as a personality (understated, no-BS, works-while-you-sleep) creates a memorable brand position.",
    action:"Use 'quietly' as an adverb in 5 outreach messages: 'We quietly handle the admin so you can focus on selling.' Does the name reinforce the message?",
    measure:"Do prospects comment on the name? Does it feel natural or forced?",
    credit:"📕 DOAC Law 10 — Useless Absurdity (the name IS the brand)" },
  { id:"x58", owner:"Dion", phase:2, cat:"product", title:"Onboarding friction audit",
    hyp:"The fewer questions you ask upfront, the faster clients say yes.",
    action:"Map Julia's onboarding: how many steps, how many questions, how much time before the system goes live? Can you cut it in half?",
    measure:"Number of steps. Can you get from 'yes' to 'live' in under 1 week?",
    credit:"📕 DOAC Law 14 — Friction Can Create Value (but only intentional friction)" },
  { id:"x59", owner:"Annie", phase:2, cat:"content", title:"Repost with commentary",
    hyp:"Reposting an industry article with your expert take ('Here's what most people miss about this...') positions you as a thought leader with zero original content creation.",
    action:"Find a trending article about AI in real estate or property management. Repost with 3 sentences of original insight.",
    measure:"Engagement vs original content. Is this a viable low-effort content strategy?",
    credit:"Curator's paradox (curating is creating) + LinkedIn algorithm (shares with commentary)" },
  { id:"x60", owner:"Both", phase:2, cat:"psychology", title:"End-of-week momentum audit",
    hyp:"Reviewing what worked this week and doubling down on it next week compounds faster than trying new things every week.",
    action:"Friday: List every experiment you ran. Star the top 3 by result. Next week: run variations of ONLY those 3. Kill the rest.",
    measure:"Did focused repetition outperform scattered experimentation?",
    credit:"📕 DOAC Law 20 — Small Miss → Big Miss + 📕 DOAC Law 31 — Power of Progress" },
];

// ============ DAILY HABITS ============
const dailyHabits = [
  { id: "outreach-a", text: "Send 5 outreach messages", floor: "Open LinkedIn, look at 1 profile", owner: "Annie", emoji: "💬", phase2Only: true },
  { id: "setup-a", text: "LinkedIn setup: 30 min on today's experiment", floor: "Open LinkedIn, do one small thing", owner: "Annie", emoji: "🏗️", phase1Only: true },
  { id: "outreach-d", text: "Send 5 outreach messages", floor: "Open LinkedIn, look at 1 profile", owner: "Dion", emoji: "💬" },
  { id: "log", text: "Log today's conversations", floor: "Write 1 note about any conversation", owner: "Both", emoji: "📋" },
  { id: "prime", text: "Prime tomorrow: review tasks, prep workspace", floor: "Open board, read tomorrow's list", owner: "Both", emoji: "🌙" },
];
const weeklyHabits = [
  { id: "linkedin-1", text: "Publish LinkedIn post #1", owner: "Annie", emoji: "📝", phase2Only: true },
  { id: "linkedin-2", text: "Publish LinkedIn post #2", owner: "Annie", emoji: "📝", phase2Only: true },
  { id: "linkedin-3", text: "Publish LinkedIn post #3", owner: "Both", emoji: "📝", phase2Only: true },
  { id: "linkedin-setup", text: "LinkedIn setup milestone (see today's experiment)", owner: "Annie", emoji: "🏗️", phase1Only: true },
  { id: "review", text: "Friday reflection", owner: "Both", emoji: "🔍" },
];

// ============ REFLECTION Qs ============
const reflectionQs = [
  { q: "Progress rating this week?", type: "scale", src: "Atomic Habits" },
  { q: "Are our habits reinforcing who we're becoming?", type: "text", src: "Atomic Habits" },
  { q: "One tiny victory from this week ✨", type: "text", src: "Atomic Habits" },
  { q: "What's working? What's not?", type: "text", src: "Atomic Habits" },
  { q: "Biggest obstacle — and how to beat it?", type: "text", src: "Atomic Habits" },
  { q: "What did we learn?", type: "text", src: null },
  { q: "🧪 What experiment did we run? What did it teach us?", type: "text", src: "DOAC Law 21" },
  { q: "☠️ Pre-mortem: What's most likely to derail us next week?", type: "text", src: "DOAC Law 25" },
  { q: "🔧 Kaizen: What's one tiny improvement we can make?", type: "text", src: "DOAC Law 19" },
];

// ============ TASKS ============
const defaultTasks = [
  { id:"t1", text:"Read partnership agreement together and discuss changes", owner:"Both", date:"2026-02-12", cat:"Legal" },
  { id:"t2", text:"Sign the partnership agreement", owner:"Both", date:"2026-02-12", cat:"Legal" },
  { id:"t5", text:"Begin REQ registration process", owner:"Annie", date:"2026-02-12", cat:"Legal" },
  { id:"t6", text:"Confirm free build with Julia — send agreement + Schedule A", owner:"Dion", date:"2026-02-12", cat:"Julia" },
  { id:"t7", text:"Schedule discovery call with Julia (30-45 min)", owner:"Dion", date:"2026-02-12", cat:"Julia" },
  { id:"t20", text:"Ship quietly.systems — stop polishing, ship it", owner:"Annie", date:"2026-02-12", cat:"Website" },
  { id:"t21", text:"Verify all CTAs work", owner:"Annie", date:"2026-02-12", cat:"Website" },
  { id:"t3", text:"Read service agreement together", owner:"Both", date:"2026-02-13", cat:"Legal" },
  { id:"t4", text:"Fill out Schedule A for Julia's project", owner:"Both", date:"2026-02-13", cat:"Legal" },
  { id:"t22", text:"Set up prospect tracker: Google Sheet or Notion table (Name, Status, Notes)", owner:"Dion", date:"2026-02-13", cat:"Outreach" },
  { id:"t23", text:"Build prospect list: 50 real estate brokers", owner:"Annie", date:"2026-02-13", cat:"Outreach" },
  { id:"t24", text:"Build prospect list: 50 clinics", owner:"Dion", date:"2026-02-13", cat:"Outreach" },
  { id:"t8", text:"Run discovery call using the call sheet", owner:"Both", date:"2026-02-16", cat:"Julia" },
  { id:"t13", text:"Provision Julia's dedicated server (isolated)", owner:"Dion", date:"2026-02-16", cat:"Julia Tech" },
  { id:"t14", text:"Set up n8n instance on Julia's server", owner:"Dion", date:"2026-02-16", cat:"Julia Tech" },
  { id:"t15", text:"Set up Supabase project for Julia", owner:"Dion", date:"2026-02-16", cat:"Julia Tech" },
  { id:"t9", text:"Write up discovery notes — share with Julia", owner:"Annie", date:"2026-02-17", cat:"Julia" },
  { id:"t10", text:"Define the ONE workflow to automate", owner:"Both", date:"2026-02-17", cat:"Julia" },
  { id:"t16", text:"Get Julia's tool access and test API connections", owner:"Dion", date:"2026-02-17", cat:"Julia Tech" },
  { id:"t17", text:"Set up staging environment", owner:"Dion", date:"2026-02-17", cat:"Julia Tech" },
  { id:"t18", text:"Create project folder with README", owner:"Dion", date:"2026-02-17", cat:"Julia Tech" },
  { id:"t44", text:"Write 3-touch LinkedIn outreach sequence", owner:"Annie", date:"2026-02-17", cat:"Outreach" },
  { id:"t11", text:"Fill out Schedule A with specific scope and success criteria", owner:"Both", date:"2026-02-18", cat:"Julia" },
  { id:"t12", text:"Julia signs off on Schedule A", owner:"Both", date:"2026-02-18", cat:"Julia" },
  { id:"t19", text:"Document tech stack and architecture in shared doc", owner:"Dion", date:"2026-02-18", cat:"Julia Tech" },
  { id:"t45", text:"Get Dion's feedback on outreach messages", owner:"Both", date:"2026-02-18", cat:"Outreach" },
  { id:"t46", text:"Expand prospect lists to 250 total", owner:"Both", date:"2026-02-18", cat:"Outreach" },
  { id:"t25", text:"Build intake flow: tenant message → system receives and parses", owner:"Dion", date:"2026-02-19", cat:"Julia Build" },
  { id:"t26", text:"Build AI understanding: extract property, issue type, urgency", owner:"Dion", date:"2026-02-19", cat:"Julia Build" },
  { id:"t47", text:"Follow up on the 11-year broker connection", owner:"Dion", date:"2026-02-19", cat:"Outreach" },
  { id:"t39", text:"Screenshot every step for the case study", owner:"Annie", date:"2026-02-19", cat:"Julia Docs" },
  { id:"t40", text:"Record Julia's 'before' process and metrics", owner:"Annie", date:"2026-02-19", cat:"Julia Docs" },
  { id:"t27", text:"TEST AI with 10+ real example messages", owner:"Dion", date:"2026-02-20", cat:"Julia Build" },
  { id:"t28", text:"Test with messy/vague messages", owner:"Dion", date:"2026-02-20", cat:"Julia Build" },
  { id:"t29", text:"Build property lookup: match tenant to unit", owner:"Dion", date:"2026-02-20", cat:"Julia Build" },
  { id:"t30", text:"Build vendor matching: route to correct category", owner:"Dion", date:"2026-02-20", cat:"Julia Build" },
  { id:"t31", text:"Build response drafting for Julia's approval", owner:"Dion", date:"2026-02-21", cat:"Julia Build" },
  { id:"t32", text:"Build approval mechanism", owner:"Dion", date:"2026-02-21", cat:"Julia Build" },
  { id:"t33", text:"Build work order logging", owner:"Dion", date:"2026-02-21", cat:"Julia Build" },
  { id:"t43", text:"Weekly check-in with Julia", owner:"Both", date:"2026-02-21", cat:"Julia Docs" },
  { id:"t34", text:"Connect to Julia's actual email/messaging", owner:"Dion", date:"2026-02-24", cat:"Julia Build" },
  { id:"t35", text:"TEST full flow end-to-end", owner:"Dion", date:"2026-02-24", cat:"Julia Build" },
  { id:"t36", text:"TEST 5 scenario types", owner:"Dion", date:"2026-02-24", cat:"Julia Build" },
  { id:"t37", text:"Set up error handling", owner:"Dion", date:"2026-02-24", cat:"Julia Build" },
  { id:"t38", text:"Set up monitoring/logging", owner:"Dion", date:"2026-02-24", cat:"Julia Build" },
  { id:"t41", text:"Write 1-page system doc", owner:"Dion", date:"2026-02-25", cat:"Julia Docs" },
  { id:"t42", text:"Prepare demo walkthrough — practice first", owner:"Both", date:"2026-02-25", cat:"Julia Docs" },
  { id:"t48", text:"Test with Julia watching: 3 real-style requests", owner:"Both", date:"2026-02-25", cat:"Julia QA" },
  { id:"t49", text:"Edge case: French message", owner:"Dion", date:"2026-02-25", cat:"Julia QA" },
  { id:"t50", text:"Edge case: emergency (flooding, fire, gas)", owner:"Dion", date:"2026-02-25", cat:"Julia QA" },
  { id:"t51", text:"Edge case: AI can't determine issue type", owner:"Dion", date:"2026-02-26", cat:"Julia QA" },
  { id:"t52", text:"Edge case: tenant replies to automated message", owner:"Dion", date:"2026-02-26", cat:"Julia QA" },
  { id:"t53", text:"Edge case: duplicate request", owner:"Dion", date:"2026-02-26", cat:"Julia QA" },
  { id:"t54", text:"Edge case: Julia doesn't approve within 2 hours", owner:"Dion", date:"2026-02-26", cat:"Julia QA" },
  { id:"t55", text:"Edge case: vendor unavailable", owner:"Dion", date:"2026-02-26", cat:"Julia QA" },
  { id:"t58", text:"Collect Julia's feedback — write it down", owner:"Annie", date:"2026-02-26", cat:"Julia QA" },
  { id:"t71", text:"Start real estate broker landing page", owner:"Annie", date:"2026-02-26", cat:"Landing Pages" },
  { id:"t56", text:"Guardrail check: nothing sends without approval", owner:"Dion", date:"2026-02-27", cat:"Julia QA" },
  { id:"t57", text:"Security check: data stored securely", owner:"Dion", date:"2026-02-27", cat:"Julia QA" },
  { id:"t59", text:"Implement feedback", owner:"Dion", date:"2026-02-27", cat:"Julia QA" },
  { id:"t60", text:"RE-TEST after changes", owner:"Dion", date:"2026-02-27", cat:"Julia QA" },
  { id:"t61", text:"Soft launch with Julia monitoring", owner:"Dion", date:"2026-02-28", cat:"Julia Launch" },
  { id:"t62", text:"Set up error alerts for first 48 hours", owner:"Dion", date:"2026-02-28", cat:"Julia Launch" },
  { id:"t72", text:"Outline clinic landing page structure", owner:"Annie", date:"2026-02-28", cat:"Landing Pages" },
  { id:"t63", text:"Day 1 check-in with Julia", owner:"Dion", date:"2026-03-03", cat:"Julia Launch" },
  { id:"t73", text:"Publish case study on website", owner:"Annie", date:"2026-03-03", cat:"Social Proof" },
  { id:"t74", text:"Edit and publish video testimonial", owner:"Annie", date:"2026-03-03", cat:"Social Proof" },
  { id:"t64", text:"Day 3 check-in with Julia", owner:"Both", date:"2026-03-04", cat:"Julia Launch" },
  { id:"t65", text:"Fix first-week issues", owner:"Dion", date:"2026-03-04", cat:"Julia Launch" },
  { id:"t75", text:"LinkedIn post about case study results", owner:"Annie", date:"2026-03-04", cat:"Social Proof" },
  { id:"t76", text:"Add case study to outreach sequence", owner:"Both", date:"2026-03-04", cat:"Social Proof" },
  { id:"t66", text:"Measure results: requests handled, response time, time saved", owner:"Annie", date:"2026-03-05", cat:"Julia Launch" },
  { id:"t67", text:"Request video testimonial from Julia", owner:"Annie", date:"2026-03-05", cat:"Julia Launch" },
  { id:"t77", text:"Review month's outreach: what got responses?", owner:"Both", date:"2026-03-05", cat:"Pipeline" },
  { id:"t78", text:"Refine outreach messaging", owner:"Annie", date:"2026-03-05", cat:"Pipeline" },
  { id:"t82", text:"Finish real estate landing page", owner:"Annie", date:"2026-03-05", cat:"Landing Pages" },
  { id:"t68", text:"Write case study with real numbers", owner:"Annie", date:"2026-03-06", cat:"Julia Launch" },
  { id:"t69", text:"Get Julia's written approval for case study", owner:"Annie", date:"2026-03-06", cat:"Julia Launch" },
  { id:"t70", text:"Ask Julia for referrals", owner:"Annie", date:"2026-03-06", cat:"Julia Launch" },
  { id:"t79", text:"Follow up with every discovery call lead", owner:"Both", date:"2026-03-06", cat:"Pipeline" },
  { id:"t80", text:"Send proposals to warm leads", owner:"Annie", date:"2026-03-06", cat:"Pipeline" },
  { id:"t83", text:"Start clinic landing page", owner:"Annie", date:"2026-03-06", cat:"Landing Pages" },
  { id:"t81", text:"Close first paying client (stretch goal!)", owner:"Both", date:"2026-03-07", cat:"Pipeline" },
  { id:"t84", text:"Outline property management landing page", owner:"Annie", date:"2026-03-07", cat:"Landing Pages" },
  { id:"t85", text:"Fill in the Monthly Scorecard", owner:"Both", date:"2026-03-07", cat:"Review" },
  { id:"t86", text:"30-min retro: what worked, what didn't", owner:"Both", date:"2026-03-07", cat:"Review" },
  { id:"t87", text:"Set March goals", owner:"Both", date:"2026-03-07", cat:"Review" },
  // Week 5: Scale infrastructure
  { id:"t88", text:"Create proposal/pitch deck template (reusable for every prospect)", owner:"Annie", date:"2026-03-09", cat:"Sales" },
  { id:"t89", text:"Write pricing page for website — make $8-15K range clear and justified", owner:"Annie", date:"2026-03-09", cat:"Sales" },
  { id:"t90", text:"Create client onboarding checklist (from 'yes' to 'live' — every step)", owner:"Both", date:"2026-03-10", cat:"Delivery" },
  { id:"t91", text:"Document delivery SOP: what happens after someone pays?", owner:"Dion", date:"2026-03-10", cat:"Delivery" },
  { id:"t92", text:"Build simple ROI calculator for sales conversations", owner:"Annie", date:"2026-03-10", cat:"Sales" },
  { id:"t93", text:"Create a referral program — what do referrers get?", owner:"Both", date:"2026-03-11", cat:"Growth" },
  { id:"t94", text:"Join 3 Montreal RE/PM communities (Facebook groups, associations, Slack)", owner:"Dion", date:"2026-03-11", cat:"Growth" },
  { id:"t95", text:"Research speaking/panel opportunities at RE events in Montreal", owner:"Annie", date:"2026-03-11", cat:"Growth" },
  { id:"t96", text:"Set up Google Business Profile for Quietly", owner:"Annie", date:"2026-03-12", cat:"Growth" },
  { id:"t97", text:"Create FAQ doc from real questions prospects ask", owner:"Both", date:"2026-03-12", cat:"Sales" },
  { id:"t98", text:"Record 90-second Julia demo (system should be live by now)", owner:"Dion", date:"2026-03-12", cat:"Social Proof" },
  { id:"t99", text:"Build an email sequence: 3 nurture emails for leads not ready to buy", owner:"Annie", date:"2026-03-13", cat:"Pipeline" },
  { id:"t100", text:"Create a 'portfolio' page — before/after visuals of Julia's system", owner:"Annie", date:"2026-03-13", cat:"Social Proof" },
  { id:"t101", text:"Reach out to 3 complementary businesses for partnerships (IT companies, RE coaches)", owner:"Dion", date:"2026-03-13", cat:"Growth" },
  { id:"t102", text:"Month 2 pipeline review: how many in each stage? What's the bottleneck?", owner:"Both", date:"2026-03-14", cat:"Pipeline" },
  { id:"t103", text:"Create upsell path: what's the next thing to sell after initial build?", owner:"Both", date:"2026-03-14", cat:"Sales" },
  // Annie's LinkedIn profile setup (Phase 1 critical path)
  { id:"t104", text:"Set up Annie's LinkedIn: headline, photo, banner (see today's experiment)", owner:"Annie", date:"2026-02-17", cat:"LinkedIn Setup" },
  { id:"t105", text:"Write Annie's LinkedIn About section — story-first, under 200 words", owner:"Annie", date:"2026-02-18", cat:"LinkedIn Setup" },
  { id:"t106", text:"Add experience + education to LinkedIn (McGill, Dulcedo, RE, Quietly)", owner:"Annie", date:"2026-02-18", cat:"LinkedIn Setup" },
  { id:"t107", text:"Write + publish first LinkedIn post (introduction story)", owner:"Annie", date:"2026-02-19", cat:"LinkedIn Setup" },
  { id:"t108", text:"Send 25 connection requests to target prospects (day 1 of 2)", owner:"Annie", date:"2026-02-19", cat:"LinkedIn Setup" },
  { id:"t109", text:"Send 25 more connection requests (day 2)", owner:"Annie", date:"2026-02-17", cat:"LinkedIn Setup" },
  { id:"t110", text:"Study 5 founders who post well — build swipe file", owner:"Annie", date:"2026-02-17", cat:"LinkedIn Setup" },
  { id:"t111", text:"Define 3 content pillars + write post ideas for each", owner:"Annie", date:"2026-02-18", cat:"LinkedIn Setup" },
  { id:"t112", text:"Batch-write first week of 3 LinkedIn posts", owner:"Annie", date:"2026-02-19", cat:"LinkedIn Setup" },
  // Financial & pricing
  { id:"t113", text:"Set up business bank account if not done", owner:"Both", date:"2026-02-14", cat:"Finance" },
  { id:"t114", text:"Create simple expense tracker (Sheet) — hosting, tools, software", owner:"Annie", date:"2026-02-17", cat:"Finance" },
  { id:"t115", text:"Finalize pricing tiers: what's the $8K build vs $12K vs $15K?", owner:"Both", date:"2026-02-18", cat:"Sales" },
  { id:"t116", text:"Write a 1-page pricing doc you can send prospects", owner:"Annie", date:"2026-02-19", cat:"Sales" },
  // Scaling prep
  { id:"t117", text:"Create client onboarding checklist: discovery → scope → build → launch", owner:"Both", date:"2026-02-26", cat:"Delivery" },
  { id:"t118", text:"Document Julia's build process as a repeatable template", owner:"Dion", date:"2026-03-06", cat:"Delivery" },
  { id:"t119", text:"Create 'Quietly Playbook' — internal doc of how you run projects", owner:"Both", date:"2026-03-10", cat:"Delivery" },
  { id:"t120", text:"Identify 3 verticals beyond RE: which has most pain + willingness to pay?", owner:"Both", date:"2026-03-07", cat:"Growth" },
];

const catColors = {
  "Legal":"#8B7355","Julia":"#E8845C","Julia Tech":"#9B7ED8","Website":"#5BAE7C",
  "Outreach":"#5B9BD5","Julia Build":"#E8845C","Julia Docs":"#F0A86E",
  "Julia QA":"#C490B0","Julia Launch":"#4CAF7D","Landing Pages":"#6DB5C7",
  "Social Proof":"#E8845C","Pipeline":"#5B9BD5","Review":"#8B7355","Custom":"#9B7ED8",
  "Sales":"#D4A854","Delivery":"#4CAF7D","Growth":"#C490B0",
  "LinkedIn Setup":"#0A66C2","Finance":"#2E7D5B",
};

const oc = {
  Annie: { bg: "rgba(232,132,92,0.12)", text: "#D46A3C", dark: "#E8845C" },
  Dion: { bg: "rgba(76,175,125,0.12)", text: "#3A9B6A", dark: "#4CAF7D" },
  Both: { bg: "rgba(155,126,216,0.1)", text: "#7B68A8", dark: "#9B7ED8" },
};

const quotes = [
  // Diary of a CEO
  { text: "If you want to increase your success rate, double your failure rate.", src: "DOAC", law: "Law 21: Out-Fail the Competition" },
  { text: "The easiest way to do big things is by focusing on the small things.", src: "DOAC", law: "Law 19: Sweat the Small Stuff" },
  { text: "A small miss now creates a big miss later.", src: "DOAC", law: "Law 20: Small Miss → Big Miss" },
  { text: "Pressure is a privilege — it only comes to those that earn it.", src: "DOAC", law: "Law 24: Pressure Is a Privilege" },
  { text: "In the first five seconds, the audience will either tune in or decide you're wallpaper.", src: "DOAC", law: "Law 18: Fight for the First 5 Seconds" },
  { text: "Your success will be defined by your attitude towards the small stuff.", src: "DOAC", law: "Law 19: Sweat the Small Stuff" },
  { text: "The only way you go forward is because you cannot go back.", src: "DOAC", law: "Law 22: Become a Plan-A Thinker" },
  { text: "You don't ever want to put that quitting spirit inside yourself — those are demons.", src: "DOAC", law: "Law 7: Never Compromise Your Self-Story" },
  { text: "Nobody is bigger than the club.", src: "DOAC", law: "Law 30: Three Bars for Great Teams" },
  { text: "People want a feeling of progression. Tiny progress means a lot.", src: "DOAC", law: "Law 31: Power of Progress" },
  { text: "Your story will be defined not by useful practicalities, but by useless absurdity.", src: "DOAC", law: "Law 10: Useless Absurdity" },
  { text: "The person with the fewest blind spots stands the greatest chance of victory.", src: "DOAC", law: "Law 23: Don't Be an Ostrich" },
  { text: "It's nearly always cheaper, easier and more effective to invest in perception than reality.", src: "DOAC", law: "Law 13: Psychological Moonshots" },
  { text: "Why will this idea fail? Only 6% of founders can answer that.", src: "DOAC", law: "Law 25: Negative Manifestation" },
  { text: "Your skills are worthless. Your context is valuable.", src: "DOAC", law: "Law 26: Skills vs Context" },
  // Atomic Habits
  { text: "Every action is a vote for the type of person you wish to become.", src: "Atomic Habits", law: "Ch 2: Identity-Based Habits" },
  { text: "You do not rise to the level of your goals. You fall to the level of your systems.", src: "Atomic Habits", law: "Ch 1: Systems Over Goals" },
  { text: "The task of breaking a bad habit is like uprooting a powerful oak within us.", src: "Atomic Habits", law: "Ch 4: The Man Who Didn't Look Right" },
  { text: "Never miss twice. If you miss one day, get back on track as quickly as possible.", src: "Atomic Habits", law: "Ch 16: Never Miss Twice" },
  { text: "When you start a new habit, it should take less than two minutes to do.", src: "Atomic Habits", law: "Ch 13: The Two-Minute Rule" },
  { text: "People who make a specific plan for when and where they will perform a habit are most likely to follow through.", src: "Atomic Habits", law: "Ch 5: Implementation Intentions" },
  { text: "Habits are the compound interest of self-improvement.", src: "Atomic Habits", law: "Ch 1: The Surprising Power of Tiny Habits" },
];

// ============ HELPERS ============
function nowEST() { return new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" })); }
function dk(d) { if (!d) d = nowEST(); const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), dd=String(d.getDate()).padStart(2,"0"); return `${y}-${m}-${dd}`; }
function wk(d) { if (!d) d = nowEST(); const s = new Date(d); s.setDate(s.getDate()-s.getDay()+1); return dk(s); }
function isWknd(d) { const day = d.getDay(); return day === 0 || day === 6; }
function fmt(ds) { return new Date(ds+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}); }
function fmtDay(ds) { return new Date(ds+"T12:00:00").toLocaleDateString("en-US",{weekday:"long"}); }
function fmtFull(ds) { return new Date(ds+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"}); }
function isToday(ds) { return ds === dk(); }

function getStreak(hid, habits) {
  let s = 0; const t = nowEST();
  for (let i = 0; i < 60; i++) {
    const d = new Date(t); d.setDate(d.getDate()-i);
    if (isWknd(d)) continue;
    if (i === 0 && !habits[`${hid}:${dk(d)}`]) continue;
    if (habits[`${hid}:${dk(d)}`]) s++; else if (s > 0) break;
  }
  return s;
}

function getGrid(hid, habits) {
  const days = [], start = new Date(START_DATE+"T12:00:00"), t = nowEST(), d = new Date(start);
  while (d <= t) { days.push({key:dk(d),day:d.getDate(),done:!!habits[`${hid}:${dk(d)}`],wknd:isWknd(d),today:dk(d)===dk(t)}); d.setDate(d.getDate()+1); }
  return days;
}

function getDaysInRange(s,e) { const days=[],d=new Date(s+"T12:00:00"),end=new Date(e+"T12:00:00"); while(d<=end){days.push(dk(d));d.setDate(d.getDate()+1);} return days; }

// ============ CONFETTI ============
function Confetti({ active }) {
  if (!active) return null;
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 0.5, dur: 1.5 + Math.random(),
    color: ["#E8845C","#4CAF7D","#5B9BD5","#F0A86E","#9B7ED8","#FFD93D","#FF6B9D"][i % 7],
    rot: Math.random() * 360, size: 5 + Math.random() * 6,
  }));
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 999 }}>
      {pieces.map((p, i) => (
        <div key={i} style={{
          position: "absolute", left: `${p.left}%`, top: -10, width: p.size, height: p.size * 0.6,
          background: p.color, borderRadius: 2, transform: `rotate(${p.rot}deg)`,
          animation: `confettiFall ${p.dur}s ease-in ${p.delay}s forwards`,
        }} />
      ))}
    </div>
  );
}

// ============ CSS ============
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root {
    --bg: #F5F3EE; --card: #FFFFFF; --card-done: rgba(58,143,98,0.02); --border: #E6E2D9; --border-hover: #CFC9BC;
    --text: #1A1715; --text-sec: #6B645A; --text-muted: #A39E94;
    --accent: #A0522D; --accent-soft: rgba(160,82,45,0.04); --accent-glow: rgba(160,82,45,0.10);
    --green: #4A7C59; --green-soft: rgba(74,124,89,0.04); --green-glow: rgba(74,124,89,0.08);
    --purple: #6B5B95; --purple-soft: rgba(107,91,149,0.04);
    --yellow: #A0883A; --yellow-soft: rgba(160,136,58,0.04);
    --blue: #4A6FA5; --blue-soft: rgba(74,111,165,0.04);
    --red: #9B4444; --red-soft: rgba(155,68,68,0.04);
    --dark: #1A1715;
    --radius: 12px; --radius-sm: 8px;
    --shadow-sm: 0 1px 2px rgba(26,23,21,0.03);
    --shadow-md: 0 2px 8px rgba(26,23,21,0.05);
    --shadow-lg: 0 8px 24px rgba(26,23,21,0.06);
    --font: 'Outfit', system-ui, -apple-system, sans-serif;
    --font-display: 'Fraunces', Georgia, serif;
  }
  @keyframes checkPop { 0%{transform:scale(1)} 40%{transform:scale(1.25)} 100%{transform:scale(1)} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes confettiFall { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(100vh) rotate(720deg);opacity:0} }
  @keyframes shimmer { from{background-position:-200% center} to{background-position:200% center} }
  .pop { animation: checkPop 0.2s cubic-bezier(0.175,0.885,0.32,1.275); }
  .fin > * { animation: fadeUp 0.3s ease-out both; }
  .fin > *:nth-child(2) { animation-delay: 0.04s; }
  .fin > *:nth-child(3) { animation-delay: 0.08s; }
  .fin > *:nth-child(4) { animation-delay: 0.12s; }
  .fin > *:nth-child(5) { animation-delay: 0.16s; }
  .fin > *:nth-child(6) { animation-delay: 0.20s; }
  .fin > *:nth-child(7) { animation-delay: 0.24s; }
  .streak-b { background:linear-gradient(135deg,var(--accent),#C06830); color:white; font-size: 12px; font-weight:700; padding:2px 8px; border-radius:12px; display:inline-flex; align-items:center; gap:2px; letter-spacing:0.2px; }
  .task-row { transition: all 0.12s ease; }
  .task-row:hover { box-shadow: var(--shadow-md); }
  .day-pill { transition: background 0.12s ease; }
  .day-pill:hover { background: var(--accent-soft) !important; }
  input::placeholder { color: var(--text-muted); }
  input:focus, textarea:focus { outline: none; }
  textarea { resize: vertical; font-family: var(--font); }
  .scale-btn { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--border); background: var(--card); cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.15s; font-family: var(--font); color: var(--text-sec); }
  .scale-btn:hover { border-color: var(--accent); }
  .scale-btn.active { background: var(--accent); color: white; border-color: var(--accent); }
  .tab-btn { background:none; border:none; cursor:pointer; font-family:var(--font); font-size: 15px; font-weight:500; color:var(--text-muted); padding:12px 0; position:relative; transition:color 0.15s; letter-spacing:0.2px; }
  .tab-btn.active { color:var(--text); font-weight:600; }
  .tab-btn.active::after { content:''; position:absolute; bottom:0; left:0; right:0; height:2px; background:var(--accent); border-radius:2px; }
  .tab-btn .tab-badge { position:absolute; top:4px; right:-14px; width:16px; height:16px; border-radius:50%; background:var(--red); color:white; font-size: 11px; font-weight:800; display:flex; align-items:center; justify-content:center; }
`;

function Check({ done, size = 22 }) {
  const [pop, setPop] = useState(false);
  const prev = useRef(done);
  useEffect(() => { if (done && !prev.current) setPop(true); prev.current = done; }, [done]);
  return (
    <div className={pop ? "pop" : ""} onAnimationEnd={() => setPop(false)} style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      border: done ? "none" : "2.5px solid var(--border)",
      background: done ? "linear-gradient(135deg, #4CAF7D, #2E9B6A)" : "transparent",
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "all 0.2s", boxShadow: done ? "0 3px 12px var(--green-glow)" : "none",
    }}>
      {done && <svg width={size*0.5} height={size*0.5} viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
    </div>
  );
}

function Pill({ owner }) {
  const o = oc[owner];
  return <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: o.bg, color: o.text, letterSpacing: 0.3 }}>{owner}</span>;
}

function Ring({ pct, size = 42, stroke = 3.5 }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const color = pct >= 80 ? "#4CAF7D" : pct >= 40 ? "#E8845C" : "#9B7ED8";
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} stroke="rgba(0,0,0,0.06)" strokeWidth={stroke} fill="none" />
      <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeDasharray={c} strokeDashoffset={c-(pct/100)*c} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.175,0.885,0.32,1.275)" }} />
    </svg>
  );
}

// ============ MAIN ============
export default function Board() {
  const [data, setData] = useState({ tasks:{}, taskDates:{}, taskStatus:{}, taskNotes:{}, habits:{}, scores:{}, highlight:{}, energy:{}, wins:{}, northStar:{}, experiments:{}, pulse:{}, blocked:{}, reflections:{}, customTasks:[], conversations:[] });
  const [view, setView] = useState("dashboard");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [moveTask, setMoveTask] = useState(null);
  const [dayOffset, setDayOffset] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showFloor, setShowFloor] = useState({});
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ text: "", owner: "Annie", cat: "" });
  const [expandedTask, setExpandedTask] = useState(null);
  const [expIndex, setExpIndex] = useState(0);
  const [showConvoForm, setShowConvoForm] = useState(false);
  const [newConvo, setNewConvo] = useState({ name:"", who:"Annie", type:"", warmth:"", next:"", notes:"" });
  // Pick quote based on date string so it changes daily and is stable within a day
  const quote = quotes[(() => { const d = dk(); let h = 0; for(let i=0;i<d.length;i++) h = ((h<<5)-h)+d.charCodeAt(i); return Math.abs(h) % quotes.length; })()];

  const load = useCallback(async () => {
    try {
      const r = await window.storage.get(STORE_KEY, true);
      if (r?.value) setData(prev => ({ ...prev, ...JSON.parse(r.value) }));
      setLastSync(new Date());
    } catch(e) {
      // Key doesn't exist yet — that's fine, use defaults
      console.log("Storage load:", e?.message || "new board");
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (d) => {
    setData(d); setSyncing(true);
    try {
      await window.storage.set(STORE_KEY, JSON.stringify(d), true);
      setLastSync(new Date());
    } catch(e) {
      console.error("Storage save failed:", e);
    }
    setSyncing(false);
  }, []);

  const getTaskDate = (t) => data.taskDates?.[t.id] || t.date;
  const toggleTask = (id) => save({ ...data, tasks: { ...data.tasks, [id]: !data.tasks[id] } });
  const toggleHabit = (hid) => {
    const k = `${hid}:${dk()}`; const next = { ...data, habits: { ...data.habits, [k]: !data.habits[k] } };
    save(next);
    // Check if all daily habits done -> confetti!
    // Confetti check done via allDailyDone in render
    if (!data.habits[k]) { 
      // Will check allDailyDone in render to trigger confetti
    }
  };
  const toggleWeeklyHabit = (hid) => { const k = `${hid}:${wk()}`; save({ ...data, habits: { ...data.habits, [k]: !data.habits[k] } }); };
  const setHighlight = (t) => save({ ...data, highlight: { ...data.highlight, [dk()]: t } });
  const updateScore = (i, v) => save({ ...data, scores: { ...data.scores, [i]: v } });
  const setEnergy = (level) => save({ ...data, energy: { ...data.energy, [dk()]: level } });
  const setWin = (text) => save({ ...data, wins: { ...data.wins, [dk()]: text } });
  const addConvo = () => {
    if (!newConvo.name.trim()) return;
    const convos = data.conversations || [];
    const entry = { ...newConvo, date: dk(), ts: Date.now() };
    save({ ...data, conversations: [...convos, entry] });
    setNewConvo({ name:"", who:"Annie", type:"", warmth:"", next:"", notes:"" });
    setShowConvoForm(false);
  };
  const deleteConvo = (ts) => save({ ...data, conversations: (data.conversations||[]).filter(c=>c.ts!==ts) });
  const setNorthStarValue = (v) => save({ ...data, northStar: { ...data.northStar, [wk()]: v } });
  const setExperimentsValue = (v) => save({ ...data, experiments: { ...data.experiments, [wk()]: v } });
  const setPulse = (who, val) => save({ ...data, pulse: { ...data.pulse, [`${who}:${wk()}`]: val } });
  const toggleBlocked = (tid, reason) => save({ ...data, blocked: { ...data.blocked, [tid]: data.blocked?.[tid] ? null : (reason || "Waiting...") } });
  const setTaskStatus = (tid, status) => save({ ...data, taskStatus: { ...data.taskStatus, [tid]: status } });
  const setTaskNote = (tid, note) => save({ ...data, taskNotes: { ...data.taskNotes, [tid]: note } });
  const setReflection = (idx, val) => save({ ...data, reflections: { ...data.reflections, [`${wk()}:${idx}`]: val } });
  const moveTaskToDate = (id, d) => { save({ ...data, taskDates: { ...data.taskDates, [id]: d } }); setMoveTask(null); };

  const addTask = (targetDate) => {
    if (!newTask.text.trim()) return;
    const id = "c" + Date.now();
    const task = { id, text: newTask.text.trim(), owner: newTask.owner, date: targetDate || viewKey, cat: newTask.cat || "Custom", custom: true };
    save({ ...data, customTasks: [...(data.customTasks || []), task] });
    setNewTask({ text: "", owner: "Annie", cat: "" });
    setShowAddTask(false);
  };

  const deleteTask = (id) => {
    save({ ...data, customTasks: (data.customTasks || []).filter(t => t.id !== id), tasks: { ...data.tasks, [id]: undefined } });
  };
  const bumpOverdue = () => {
    const today = dk(), nd = { ...data.taskDates }; let changed = false;
    allTasks.forEach(t => { const d = nd[t.id] || t.date; if (d < today && !data.tasks?.[t.id]) { nd[t.id] = today; changed = true; } });
    if (changed) save({ ...data, taskDates: nd });
  };

  // Compute
  const allTasks = [...defaultTasks, ...(data.customTasks || [])];
  let totalTasks = 0, doneTasks = 0;
  allTasks.forEach(t => { totalTasks++; if (data.tasks?.[t.id]) doneTasks++; });
  const pct = totalTasks > 0 ? Math.round((doneTasks/totalTasks)*100) : 0;
  const todayKey = dk(), weekKey = wk();
  const viewDate = nowEST(); viewDate.setDate(viewDate.getDate()+dayOffset);
  const viewKey = dk(viewDate);

  const matchFilter = (owner) => filter === "All" || owner === filter || owner === "Both";
  const filteredViewTasks = allTasks.filter(t => getTaskDate(t) === viewKey && matchFilter(t.owner));
  const overdueTasks = allTasks.filter(t => getTaskDate(t) < todayKey && !data.tasks?.[t.id]);
  const filteredOverdue = overdueTasks.filter(t => matchFilter(t.owner));

  // Phase computation (needed for habit filtering)
  const dayNum = Math.floor((nowEST().getTime() - new Date(START_DATE+"T12:00:00").getTime()) / 86400000);
  const currentPhase = dayNum < 14 ? 1 : 2;

  const activeDailyHabits = dailyHabits.filter(h => {
    if (h.phase1Only && currentPhase !== 1) return false;
    if (h.phase2Only && currentPhase !== 2) return false;
    return true;
  });
  const filteredDaily = activeDailyHabits.filter(h => matchFilter(h.owner));
  const allDailyDone = filteredDaily.length > 0 && filteredDaily.every(h => data.habits?.[`${h.id}:${todayKey}`]);
  useEffect(() => { if (allDailyDone) { setShowConfetti(true); const t = setTimeout(() => setShowConfetti(false), 3000); return () => clearTimeout(t); } }, [allDailyDone]);
  const todayEnergy = data.energy?.[todayKey];
  const todayWin = data.wins?.[todayKey] || "";

  // Self-story: count weekdays shown up (at least 1 habit done) out of last 14 weekdays
  const selfStory = (() => {
    let shown = 0, total = 0;
    for (let i = 0; i < 21 && total < 14; i++) {
      const d = nowEST(); d.setDate(d.getDate()-i);
      if (isWknd(d)) continue;
      total++;
      const key = dk(d);
      if (dailyHabits.some(h => data.habits?.[`${h.id}:${key}`])) shown++;
    }
    return { shown, total };
  })();

  // Milestone badges
  const milestone = pct >= 100 ? { emoji: "🏆", text: "EVERYTHING DONE!" } :
                    pct >= 75 ? { emoji: "🔥", text: "75% — The finish line is in sight!" } :
                    pct >= 50 ? { emoji: "⭐", text: "50% — Halfway there, keep going!" } :
                    pct >= 25 ? { emoji: "🌱", text: "25% — You're building momentum!" } : null;

  // Today's experiments: phase-aware, split by owner
  const phaseExps = experimentBank.filter(e => e.phase === currentPhase);
  const annieExps = phaseExps.filter(e => e.owner === "Annie" || e.owner === "Both");
  const dionExps = phaseExps.filter(e => e.owner === "Dion" || e.owner === "Both");
  const pickTwo = (pool, seed) => pool.length < 2 ? pool : [pool[(seed * 2) % pool.length], pool[(seed * 2 + 1) % pool.length]];
  const todayAnnieExps = pickTwo(annieExps, dayNum);
  const todayDionExps = pickTwo(dionExps, dayNum + 7);
  const todayExperiments = filter === "Dion" ? todayDionExps :
                           filter === "Annie" ? todayAnnieExps :
                           [...todayAnnieExps, ...todayDionExps];
  const expCatColors = { outreach:"#5B9BD5", positioning:"#E8845C", content:"#9B7ED8", product:"#4CAF7D", process:"#8B7355", psychology:"#C490B0" };
  const expCatEmoji = { outreach:"📨", positioning:"🎯", content:"✍️", product:"🛠️", process:"⚙️", psychology:"🧠" };

  if (loading) return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"var(--bg)",fontFamily:"var(--font)" }}>
      <style>{css}</style>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:40,fontWeight:300,color:"var(--text)",letterSpacing:-1 }}>quietly</div>
        <div style={{ color:"var(--text-muted)",fontSize:15,marginTop:10,letterSpacing:0.3 }}>Preparing your day...</div>
      </div>
    </div>
  );

  const TaskCard_OLD_UNUSED = ({ task, showCat = false }) => {
    const rawDone = !!data.tasks?.[task.id];
    const status = data.taskStatus?.[task.id] || (rawDone ? "done" : "todo");
    const done = status === "done" || rawDone;
    const cc = catColors[task.cat] || "var(--accent)";
    const blocked = data.blocked?.[task.id];
    const isCustom = !!task.custom;
    const note = data.taskNotes?.[task.id] || "";
    const isExpanded = expandedTask === task.id;
    const statusConfig = {
      todo: { label:"To do", color:"var(--text-muted)", bg:"transparent", icon:"○" },
      active: { label:"In progress", color:"var(--blue)", bg:"var(--blue-soft)", icon:"◐" },
      done: { label:"Done", color:"var(--green)", bg:"var(--green-soft)", icon:"●" },
    };
    const sc = statusConfig[status];
    const cycleStatus = (e) => {
      e.stopPropagation();
      if (status === "todo") { 
        save({ ...data, taskStatus: { ...data.taskStatus, [task.id]: "active" } });
      } else if (status === "active") { 
        save({ ...data, tasks: { ...data.tasks, [task.id]: true }, taskStatus: { ...data.taskStatus, [task.id]: "done" } });
      } else if (status === "done" || done) { 
        save({ ...data, tasks: { ...data.tasks, [task.id]: false }, taskStatus: { ...data.taskStatus, [task.id]: "todo" } });
      }
    };
    return (
      <div style={{ marginBottom:2 }}>
        <div className="task-row" style={{
          display:"flex",alignItems:"center",gap:10,padding:"11px 14px",
          background: blocked ? "var(--yellow-soft)" : status==="active" ? "var(--blue-soft)" : done ? "var(--card-done)" : "var(--card)",
          borderRadius: isExpanded ? "var(--radius-sm) var(--radius-sm) 0 0" : "var(--radius-sm)",
          border:`1.5px solid ${blocked ? "var(--yellow)" : status==="active" ? "rgba(74,127,181,0.25)" : done ? "var(--green)" : "var(--border)"}`,
          opacity: done ? 0.5 : 1, cursor:"pointer", position:"relative",
          borderLeft: showCat ? `4px solid ${cc}` : isCustom ? "4px solid var(--purple)" : undefined,
        }}>
          {/* Status button */}
          <button onClick={cycleStatus} title={`${sc.label} — click to change`} style={{
            width:24,height:24,borderRadius:"50%",flexShrink:0,border:"none",cursor:"pointer",padding:0,
            background: done ? "linear-gradient(135deg, #4CAF7D, #2E9B6A)" : status==="active" ? "var(--blue)" : "var(--bg)",
            display:"flex",alignItems:"center",justifyContent:"center",
            boxShadow: done ? "0 2px 8px var(--green-glow)" : status==="active" ? "0 2px 8px rgba(74,127,181,0.2)" : "inset 0 0 0 2.5px var(--border)",
          }}>
            {done && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            {status==="active" && !done && <div style={{width:7,height:7,borderRadius:"50%",background:"white"}} />}
          </button>
          {/* Content */}
          <div style={{ flex:1,minWidth:0 }} onClick={()=>setExpandedTask(isExpanded?null:task.id)}>
            <div style={{ fontSize:15,lineHeight:1.5,color:done?"var(--text-muted)":"var(--text)",textDecoration:done?"line-through":"none",fontWeight:500 }}>{task.text}</div>
            <div style={{ display:"flex",gap:6,alignItems:"center",marginTop:2,flexWrap:"wrap" }}>
              {showCat && <span style={{ fontSize:9.5,color:cc,fontWeight:600 }}>{task.cat}</span>}
              {status==="active" && !done && <span style={{ fontSize:11,fontWeight:700,padding:"1.5px 6px",borderRadius:6,background:"var(--blue-soft)",color:"var(--blue)",border:"1px solid rgba(74,127,181,0.15)" }}>IN PROGRESS</span>}
              {isCustom && <span style={{ fontSize:11,fontWeight:700,padding:"1.5px 5px",borderRadius:6,background:"var(--purple-soft)",color:"var(--purple)" }}>added</span>}
              {blocked && <span style={{ fontSize:9.5,color:"#CC9B00",fontWeight:600 }}>⚠ {blocked}</span>}
              {note && !isExpanded && <span style={{ fontSize:12,color:"var(--text-muted)" }}>💬</span>}
            </div>
          </div>
          <Pill owner={task.owner} />
          {!done && (
            <div style={{ display:"flex",gap:3 }}>
              {isCustom && <button onClick={(e) => { e.stopPropagation(); if (confirm("Delete this task?")) deleteTask(task.id); }} style={{
                background:"transparent",border:"1px solid var(--border)",borderRadius:6,padding:"3px 6px",cursor:"pointer",fontSize:13,color:"var(--red)",fontFamily:"var(--font)",fontWeight:600,
              }}>✕</button>}
              <button onClick={(e) => { e.stopPropagation(); setExpandedTask(isExpanded?null:task.id); }} style={{
                background:isExpanded?"var(--accent-soft)":"transparent",border:"1px solid var(--border)",
                borderRadius:6,padding:"3px 6px",cursor:"pointer",fontSize:12,color:"var(--text-sec)",fontFamily:"var(--font)",fontWeight:600,
              }}>💬</button>
              <button onClick={(e) => { e.stopPropagation(); const r = prompt("Block reason?", data.blocked?.[task.id] || "Waiting on..."); if (r !== null) toggleBlocked(task.id, r); }} style={{
                background: blocked ? "var(--yellow-soft)" : "transparent", border:`1px solid ${blocked ? "var(--yellow)" : "var(--border)"}`,
                borderRadius:6,padding:"3px 6px",cursor:"pointer",fontSize:13,color:blocked?"#CC9B00":"var(--text-sec)",fontFamily:"var(--font)",fontWeight:600,
              }}>{blocked ? "⚠" : "🚧"}</button>
              <button onClick={(e) => { e.stopPropagation(); setMoveTask(moveTask===task.id?null:task.id); }} style={{
                background:moveTask===task.id?"var(--accent-soft)":"transparent",border:"1px solid var(--border)",
                borderRadius:6,padding:"3px 7px",cursor:"pointer",fontSize:14,color:"var(--text-sec)",fontFamily:"var(--font)",fontWeight:600,
              }}>→</button>
            </div>
          )}
          {moveTask === task.id && (
            <div style={{ position:"absolute",right:0,top:"100%",zIndex:50,background:"var(--card)",border:"1.5px solid var(--border)",borderRadius:"var(--radius)",boxShadow:"0 12px 40px rgba(0,0,0,0.1)",padding:8,minWidth:210 }} onClick={e=>e.stopPropagation()}>
              <div style={{ fontSize:13,color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,padding:"4px 8px" }}>Move to</div>
              {[0,1,2,3,4,5,6].map(i => {
                const d = nowEST(); d.setDate(d.getDate()+i); const key = dk(d);
                if (key === getTaskDate(task)) return null;
                return <div key={i} className="day-pill" onClick={()=>moveTaskToDate(task.id,key)} style={{padding:"8px 10px",borderRadius:8,cursor:"pointer",fontSize:15,color:"var(--text)",display:"flex",justifyContent:"space-between"}}>
                  <span>{i===0?"Today":i===1?"Tomorrow":fmtDay(key)}</span>
                  <span style={{color:"var(--text-muted)",fontSize:14}}>{fmt(key)}</span>
                </div>;
              })}
            </div>
          )}
        </div>
        {/* Expandable notes panel */}
        {isExpanded && (
          <div style={{ background:"var(--bg)",border:"1.5px solid var(--border)",borderTop:"none",borderRadius:"0 0 var(--radius-sm) var(--radius-sm)",padding:"14px 18px" }} onClick={e=>e.stopPropagation()}>
            <textarea value={note} onChange={e=>setTaskNote(task.id,e.target.value)}
              placeholder="Add notes, blockers, context..."
              style={{ width:"100%",border:"1.5px solid var(--border)",borderRadius:8,padding:"8px 10px",fontSize:14,color:"var(--text)",fontFamily:"var(--font)",background:"var(--card)",minHeight:50,lineHeight:1.5 }}
              onFocus={e=>e.target.style.borderColor="var(--accent)"} onBlur={e=>e.target.style.borderColor="var(--border)"}
            />
          </div>
        )}
      </div>
    );
  };

  // ============ XP / GAMIFICATION ============
  const XP_PER_EXP = 10;
  const XP_STREAK_BONUS = 5; // extra per day of streak
  const LEVELS = [
    { name: "Lab Rat", minXP: 0, emoji: "🐭" },
    { name: "Tinkerer", minXP: 50, emoji: "🔧" },
    { name: "Mad Scientist", minXP: 150, emoji: "🧬" },
    { name: "Growth Alchemist", minXP: 300, emoji: "⚗️" },
    { name: "Experiment Engine", minXP: 500, emoji: "🚀" },
  ];

  // Calculate total XP from all tried experiments
  const totalXP = (() => {
    let xp = 0;
    Object.keys(data.experiments || {}).forEach(k => {
      if (k.startsWith("tried:") && data.experiments[k]) xp += XP_PER_EXP;
    });
    // Streak bonus: consecutive days with at least 1 experiment
    let streak = 0;
    for (let i = 0; i < 60; i++) {
      const d = nowEST(); d.setDate(d.getDate() - i);
      const key = dk(d);
      const didAny = experimentBank.some(exp => data.experiments?.[`tried:${exp.id}:${key}`]);
      if (didAny) streak++;
      else break;
    }
    xp += streak * XP_STREAK_BONUS;
    return xp;
  })();

  const currentLevel = [...LEVELS].reverse().find(l => totalXP >= l.minXP) || LEVELS[0];
  const nextLevel = LEVELS[LEVELS.indexOf(currentLevel) + 1];
  const levelProgress = nextLevel ? Math.min(100, Math.round(((totalXP - currentLevel.minXP) / (nextLevel.minXP - currentLevel.minXP)) * 100)) : 100;

  // Experiment streak
  const expStreak = (() => {
    let s = 0;
    for (let i = 0; i < 60; i++) {
      const d = nowEST(); d.setDate(d.getDate() - i);
      const key = dk(d);
      if (experimentBank.some(exp => data.experiments?.[`tried:${exp.id}:${key}`])) s++;
      else break;
    }
    return s;
  })();

  // Today's experiment queue: all today's experiments, show one at a time
  const todayTriedCount = todayExperiments.filter(exp => data.experiments?.[`tried:${exp.id}:${todayKey}`]).length;
  // Find first un-tried experiment
  const currentExpIdx = todayExperiments.findIndex(exp => !data.experiments?.[`tried:${exp.id}:${todayKey}`]);
  const currentExp = currentExpIdx >= 0 ? todayExperiments[currentExpIdx] : null;
  const allExpsDone = todayExperiments.every(exp => data.experiments?.[`tried:${exp.id}:${todayKey}`]);

  // Shuffle: swap current experiment for a random one from the pool
  const shuffleExperiment = () => {
    const pool = phaseExps.filter(e => {
      if (filter === "Annie") return e.owner === "Annie" || e.owner === "Both";
      if (filter === "Dion") return e.owner === "Dion" || e.owner === "Both";
      return true;
    }).filter(e => !todayExperiments.includes(e));
    if (pool.length === 0) return;
    const replacement = pool[Math.floor(Math.random() * pool.length)];
    // Store shuffle in data so it persists
    save({ ...data, experiments: { ...data.experiments, [`shuffle:${todayKey}:${currentExpIdx}`]: replacement.id } });
  };

  // Metrics for scorecard (reused in Pulse)
  const metrics = [
    { icon: "💬", label: "Conversations", target: "5+" },
    { icon: "📞", label: "Calls Booked", target: "3+" },
    { icon: "📝", label: "LinkedIn Posts", target: "3/wk" },
    { icon: "🧪", label: "Experiments Run", target: "10+" },
    { icon: "🤝", label: "Warm Intros", target: "5+" },
    { icon: "📊", label: "Pipeline Value", target: "$15K+" },
  ];



  // ============ RENDER ============

  // Today context
  const hour = nowEST().getHours();
  const dateStr = nowEST().toLocaleDateString("en-US",{ weekday:"long", month:"long", day:"numeric" });
  const todayTasks = allTasks.filter(t => getTaskDate(t) === todayKey && matchFilter(t.owner));
  const todayTasksDone = todayTasks.filter(t => data.tasks?.[t.id]).length;

  if (loading) return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"var(--bg)",fontFamily:"var(--font)" }}>
      <style>{css}</style>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:34,fontWeight:300,color:"var(--text)",letterSpacing:2,fontFamily:"var(--font-display)" }}>quietly</div>
        <div style={{ color:"var(--text-muted)",fontSize:14,marginTop:12,letterSpacing:0.5,fontWeight:400 }}>Preparing your day...</div>
      </div>
    </div>
  );

  const TaskCard = ({ task, showCat = false, compact = false }) => {
    const rawDone = !!data.tasks?.[task.id];
    const status = data.taskStatus?.[task.id] || (rawDone ? "done" : "todo");
    const done = status === "done" || rawDone;
    const cc = catColors[task.cat] || "var(--accent)";
    const blocked = data.blocked?.[task.id];
    const isCustom = !!task.custom;
    const note = data.taskNotes?.[task.id] || "";
    const isExpanded = expandedTask === task.id;
    const cycleStatus = (e) => {
      e.stopPropagation();
      if (status === "todo") save({ ...data, taskStatus: { ...data.taskStatus, [task.id]: "active" } });
      else if (status === "active") save({ ...data, tasks: { ...data.tasks, [task.id]: true }, taskStatus: { ...data.taskStatus, [task.id]: "done" } });
      else if (status === "done" || done) save({ ...data, tasks: { ...data.tasks, [task.id]: false }, taskStatus: { ...data.taskStatus, [task.id]: "todo" } });
    };
    return (
      <div style={{ marginBottom:1 }}>
        <div className="task-row" style={{
          display:"flex",alignItems:"center",gap:10,padding:compact?"8px 12px":"10px 14px",
          background: blocked ? "var(--yellow-soft)" : status==="active" ? "rgba(74,111,165,0.03)" : done ? "var(--card-done)" : "var(--card)",
          borderRadius: isExpanded ? "var(--radius-sm) var(--radius-sm) 0 0" : "var(--radius-sm)",
          border:`1px solid ${blocked ? "rgba(160,136,58,0.15)" : status==="active" ? "rgba(74,111,165,0.12)" : done ? "rgba(74,124,89,0.1)" : "var(--border)"}`,
          opacity: done ? 0.45 : 1, cursor:"pointer",position:"relative",
        }}>
          <button onClick={cycleStatus} style={{
            width:24,height:24,borderRadius:"50%",flexShrink:0,border:"none",cursor:"pointer",padding:0,
            background: done ? "var(--green)" : status==="active" ? "var(--blue)" : "var(--bg)",
            display:"flex",alignItems:"center",justifyContent:"center",
            boxShadow: done||status==="active" ? "none" : "inset 0 0 0 1.5px var(--border)",
          }}>
            {done && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            {status==="active" && !done && <div style={{width:6,height:6,borderRadius:"50%",background:"white"}} />}
          </button>
          <div style={{ flex:1,minWidth:0 }} onClick={()=>setExpandedTask(isExpanded?null:task.id)}>
            <div style={{ fontSize:compact?12:13,lineHeight:1.5,color:done?"var(--text-muted)":"var(--text)",textDecoration:done?"line-through":"none",fontWeight:done?400:500 }}>{task.text}</div>
            <div style={{ display:"flex",gap:5,alignItems:"center",marginTop:1,flexWrap:"wrap" }}>
              {showCat && <span style={{ fontSize:12,color:cc,fontWeight:600 }}>{task.cat}</span>}
              {status==="active" && !done && <span style={{ fontSize:10,fontWeight:700,padding:"1px 5px",borderRadius:4,background:"rgba(74,111,165,0.06)",color:"var(--blue)",letterSpacing:0.5 }}>IN PROGRESS</span>}
              {isCustom && <span style={{ fontSize:10,fontWeight:700,padding:"1px 5px",borderRadius:4,background:"var(--purple-soft)",color:"var(--purple)" }}>ADDED</span>}
              {blocked && <span style={{ fontSize:12,color:"var(--yellow)",fontWeight:600 }}>⚠ {blocked}</span>}
              {note && !isExpanded && <span style={{ fontSize:11,color:"var(--text-muted)" }}>💬</span>}
            </div>
          </div>
          <span style={{ fontSize:12,fontWeight:600,color:oc[task.owner]?.text,letterSpacing:0.3 }}>{task.owner === "Both" ? "Both" : task.owner.charAt(0)}</span>
          {!done && (
            <div style={{ display:"flex",gap:2 }}>
              {isCustom && <button onClick={(e) => { e.stopPropagation(); if (confirm("Delete?")) deleteTask(task.id); }} style={{ background:"transparent",border:"none",cursor:"pointer",fontSize:12,color:"var(--text-muted)",padding:"2px 4px",fontFamily:"var(--font)" }}>✕</button>}
              <button onClick={(e) => { e.stopPropagation(); const r = prompt("Block reason?", data.blocked?.[task.id] || "Waiting on..."); if (r !== null) toggleBlocked(task.id, r); }} style={{ background:"transparent",border:"none",cursor:"pointer",fontSize:12,color:blocked?"var(--yellow)":"var(--text-muted)",padding:"2px 4px" }}>🚧</button>
              <button onClick={(e) => { e.stopPropagation(); setMoveTask(moveTask===task.id?null:task.id); }} style={{ background:"transparent",border:"none",cursor:"pointer",fontSize:12,color:"var(--text-muted)",padding:"2px 4px" }}>→</button>
            </div>
          )}
          {moveTask === task.id && (
            <div style={{ position:"absolute",right:0,top:"100%",zIndex:50,background:"var(--card)",border:"1px solid var(--border)",borderRadius:"var(--radius)",boxShadow:"var(--shadow-lg)",padding:6,minWidth:200 }} onClick={e=>e.stopPropagation()}>
              <div style={{ fontSize:12,color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase",letterSpacing:1,padding:"4px 8px" }}>Move to</div>
              {[0,1,2,3,4,5,6].map(i => {
                const d = nowEST(); d.setDate(d.getDate()+i); const key = dk(d);
                if (key === getTaskDate(task)) return null;
                return <div key={i} className="day-pill" onClick={()=>moveTaskToDate(task.id,key)} style={{padding:"7px 8px",borderRadius:6,cursor:"pointer",fontSize:14,color:"var(--text)",display:"flex",justifyContent:"space-between"}}>
                  <span>{i===0?"Today":i===1?"Tomorrow":fmtDay(key)}</span><span style={{color:"var(--text-muted)",fontSize:13}}>{fmt(key)}</span>
                </div>;
              })}
            </div>
          )}
        </div>
        {isExpanded && (
          <div style={{ background:"var(--bg)",border:"1px solid var(--border)",borderTop:"none",borderRadius:"0 0 var(--radius-sm) var(--radius-sm)",padding:"14px 18px" }} onClick={e=>e.stopPropagation()}>
            <textarea value={note} onChange={e=>setTaskNote(task.id,e.target.value)} placeholder="Notes, blockers, context..."
              style={{ width:"100%",border:"1px solid var(--border)",borderRadius:6,padding:"6px 8px",fontSize:14,color:"var(--text)",fontFamily:"var(--font)",background:"var(--card)",minHeight:40,lineHeight:1.5 }}
              onFocus={e=>e.target.style.borderColor="var(--accent)"} onBlur={e=>e.target.style.borderColor="var(--border)"}
            />
          </div>
        )}
      </div>
    );
  };

  const Label = ({ children }) => <div style={{ fontSize:12,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1.5,marginBottom:10 }}>{children}</div>;

  return (
    <div style={{ minHeight:"100vh",background:"var(--bg)",fontFamily:"var(--font)" }}>
      <style>{css}</style>
      {showConfetti && <Confetti active={true} />}

      {/* ===== HEADER ===== */}
      <div style={{ position:"sticky",top:0,zIndex:100,background:"var(--bg)",borderBottom:"1px solid var(--border)" }}>
        <div style={{ maxWidth:680,margin:"0 auto",padding:"14px 24px 0" }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
            <span style={{ fontSize:20,fontWeight:400,color:"var(--text)",letterSpacing:1.5,fontFamily:"var(--font-display)" }}>quietly</span>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <div style={{ display:"flex",gap:1 }}>
                {["All","Annie","Dion"].map(f => (
                  <button key={f} onClick={()=>setFilter(f)} style={{
                    padding:"5px 12px",borderRadius:20,fontSize:12,fontWeight:filter===f?700:500,cursor:"pointer",letterSpacing:0.5,
                    background:filter===f?"var(--accent)":"transparent",color:filter===f?"white":"var(--text-muted)",
                    border:"none",fontFamily:"var(--font)",transition:"all 0.15s",
                  }}>{f}</button>
                ))}
              </div>
              <button onClick={async()=>{setSyncing(true);await load();setSyncing(false);}} style={{ background:"none",border:"none",cursor:"pointer",fontSize:15,color:"var(--text-muted)",padding:"4px" }}>{syncing?"⟳":"↻"}</button>
              <div style={{ position:"relative",display:"flex",alignItems:"center" }}>
                <Ring pct={pct} size={40} stroke={3.5} />
                <span style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"var(--text)",letterSpacing:-0.3 }}>{pct}%</span>
              </div>
            </div>
          </div>
          <div style={{ display:"flex",gap:24 }}>
            {[
              { id:"dashboard", label:"Today", badge:filteredOverdue.length },
              { id:"experiments", label:"Lab" },
              { id:"habits", label:"Habits" },
              { id:"vision", label:"Vision" },
              { id:"pulse", label:"Pulse" },
            ].map(t => (
              <button key={t.id} className={`tab-btn ${view===t.id?"active":""}`} onClick={()=>setView(t.id)} style={{ position:"relative" }}>
                {t.label}
                {t.badge > 0 && <span className="tab-badge">{t.badge}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:680,margin:"0 auto",padding:"24px 24px 80px" }}>

        {/* ===== TODAY ===== */}
        {view === "dashboard" && (
          <div className="fin">
            {/* Date */}
            <div style={{ marginBottom:28 }}>
              <div style={{ fontSize:28,fontWeight:300,color:"var(--text)",fontFamily:"var(--font-display)",lineHeight:1.3,letterSpacing:0.2 }}>{dateStr}</div>
              <div style={{ fontSize:14,color:"var(--text-muted)",fontWeight:400,marginTop:4,fontStyle:"italic" }}>
                "{quote.text}"
                {todayEnergy && <span style={{ fontStyle:"normal",marginLeft:6 }}>{todayEnergy==="high"?"🔥":todayEnergy==="medium"?"⚡":"🌊"}</span>}
              </div>
            </div>

            {/* Energy — only show if not set */}
            {!todayEnergy && (
              <div style={{ display:"flex",gap:6,marginBottom:24 }}>
                <span style={{ fontSize:14,color:"var(--text-muted)",fontWeight:500,paddingTop:4 }}>Energy:</span>
                {[{l:"high",e:"🔥",t:"High"},{l:"medium",e:"⚡",t:"Medium"},{l:"low",e:"🌊",t:"Low"}].map(e => (
                  <button key={e.l} onClick={()=>setEnergy(e.l)} style={{ padding:"4px 12px",borderRadius:20,border:"1px solid var(--border)",background:"var(--card)",cursor:"pointer",fontSize:14,color:"var(--text-sec)",fontFamily:"var(--font)",fontWeight:500 }}>{e.e} {e.t}</button>
                ))}
              </div>
            )}

            {/* 90-day sprint */}
            <div onClick={()=>setView("vision")} style={{ display:"flex",alignItems:"center",gap:12,padding:"14px 18px",marginBottom:12,background:"var(--card)",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)",cursor:"pointer",transition:"all 0.12s" }}
              onMouseEnter={e=>e.currentTarget.style.borderColor="var(--accent)"} onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
              <div style={{ width:3,alignSelf:"stretch",borderRadius:3,background:"var(--accent)",flexShrink:0 }} />
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:11,fontWeight:700,color:"var(--accent)",textTransform:"uppercase",letterSpacing:1.5,marginBottom:4 }}>90-day sprint</div>
                <div style={{ fontSize:14,color:"var(--text-sec)",fontWeight:500,lineHeight:1.5 }}>{VISION_90}</div>
              </div>
            </div>

            {/* Self-story + Milestone */}
            {(selfStory.shown > 0 || milestone) && (
              <div style={{ display:"flex",gap:8,marginBottom:16,flexWrap:"wrap" }}>
                {selfStory.shown > 0 && (
                  <div style={{ flex:1,minWidth:180,background:"var(--blue-soft)",borderRadius:"var(--radius-sm)",padding:"14px 18px",border:"1px solid rgba(74,111,165,0.08)" }}>
                    <div style={{ fontSize:11,fontWeight:700,color:"var(--blue)",textTransform:"uppercase",letterSpacing:1.2,marginBottom:3 }}>Self-story</div>
                    <div style={{ fontSize:15,color:"var(--text)",fontWeight:500 }}>
                      Shown up <span style={{ color:"var(--accent)",fontWeight:700 }}>{selfStory.shown}</span>/{selfStory.total} weekdays
                      {selfStory.shown >= selfStory.total - 1 ? " 💪" : selfStory.shown >= selfStory.total * 0.7 ? " 🌱" : " 🗳️"}
                    </div>
                  </div>
                )}
                {milestone && (
                  <div style={{ minWidth:100,background:"var(--yellow-soft)",borderRadius:"var(--radius-sm)",padding:"14px 18px",border:"1px solid rgba(160,136,58,0.08)",textAlign:"center" }}>
                    <div style={{ fontSize:24 }}>{milestone.emoji}</div>
                    <div style={{ fontSize:13,color:"var(--accent)",fontWeight:700,marginTop:2 }}>{milestone.text}</div>
                  </div>
                )}
              </div>
            )}

            {/* THE ONE THING */}
            <div style={{
              background:"var(--card)",borderRadius:"var(--radius)",padding:"24px",
              border:data.highlight?.[todayKey]?"1px solid var(--accent)":"1px dashed var(--border)",
              marginBottom:28,boxShadow:data.highlight?.[todayKey]?"0 0 0 3px var(--accent-glow)":"none",
            }}>
              <div style={{ fontSize:12,fontWeight:700,color:"var(--accent)",textTransform:"uppercase",letterSpacing:2,marginBottom:10 }}>Today's focus</div>
              <input type="text" value={data.highlight?.[todayKey]||""} onChange={e=>setHighlight(e.target.value)}
                placeholder="What matters most today?"
                style={{ width:"100%",border:"none",fontSize:22,fontWeight:400,color:"var(--text)",fontFamily:"var(--font-display)",background:"transparent",lineHeight:1.5,letterSpacing:0.2 }}
              />
            </div>

            {/* Habits */}
            <Label>Daily habits</Label>
            <div style={{ display:"flex",flexDirection:"column",gap:3,marginBottom:28 }}>
              {filteredDaily.map(h => {
                const done = !!data.habits?.[`${h.id}:${todayKey}`];
                const streak = getStreak(h.id, data.habits||{});
                return (
                  <div key={h.id} className="task-row" onClick={()=>toggleHabit(h.id)} style={{
                    display:"flex",alignItems:"center",gap:10,padding:"14px 18px",
                    background:done?"var(--green-soft)":"var(--card)",borderRadius:"var(--radius-sm)",cursor:"pointer",
                    border:`1px solid ${done?"rgba(74,124,89,0.1)":"var(--border)"}`,
                  }}>
                    <div style={{ width:22,height:22,borderRadius:"50%",flexShrink:0,background:done?"var(--green)":"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:done?"none":"inset 0 0 0 1.5px var(--border)" }}>
                      {done && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span style={{ flex:1,fontSize:15,fontWeight:500,color:done?"var(--green)":"var(--text)" }}>{h.text}</span>
                    {streak > 1 && <span className="streak-b">🔥 {streak}</span>}
                    <span style={{ fontSize:12,color:oc[h.owner]?.text,fontWeight:600 }}>{h.owner === "Both" ? "Both" : h.owner.charAt(0)}</span>
                  </div>
                );
              })}
            </div>

            {/* Overdue */}
            {filteredOverdue.length > 0 && (
              <div style={{ marginBottom:28 }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
                  <Label>Overdue · {filteredOverdue.length}</Label>
                  <button onClick={bumpOverdue} style={{ background:"none",border:"1px solid var(--border)",color:"var(--text-sec)",padding:"3px 10px",borderRadius:20,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"var(--font)" }}>Move to today</button>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:2 }}>
                  {filteredOverdue.slice(0,5).map(t => <TaskCard key={t.id} task={t} showCat compact />)}
                  {filteredOverdue.length > 5 && <div style={{ fontSize:14,color:"var(--text-muted)",padding:"6px 0",textAlign:"center" }}>+ {filteredOverdue.length - 5} more</div>}
                </div>
              </div>
            )}

            {/* Tasks */}
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
              <Label>Tasks · {todayTasksDone}/{todayTasks.length}</Label>
            </div>
            {todayTasks.length === 0 && !showAddTask ? (
              <div style={{ padding:"28px 20px",color:"var(--text-muted)",fontSize:15,textAlign:"center",background:"var(--card)",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)",marginBottom:28 }}>
                {isWknd(nowEST()) ? "Weekend — rest." : "Nothing scheduled today."}
              </div>
            ) : (
              <div style={{ display:"flex",flexDirection:"column",gap:2,marginBottom:4 }}>
                {todayTasks.map(t => <TaskCard key={t.id} task={t} showCat />)}
              </div>
            )}
            {!showAddTask ? (
              <button onClick={() => setShowAddTask(true)} style={{ width:"100%",padding:"8px",marginBottom:28,background:"transparent",border:"1px dashed var(--border)",borderRadius:"var(--radius-sm)",cursor:"pointer",fontSize:14,fontWeight:500,color:"var(--text-muted)",fontFamily:"var(--font)" }}
                onMouseEnter={e=>{e.target.style.borderColor="var(--accent)";e.target.style.color="var(--accent)";}} onMouseLeave={e=>{e.target.style.borderColor="var(--border)";e.target.style.color="var(--text-muted)";}}>
                + Add task
              </button>
            ) : (
              <div style={{ background:"var(--card)",border:"1px solid var(--accent)",borderRadius:"var(--radius)",padding:"16px 18px",marginBottom:28 }}>
                <input type="text" value={newTask.text} onChange={e=>setNewTask(p=>({...p,text:e.target.value}))} placeholder="What needs to happen?" autoFocus
                  onKeyDown={e=>{ if (e.key==="Enter" && newTask.text.trim()) addTask(todayKey); if (e.key==="Escape") setShowAddTask(false); }}
                  style={{ width:"100%",border:"none",fontSize:16,fontWeight:500,color:"var(--text)",fontFamily:"var(--font)",background:"transparent",marginBottom:10 }}
                />
                <div style={{ display:"flex",gap:6,alignItems:"center",flexWrap:"wrap" }}>
                  <div style={{ display:"flex",gap:2 }}>
                    {["Annie","Dion","Both"].map(o => (
                      <button key={o} onClick={()=>setNewTask(p=>({...p,owner:o}))} style={{
                        padding:"3px 8px",borderRadius:12,fontSize:12,fontWeight:600,cursor:"pointer",
                        background:newTask.owner===o?oc[o].bg:"transparent",color:newTask.owner===o?oc[o].text:"var(--text-muted)",
                        border:newTask.owner===o?`1px solid ${oc[o].text}`:"1px solid var(--border)",fontFamily:"var(--font)",
                      }}>{o}</button>
                    ))}
                  </div>
                  <input type="text" value={newTask.cat} onChange={e=>setNewTask(p=>({...p,cat:e.target.value}))} placeholder="Category"
                    style={{ flex:1,minWidth:60,border:"1px solid var(--border)",borderRadius:8,padding:"3px 8px",fontSize:13,color:"var(--text)",fontFamily:"var(--font)",background:"var(--bg)" }} />
                  <button onClick={()=>setShowAddTask(false)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:13,color:"var(--text-muted)",fontFamily:"var(--font)" }}>Cancel</button>
                  <button onClick={()=>addTask(todayKey)} disabled={!newTask.text.trim()} style={{ padding:"4px 12px",borderRadius:8,fontSize:13,fontWeight:600,cursor:newTask.text.trim()?"pointer":"default",background:newTask.text.trim()?"var(--accent)":"var(--border)",color:"white",border:"none",fontFamily:"var(--font)" }}>Add</button>
                </div>
              </div>
            )}

            {/* Tomorrow */}
            {(() => {
              const tmrw = nowEST(); tmrw.setDate(tmrw.getDate()+1); const tmrwKey = dk(tmrw);
              const tmrwTasks = allTasks.filter(t => getTaskDate(t) === tmrwKey && matchFilter(t.owner));
              if (tmrwTasks.length === 0) return null;
              const exp = expandedTask === "tmrw";
              return (
                <div style={{ marginBottom:16 }}>
                  <div className="task-row" onClick={()=>setExpandedTask(exp?null:"tmrw")} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",background:"var(--card)",borderRadius:exp?"var(--radius-sm) var(--radius-sm) 0 0":"var(--radius-sm)",border:"1px solid var(--border)",cursor:"pointer" }}>
                    <span style={{ fontSize:15,fontWeight:600,color:"var(--text)" }}>Tomorrow</span>
                    <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                      <span style={{ fontSize:13,color:"var(--text-muted)" }}>{tmrwTasks.length} tasks</span>
                      <span style={{ fontSize:13,color:"var(--text-muted)",transform:exp?"rotate(90deg)":"none",transition:"transform 0.15s" }}>▸</span>
                    </div>
                  </div>
                  {exp && <div style={{ background:"var(--bg)",border:"1px solid var(--border)",borderTop:"none",borderRadius:"0 0 var(--radius-sm) var(--radius-sm)",padding:8 }}>
                    <div style={{ display:"flex",flexDirection:"column",gap:2 }}>{tmrwTasks.map(t => <TaskCard key={t.id} task={t} showCat compact />)}</div>
                  </div>}
                </div>
              );
            })()}

            {/* This week */}
            {(() => {
              const mon = nowEST(); mon.setDate(mon.getDate()-mon.getDay()+1);
              const sun = new Date(mon); sun.setDate(sun.getDate()+6);
              const tmrw = nowEST(); tmrw.setDate(tmrw.getDate()+1);
              const weekDays = getDaysInRange(dk(mon),dk(sun)).filter(d => d !== todayKey && d !== dk(tmrw));
              const weekTasksAll = weekDays.flatMap(d => allTasks.filter(t => getTaskDate(t)===d && matchFilter(t.owner)));
              const weekDone = weekTasksAll.filter(t => data.tasks?.[t.id]).length;
              if (weekTasksAll.length === 0) return null;
              const exp = expandedTask === "week";
              return (
                <div style={{ marginBottom:16 }}>
                  <div className="task-row" onClick={()=>setExpandedTask(exp?null:"week")} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",background:"var(--card)",borderRadius:exp?"var(--radius-sm) var(--radius-sm) 0 0":"var(--radius-sm)",border:"1px solid var(--border)",cursor:"pointer" }}>
                    <span style={{ fontSize:15,fontWeight:600,color:"var(--text)" }}>This week</span>
                    <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                      <div style={{ width:40,height:3,background:"var(--bg)",borderRadius:3,overflow:"hidden",border:"1px solid var(--border)" }}>
                        <div style={{ height:"100%",background:weekDone===weekTasksAll.length?"var(--green)":"var(--accent)",width:`${weekTasksAll.length?(weekDone/weekTasksAll.length)*100:0}%`,borderRadius:3 }} />
                      </div>
                      <span style={{ fontSize:13,color:"var(--text-muted)" }}>{weekDone}/{weekTasksAll.length}</span>
                      <span style={{ fontSize:13,color:"var(--text-muted)",transform:exp?"rotate(90deg)":"none",transition:"transform 0.15s" }}>▸</span>
                    </div>
                  </div>
                  {exp && <div style={{ background:"var(--bg)",border:"1px solid var(--border)",borderTop:"none",borderRadius:"0 0 var(--radius-sm) var(--radius-sm)",padding:8 }}>
                    {weekDays.map(day => {
                      const dt = allTasks.filter(t => getTaskDate(t)===day && matchFilter(t.owner));
                      if (!dt.length) return null;
                      return <div key={day} style={{ marginBottom:8 }}>
                        <div style={{ fontSize:13,fontWeight:600,color:"var(--text-sec)",marginBottom:3,paddingLeft:4 }}>{fmtDay(day)} · {fmt(day)}</div>
                        <div style={{ display:"flex",flexDirection:"column",gap:2 }}>{dt.map(t=><TaskCard key={t.id} task={t} showCat compact />)}</div>
                      </div>;
                    })}
                  </div>}
                </div>
              );
            })()}

            {/* Upcoming */}
            {(() => {
              const sun = nowEST(); sun.setDate(sun.getDate()+(7-sun.getDay()));
              const weeks = [];
              for (let w = 0; w < 4; w++) {
                const ws = new Date(sun); ws.setDate(ws.getDate()+1+w*7);
                const we = new Date(ws); we.setDate(we.getDate()+6);
                const wdays = getDaysInRange(dk(ws),dk(we));
                const wt = wdays.flatMap(d => allTasks.filter(t => getTaskDate(t)===d && matchFilter(t.owner)));
                if (wt.length > 0) weeks.push({ label:`Week of ${fmt(dk(ws))}`, tasks:wt, done:wt.filter(t=>data.tasks?.[t.id]).length, total:wt.length, startKey:dk(ws), days:wdays });
              }
              if (!weeks.length) return null;
              return <div style={{ marginBottom:28 }}>
                <Label>Upcoming</Label>
                {weeks.map(w => {
                  const exp = expandedTask === `wk:${w.startKey}`;
                  const p = Math.round((w.done/w.total)*100);
                  return <div key={w.startKey} style={{ marginBottom:4 }}>
                    <div className="task-row" onClick={()=>setExpandedTask(exp?null:`wk:${w.startKey}`)} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",background:"var(--card)",borderRadius:exp?"var(--radius-sm) var(--radius-sm) 0 0":"var(--radius-sm)",border:"1px solid var(--border)",cursor:"pointer" }}>
                      <span style={{ fontSize:15,fontWeight:600,color:"var(--text)" }}>{w.label}</span>
                      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                        <div style={{ width:40,height:3,background:"var(--bg)",borderRadius:3,overflow:"hidden",border:"1px solid var(--border)" }}>
                          <div style={{ height:"100%",background:p===100?"var(--green)":"var(--accent)",borderRadius:3,width:`${p}%` }} />
                        </div>
                        <span style={{ fontSize:13,color:"var(--text-muted)" }}>{w.done}/{w.total}</span>
                        <span style={{ fontSize:13,color:"var(--text-muted)",transform:exp?"rotate(90deg)":"none",transition:"transform 0.15s" }}>▸</span>
                      </div>
                    </div>
                    {exp && <div style={{ background:"var(--bg)",border:"1px solid var(--border)",borderTop:"none",borderRadius:"0 0 var(--radius-sm) var(--radius-sm)",padding:8 }}>
                      {w.days.map(day => {
                        const dt = allTasks.filter(t => getTaskDate(t)===day && matchFilter(t.owner));
                        if (!dt.length) return null;
                        return <div key={day} style={{ marginBottom:8 }}>
                          <div style={{ fontSize:13,fontWeight:600,color:"var(--text-sec)",marginBottom:3,paddingLeft:4 }}>{fmtDay(day)} · {fmt(day)}</div>
                          <div style={{ display:"flex",flexDirection:"column",gap:2 }}>{dt.map(t=><TaskCard key={t.id} task={t} showCat compact />)}</div>
                        </div>;
                      })}
                    </div>}
                  </div>;
                })}
              </div>;
            })()}

            {/* Win of the day */}
            <div style={{ background:"var(--card)",borderRadius:"var(--radius)",padding:"20px 24px",border:todayWin?"1px solid rgba(74,124,89,0.1)":"1px dashed var(--border)" }}>
              <div style={{ fontSize:12,fontWeight:700,color:"var(--green)",textTransform:"uppercase",letterSpacing:2,marginBottom:8 }}>Win of the day</div>
              <input type="text" value={todayWin} onChange={e=>setWin(e.target.value)} placeholder="What went right today?"
                style={{ width:"100%",border:"none",fontSize:17,fontWeight:400,color:"var(--text)",fontFamily:"var(--font-display)",background:"transparent",lineHeight:1.5 }} />
            </div>
          </div>
        )}

        {/* ===== LAB ===== */}
        {view === "experiments" && (
          <div className="fin">
            {/* XP Hero Card */}
            <div style={{ background:"linear-gradient(135deg, #1A1715 0%, #2A2520 50%, #1A1715 100%)",borderRadius:"var(--radius)",padding:"24px",marginBottom:24,position:"relative",overflow:"hidden" }}>
              <div style={{ position:"absolute",top:-20,right:-20,width:120,height:120,borderRadius:"50%",background:"rgba(160,82,45,0.06)" }} />
              <div style={{ position:"absolute",bottom:-30,left:-30,width:80,height:80,borderRadius:"50%",background:"rgba(160,82,45,0.04)" }} />
              <div style={{ display:"flex",alignItems:"center",gap:14,marginBottom:16,position:"relative" }}>
                <div style={{ fontSize:44,lineHeight:1 }}>{currentLevel.emoji}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:18,fontWeight:700,color:"white",letterSpacing:0.3 }}>{currentLevel.name}</div>
                  <div style={{ fontSize:13,color:"rgba(255,255,255,0.4)",marginTop:2 }}>{totalXP} XP earned</div>
                </div>
                {expStreak > 0 && (
                  <div style={{ display:"flex",flexDirection:"column",alignItems:"center",background:"rgba(255,100,100,0.12)",padding:"8px 14px",borderRadius:16 }}>
                    <span style={{ fontSize:20 }}>🔥</span>
                    <span style={{ fontSize:16,fontWeight:800,color:"#FF6B6B" }}>{expStreak}</span>
                    <span style={{ fontSize:9,color:"rgba(255,100,100,0.5)",fontWeight:600 }}>STREAK</span>
                  </div>
                )}
              </div>
              <div style={{ position:"relative" }}>
                <div style={{ height:8,background:"rgba(255,255,255,0.06)",borderRadius:8,overflow:"hidden" }}>
                  <div style={{ height:"100%",background:"linear-gradient(90deg, #A0522D, #E8845C, #C06830)",borderRadius:8,width:`${Math.min(100,levelProgress)}%`,transition:"width 0.8s cubic-bezier(0.175,0.885,0.32,1.275)",boxShadow:"0 0 12px rgba(160,82,45,0.3)" }} />
                </div>
                {nextLevel && (
                  <div style={{ display:"flex",justifyContent:"space-between",marginTop:6 }}>
                    <span style={{ fontSize:11,color:"rgba(255,255,255,0.2)" }}>{currentLevel.name}</span>
                    <span style={{ fontSize:11,color:"rgba(255,255,255,0.3)",fontWeight:600 }}>{nextLevel.minXP - totalXP} XP to {nextLevel.emoji} {nextLevel.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Today's Experiment — card game style */}
            {(() => {
              if (todayExperiments.length === 0) return <div style={{ padding:24,textAlign:"center",color:"var(--text-muted)",fontSize:15 }}>No experiments for this phase.</div>;
              const safe = Math.min(expIndex, todayExperiments.length - 1);
              const exp = todayExperiments[safe];
              const tried = data.experiments?.[`tried:${exp.id}`];
              const cc = expCatColors[exp.cat] || "var(--accent)";
              return (
                <div style={{ marginBottom:24 }}>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
                    <Label>Today's experiment</Label>
                    <span style={{ fontSize:12,color:"var(--text-muted)" }}>{safe + 1} of {todayExperiments.length}</span>
                  </div>
                  <div style={{ background:"var(--card)",borderRadius:"var(--radius)",border:`2px solid ${tried?"var(--green)":cc+"30"}`,overflow:"hidden",boxShadow:tried?"none":"0 4px 20px rgba(0,0,0,0.04)" }}>
                    {/* Category ribbon */}
                    <div style={{ background:cc+"12",padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                        <span style={{ fontSize:18 }}>{expCatEmoji[exp.cat]}</span>
                        <span style={{ fontSize:12,fontWeight:700,color:cc,textTransform:"uppercase",letterSpacing:1 }}>{exp.cat}</span>
                      </div>
                      <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                        <span style={{ fontSize:12,color:oc[exp.owner]?.text,fontWeight:600 }}>{exp.owner}</span>
                        {tried && <span style={{ fontSize:12,fontWeight:700,color:"var(--green)" }}>✓ DONE</span>}
                      </div>
                    </div>

                    <div style={{ padding:"20px 20px 16px" }}>
                      <div style={{ fontSize:19,fontWeight:700,color:"var(--text)",lineHeight:1.4,marginBottom:14 }}>{exp.title}</div>

                      <div style={{ display:"flex",flexDirection:"column",gap:10,marginBottom:14 }}>
                        <div style={{ background:"var(--bg)",borderRadius:8,padding:"10px 14px" }}>
                          <div style={{ fontSize:10,fontWeight:700,color:cc,textTransform:"uppercase",letterSpacing:1,marginBottom:3 }}>💡 Hypothesis</div>
                          <div style={{ fontSize:13,color:"var(--text-sec)",lineHeight:1.5 }}>{exp.hyp}</div>
                        </div>
                        <div style={{ background:"var(--bg)",borderRadius:8,padding:"10px 14px" }}>
                          <div style={{ fontSize:10,fontWeight:700,color:cc,textTransform:"uppercase",letterSpacing:1,marginBottom:3 }}>⚡ Action</div>
                          <div style={{ fontSize:13,color:"var(--text-sec)",lineHeight:1.5 }}>{exp.action}</div>
                        </div>
                        <div style={{ background:"var(--bg)",borderRadius:8,padding:"10px 14px" }}>
                          <div style={{ fontSize:10,fontWeight:700,color:cc,textTransform:"uppercase",letterSpacing:1,marginBottom:3 }}>📏 Measure</div>
                          <div style={{ fontSize:13,color:"var(--text-sec)",lineHeight:1.5 }}>{exp.measure}</div>
                        </div>
                      </div>

                      <div style={{ fontSize:11,color:"var(--text-muted)",fontStyle:"italic" }}>{exp.credit}</div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display:"flex",borderTop:"1px solid var(--border)" }}>
                      <button onClick={() => { save({ ...data, experiments: { ...data.experiments, [`tried:${exp.id}`]: true, [`tried:${exp.id}:date`]: todayKey } }); setShowConfetti(true); setTimeout(()=>setShowConfetti(false),2000); }} disabled={tried}
                        style={{ flex:1,padding:"14px",border:"none",cursor:tried?"default":"pointer",fontSize:15,fontWeight:700,fontFamily:"var(--font)",
                          background:tried?"var(--green-soft)":"linear-gradient(135deg, var(--accent), #C06830)",
                          color:tried?"var(--green)":"white",
                          letterSpacing:0.3,
                        }}>
                        {tried ? "✓ Experiment complete!" : "🧪 Mark as tried → +10 XP"}
                      </button>
                      <button onClick={() => setExpIndex((safe + 1) % todayExperiments.length)}
                        style={{ padding:"14px 20px",border:"none",borderLeft:"1px solid var(--border)",cursor:"pointer",fontSize:18,fontFamily:"var(--font)",background:"var(--card)",color:"var(--text-sec)" }}>🔀</button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Recent experiments */}
            <Label>Experiment history</Label>
            {(() => {
              const tried = experimentBank.filter(e => data.experiments?.[`tried:${e.id}`]).reverse();
              if (!tried.length) return (
                <div style={{ padding:"32px 20px",textAlign:"center",background:"var(--card)",borderRadius:"var(--radius)",border:"1px dashed var(--border)" }}>
                  <div style={{ fontSize:32,marginBottom:8 }}>🧪</div>
                  <div style={{ fontSize:14,color:"var(--text-muted)",fontWeight:500 }}>No experiments tried yet.</div>
                  <div style={{ fontSize:12,color:"var(--text-muted)",marginTop:4 }}>Complete your first one above to start earning XP!</div>
                </div>
              );
              return tried.slice(0,8).map(e => (
                <div key={e.id} style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"var(--card)",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)",marginBottom:3 }}>
                  <span style={{ fontSize:16 }}>{expCatEmoji[e.cat]}</span>
                  <div style={{ flex:1,minWidth:0 }}>
                    <span style={{ fontSize:13,fontWeight:600,color:"var(--text)" }}>{e.title}</span>
                    {data.experiments?.[`tried:${e.id}:date`] && <span style={{ fontSize:11,color:"var(--text-muted)",marginLeft:6 }}>{fmt(data.experiments[`tried:${e.id}:date`])}</span>}
                  </div>
                  <span style={{ fontSize:11,fontWeight:700,color:"var(--green)",background:"var(--green-soft)",padding:"2px 8px",borderRadius:10 }}>+10 XP</span>
                </div>
              ));
            })()}

            {/* Stats footer */}
            {(() => {
              const triedCount = experimentBank.filter(e => data.experiments?.[`tried:${e.id}`]).length;
              const total = experimentBank.length;
              if (triedCount === 0) return null;
              return (
                <div style={{ marginTop:16,padding:"14px 18px",background:"var(--dark)",borderRadius:"var(--radius-sm)",display:"flex",justifyContent:"space-around",textAlign:"center" }}>
                  <div>
                    <div style={{ fontSize:20,fontWeight:800,color:"white" }}>{triedCount}</div>
                    <div style={{ fontSize:10,color:"rgba(255,255,255,0.3)",fontWeight:600,textTransform:"uppercase",letterSpacing:0.5 }}>Tried</div>
                  </div>
                  <div>
                    <div style={{ fontSize:20,fontWeight:800,color:"white" }}>{total - triedCount}</div>
                    <div style={{ fontSize:10,color:"rgba(255,255,255,0.3)",fontWeight:600,textTransform:"uppercase",letterSpacing:0.5 }}>Remaining</div>
                  </div>
                  <div>
                    <div style={{ fontSize:20,fontWeight:800,color:"white" }}>{Math.round((triedCount/total)*100)}%</div>
                    <div style={{ fontSize:10,color:"rgba(255,255,255,0.3)",fontWeight:600,textTransform:"uppercase",letterSpacing:0.5 }}>Complete</div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ===== HABITS ===== */}
        {view === "habits" && (
          <div className="fin">
            {selfStory.shown > 0 && (
              <div style={{ padding:"16px 20px",background:"var(--card)",borderRadius:"var(--radius)",border:"1px solid var(--border)",marginBottom:24 }}>
                <div style={{ fontSize:12,fontWeight:700,color:"var(--blue)",textTransform:"uppercase",letterSpacing:1.5,marginBottom:4 }}>Self-story</div>
                <div style={{ fontSize:15,color:"var(--text)",fontWeight:500 }}>
                  Shown up <span style={{ color:"var(--accent)",fontWeight:700 }}>{selfStory.shown}</span> of {selfStory.total} weekdays.
                  {selfStory.shown >= selfStory.total - 1 ? " 💪" : selfStory.shown >= selfStory.total * 0.7 ? " 🌱" : " 🗳️"}
                </div>
              </div>
            )}

            <Label>Daily streaks</Label>
            {filteredDaily.map(h => {
              const done = !!data.habits?.[`${h.id}:${todayKey}`];
              const streak = getStreak(h.id, data.habits||{});
              const grid = getGrid(h.id, data.habits||{});
              return (
                <div key={h.id} style={{ background:"var(--card)",borderRadius:"var(--radius)",border:"1px solid var(--border)",padding:"16px 18px",marginBottom:8 }}>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
                    <span style={{ fontSize:15,fontWeight:600,color:"var(--text)" }}>{h.emoji} {h.text}</span>
                    {streak > 0 && <span className="streak-b">🔥 {streak}</span>}
                  </div>
                  <div onClick={()=>toggleHabit(h.id)} className="task-row" style={{ display:"flex",alignItems:"center",gap:8,padding:"6px 10px",marginBottom:8,cursor:"pointer",borderRadius:"var(--radius-sm)",background:done?"var(--green-soft)":"var(--accent-soft)",border:done?"1px solid rgba(74,124,89,0.1)":"1px dashed rgba(160,82,45,0.12)" }}>
                    <div style={{ width:20,height:20,borderRadius:"50%",background:done?"var(--green)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:done?"none":"inset 0 0 0 1.5px var(--border)" }}>
                      {done && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span style={{ fontSize:14,fontWeight:600,color:done?"var(--green)":"var(--accent)" }}>{done ? "Done today" : "Tap to complete"}</span>
                  </div>
                  <div style={{ display:"flex",gap:2,justifyContent:"center",flexWrap:"wrap" }}>
                    {grid.map((d,i) => (
                      <div key={i} style={{ textAlign:"center",cursor:d.wknd?"default":"pointer" }} onClick={() => { if (!d.wknd) { const k = `${h.id}:${d.key}`; save({ ...data, habits: { ...data.habits, [k]: !data.habits?.[k] } }); } }}>
                        <div style={{ fontSize:11,color:d.today?"var(--accent)":"var(--text-muted)",fontWeight:d.today?700:400,marginBottom:1 }}>{d.day}</div>
                        <div style={{ width:26,height:26,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",background:d.wknd?"var(--bg)":d.done?"var(--green)":d.today?"var(--accent-soft)":"var(--bg)",border:d.today&&!d.done&&!d.wknd?"2px solid var(--accent)":"none" }}>
                          {d.wknd?<span style={{fontSize:9,color:"var(--text-muted)"}}>·</span>:d.done?<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>:null}
                        </div>
                      </div>
                    ))}
                  </div>
                  {h.floor && <div style={{ marginTop:6,fontSize:13,color:"var(--text-muted)",textAlign:"center" }}>2-min floor: {h.floor}</div>}
                </div>
              );
            })}

            <Label>Weekly</Label>
            <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
              {weeklyHabits.filter(h=>matchFilter(h.owner) && !(h.phase1Only && currentPhase!==1) && !(h.phase2Only && currentPhase!==2)).map(h => {
                const done = !!data.habits?.[`${h.id}:${weekKey}`];
                return (
                  <div key={h.id} className="task-row" onClick={()=>toggleWeeklyHabit(h.id)} style={{ display:"flex",alignItems:"center",gap:8,padding:"14px 18px",background:done?"var(--green-soft)":"var(--card)",borderRadius:"var(--radius-sm)",cursor:"pointer",border:`1px solid ${done?"rgba(74,124,89,0.1)":"var(--border)"}` }}>
                    <div style={{ width:20,height:20,borderRadius:"50%",background:done?"var(--green)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:done?"none":"inset 0 0 0 1.5px var(--border)" }}>
                      {done && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span style={{ flex:1,fontSize:15,fontWeight:500,color:done?"var(--green)":"var(--text)" }}>{h.text}</span>
                    <span style={{ fontSize:12,color:oc[h.owner]?.text,fontWeight:600 }}>{h.owner === "Both" ? "Both" : h.owner.charAt(0)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== VISION ===== */}
        {view === "vision" && (
          <div className="fin">
            <div style={{ background:"var(--dark)",borderRadius:"var(--radius)",padding:"28px 24px",marginBottom:12 }}>
              <div style={{ fontSize:11,fontWeight:600,color:"rgba(255,255,255,0.25)",textTransform:"uppercase",letterSpacing:2.5,marginBottom:12 }}>2026</div>
              <div style={{ fontSize:22,color:"white",lineHeight:1.6,fontWeight:300,fontFamily:"var(--font-display)" }}>{YEAR_GOAL}</div>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:12,padding:"16px 20px",background:"var(--card)",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)",marginBottom:28 }}>
              <div style={{ width:3,height:28,borderRadius:3,background:"var(--accent)",flexShrink:0 }} />
              <div>
                <div style={{ fontSize:11,fontWeight:700,color:"var(--accent)",textTransform:"uppercase",letterSpacing:1.5 }}>90-day target</div>
                <div style={{ fontSize:15,color:"var(--text-sec)",fontWeight:400,marginTop:2,lineHeight:1.5 }}>{VISION_90}</div>
              </div>
            </div>

            <Label>Weekly pulse</Label>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:28 }}>
              {[{...NORTH_STAR, k:"northStar", c:"var(--blue)", s:setNorthStarValue}, {...EXPERIMENTS, k:"experiments", c:"var(--purple)", s:setExperimentsValue}].map(kpi => (
                <div key={kpi.k} style={{ background:"var(--card)",borderRadius:"var(--radius)",padding:"16px 18px",border:"1px solid var(--border)" }}>
                  <div style={{ fontSize:22,marginBottom:4 }}>{kpi.icon}</div>
                  <div style={{ fontSize:11,fontWeight:700,color:kpi.c,textTransform:"uppercase",letterSpacing:1 }}>{kpi.label}</div>
                  <input type="number" value={(kpi.k==="northStar"?data.northStar:data.experiments)?.[weekKey]||""} onChange={e=>kpi.s(e.target.value)} placeholder="0"
                    style={{ width:48,border:"1px solid var(--border)",borderRadius:8,padding:4,fontSize:24,fontWeight:700,textAlign:"center",color:kpi.c,fontFamily:"var(--font)",background:"var(--bg)",marginTop:6 }} />
                </div>
              ))}
            </div>

            <Label>Workstreams</Label>
            <div style={{ display:"flex",flexDirection:"column",gap:3,marginBottom:28 }}>
              {(() => {
                const cats = {};
                allTasks.filter(t => matchFilter(t.owner)).forEach(t => {
                  if (!cats[t.cat]) cats[t.cat] = { total:0, done:0 };
                  cats[t.cat].total++; if (data.tasks?.[t.id]) cats[t.cat].done++;
                });
                return Object.entries(cats).filter(([,v]) => v.total >= 2).sort((a,b) => { const pA=a[1].done/a[1].total,pB=b[1].done/b[1].total; if(pA===1&&pB!==1)return 1; if(pB===1&&pA!==1)return-1; return pB-pA; })
                  .map(([cat, v]) => {
                    const p = Math.round((v.done/v.total)*100); const cc = catColors[cat]||"var(--accent)";
                    return <div key={cat} style={{ display:"flex",alignItems:"center",gap:8,padding:"7px 12px",background:"var(--card)",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)",opacity:p===100?0.4:1 }}>
                      <div style={{ width:2,height:16,borderRadius:2,background:cc,flexShrink:0 }} />
                      <span style={{ fontSize:14,fontWeight:600,color:"var(--text)",flex:1 }}>{cat}</span>
                      <div style={{ width:50,height:3,background:"var(--bg)",borderRadius:3,overflow:"hidden" }}>
                        <div style={{ height:"100%",borderRadius:3,background:p===100?"var(--green)":cc,width:`${p}%` }} />
                      </div>
                      <span style={{ fontSize:12,color:"var(--text-muted)",fontWeight:600,minWidth:28,textAlign:"right" }}>{v.done}/{v.total}</span>
                    </div>;
                  });
              })()}
            </div>

            <Label>Roadmap</Label>
            <div style={{ position:"relative",paddingLeft:16,marginBottom:28 }}>
              <div style={{ position:"absolute",left:4,top:3,bottom:3,width:1,background:"var(--border)" }} />
              {ROADMAP.map((r,i) => {
                const isNow = r.status === "now";
                return <div key={i} style={{ position:"relative",marginBottom:i<ROADMAP.length-1?14:0 }}>
                  <div style={{ position:"absolute",left:-14,top:3,width:8,height:8,borderRadius:"50%",background:isNow?"var(--accent)":"var(--border)" }} />
                  <div style={{ display:"flex",alignItems:"baseline",gap:6,marginBottom:2 }}>
                    <span style={{ fontSize:14,fontWeight:700,color:isNow?"var(--accent)":"var(--text)" }}>{r.month}</span>
                    <span style={{ fontSize:13,fontWeight:500,color:"var(--text-sec)" }}>{r.label}</span>
                    {isNow && <span style={{ fontSize:10,fontWeight:700,padding:"1px 5px",borderRadius:4,background:"var(--accent-soft)",color:"var(--accent)" }}>NOW</span>}
                  </div>
                  <div style={{ fontSize:13,color:"var(--text-muted)",lineHeight:1.5 }}>{r.focus}</div>
                </div>;
              })}
            </div>

            <Label>Monthly scorecard</Label>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:6,marginBottom:28 }}>
              {metrics.map((m,i) => (
                <div key={i} style={{ background:"var(--card)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",padding:"12px 10px",textAlign:"center" }}>
                  <div style={{ fontSize:18 }}>{m.icon}</div>
                  <div style={{ fontSize:11,fontWeight:700,color:"var(--text-muted)",letterSpacing:0.5,marginTop:2 }}>{m.label}</div>
                  <div style={{ fontSize:18,fontWeight:700,color:"var(--text)" }}>{m.target}</div>
                  <input type="text" value={data.scores?.[i]||""} onChange={e=>updateScore(i,e.target.value)} placeholder="—"
                    style={{ width:48,border:"1px solid var(--border)",borderRadius:6,padding:3,fontSize:15,fontWeight:700,textAlign:"center",color:"var(--accent)",fontFamily:"var(--font)",background:"var(--bg)",marginTop:4 }} />
                </div>
              ))}
            </div>

            <Label>Partner pulse</Label>
            <div style={{ display:"flex",flexDirection:"column",gap:6,marginBottom:28 }}>
              {["Annie","Dion"].map(who => (
                <div key={who} style={{ display:"flex",alignItems:"center",gap:10,padding:"14px 18px",background:"var(--card)",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)" }}>
                  <span style={{ fontSize:13,fontWeight:600,color:oc[who]?.text,minWidth:36 }}>{who}</span>
                  <div style={{ display:"flex",gap:4 }}>
                    {[1,2,3,4,5].map(v => (
                      <button key={v} className={`scale-btn ${data.pulse?.[`${who}:${weekKey}`]==v?"active":""}`} onClick={()=>setPulse(who,v)}
                        style={data.pulse?.[`${who}:${weekKey}`]==v?{background:"var(--accent)",color:"white",borderColor:"var(--accent)"}:{}}>{v}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== PULSE ===== */}
        {view === "pulse" && (
          <div className="fin">
            <Label>Pipeline — conversations started</Label>
            <div style={{ fontSize:13,color:"var(--text-muted)",marginBottom:14 }}>Every back-and-forth with a prospect or client. Your North Star metric.</div>

            {!showConvoForm ? (
              <button onClick={()=>setShowConvoForm(true)} style={{ width:"100%",padding:"14px",marginBottom:12,background:"var(--card)",border:"1px dashed var(--accent)",borderRadius:"var(--radius-sm)",cursor:"pointer",fontSize:14,fontWeight:600,color:"var(--accent)",fontFamily:"var(--font)" }}
                onMouseEnter={e=>{e.target.style.background="var(--accent-soft)";}} onMouseLeave={e=>{e.target.style.background="var(--card)";}}>
                + Log a prospect conversation
              </button>
            ) : (
              <div style={{ background:"var(--card)",border:"1px solid var(--accent)",borderRadius:"var(--radius)",padding:"18px 20px",marginBottom:12 }}>
                <div style={{ fontSize:12,fontWeight:700,color:"var(--accent)",textTransform:"uppercase",letterSpacing:1.5,marginBottom:14 }}>New prospect conversation</div>

                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:12,fontWeight:600,color:"var(--text)",marginBottom:4 }}>Who did you talk to?</div>
                  <input type="text" value={newConvo.name} onChange={e=>setNewConvo(p=>({...p,name:e.target.value}))} placeholder="Name — company, role (e.g. Julia — PM at Remax)" autoFocus
                    style={{ width:"100%",border:"1px solid var(--border)",borderRadius:8,padding:"8px 12px",fontSize:14,color:"var(--text)",fontFamily:"var(--font)",background:"var(--bg)" }} />
                </div>

                <div style={{ display:"flex",gap:8,marginBottom:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12,fontWeight:600,color:"var(--text)",marginBottom:4 }}>Logged by</div>
                    <div style={{ display:"flex",gap:3 }}>
                      {["Annie","Dion"].map(o => (
                        <button key={o} onClick={()=>setNewConvo(p=>({...p,who:o}))} style={{
                          flex:1,padding:"6px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",
                          background:newConvo.who===o?oc[o].bg:"transparent",color:newConvo.who===o?oc[o].text:"var(--text-muted)",
                          border:newConvo.who===o?`1px solid ${oc[o].text}`:"1px solid var(--border)",fontFamily:"var(--font)",
                        }}>{o}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12,fontWeight:600,color:"var(--text)",marginBottom:4 }}>Type</div>
                    <div style={{ display:"flex",gap:3 }}>
                      {[{l:"Cold",v:"cold"},{l:"Warm",v:"warm"},{l:"Referral",v:"referral"}].map(t => (
                        <button key={t.v} onClick={()=>setNewConvo(p=>({...p,type:t.v}))} style={{
                          flex:1,padding:"6px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",
                          background:newConvo.type===t.v?"var(--accent-soft)":"transparent",color:newConvo.type===t.v?"var(--accent)":"var(--text-muted)",
                          border:newConvo.type===t.v?"1px solid var(--accent)":"1px solid var(--border)",fontFamily:"var(--font)",
                        }}>{t.l}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:12,fontWeight:600,color:"var(--text)",marginBottom:4 }}>How warm is this lead? (1 = ice cold, 5 = ready to buy)</div>
                  <div style={{ display:"flex",gap:4 }}>
                    {[1,2,3,4,5].map(v => (
                      <button key={v} onClick={()=>setNewConvo(p=>({...p,warmth:v}))} style={{
                        width:36,height:36,borderRadius:"50%",border:newConvo.warmth===v?"1px solid var(--accent)":"1px solid var(--border)",
                        background:newConvo.warmth===v?"var(--accent)":"var(--card)",color:newConvo.warmth===v?"white":"var(--text-sec)",
                        cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:"var(--font)",
                      }}>{v}</button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:12,fontWeight:600,color:"var(--text)",marginBottom:4 }}>What's the next step?</div>
                  <input type="text" value={newConvo.next} onChange={e=>setNewConvo(p=>({...p,next:e.target.value}))} placeholder="e.g. Send proposal, Schedule demo, Follow up Friday..."
                    style={{ width:"100%",border:"1px solid var(--border)",borderRadius:8,padding:"8px 12px",fontSize:13,color:"var(--text)",fontFamily:"var(--font)",background:"var(--bg)" }} />
                </div>

                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:12,fontWeight:600,color:"var(--text)",marginBottom:4 }}>Notes — what did you learn?</div>
                  <textarea value={newConvo.notes} onChange={e=>setNewConvo(p=>({...p,notes:e.target.value}))} placeholder="Their pain points, objections, what resonated, what fell flat..."
                    style={{ width:"100%",border:"1px solid var(--border)",borderRadius:8,padding:"8px 12px",fontSize:13,color:"var(--text)",fontFamily:"var(--font)",background:"var(--bg)",minHeight:60,lineHeight:1.5 }} />
                </div>

                <div style={{ display:"flex",gap:8,justifyContent:"flex-end" }}>
                  <button onClick={()=>{setShowConvoForm(false);setNewConvo({name:"",who:"Annie",type:"",warmth:"",next:"",notes:""});}} style={{ padding:"8px 16px",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer",background:"transparent",color:"var(--text-muted)",border:"1px solid var(--border)",fontFamily:"var(--font)" }}>Cancel</button>
                  <button onClick={addConvo} disabled={!newConvo.name.trim()} style={{ padding:"8px 20px",borderRadius:8,fontSize:13,fontWeight:700,cursor:newConvo.name.trim()?"pointer":"default",background:newConvo.name.trim()?"var(--accent)":"var(--border)",color:"white",border:"none",fontFamily:"var(--font)" }}>Log it</button>
                </div>
              </div>
            )}

            {/* Conversation history */}
            {(data.conversations||[]).length > 0 && (
              <div style={{ marginBottom:28 }}>
                <div style={{ fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:8 }}>{(data.conversations||[]).length} conversation{(data.conversations||[]).length===1?"":"s"} logged</div>
                <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
                  {[...(data.conversations||[])].reverse().map(c => (
                    <div key={c.ts} style={{ background:"var(--card)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",padding:"12px 16px" }}>
                      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4 }}>
                        <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                          <span style={{ fontSize:14,fontWeight:600,color:"var(--text)" }}>{c.name}</span>
                          {c.type && <span style={{ fontSize:10,fontWeight:700,padding:"2px 6px",borderRadius:4,background:c.type==="cold"?"var(--blue-soft)":c.type==="warm"?"var(--accent-soft)":"var(--green-soft)",color:c.type==="cold"?"var(--blue)":c.type==="warm"?"var(--accent)":"var(--green)" }}>{c.type}</span>}
                          {c.warmth && <span style={{ fontSize:10,fontWeight:700,padding:"2px 6px",borderRadius:4,background:"var(--yellow-soft)",color:"var(--yellow)" }}>🔥 {c.warmth}/5</span>}
                        </div>
                        <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                          <span style={{ fontSize:11,color:oc[c.who]?.text,fontWeight:600 }}>{c.who}</span>
                          <span style={{ fontSize:11,color:"var(--text-muted)" }}>{fmt(c.date)}</span>
                          <button onClick={()=>{if(confirm("Delete this conversation?"))deleteConvo(c.ts);}} style={{ background:"none",border:"none",cursor:"pointer",fontSize:11,color:"var(--text-muted)",padding:"2px 4px",fontFamily:"var(--font)" }}>✕</button>
                        </div>
                      </div>
                      {c.next && <div style={{ fontSize:13,color:"var(--text-sec)",marginBottom:2 }}><span style={{ fontWeight:600,color:"var(--accent)" }}>Next:</span> {c.next}</div>}
                      {c.notes && <div style={{ fontSize:12,color:"var(--text-muted)",lineHeight:1.5,marginTop:4 }}>{c.notes}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Label>Partner pulse</Label>
            <div style={{ fontSize:14,color:"var(--text-muted)",marginBottom:14 }}>How are we doing as partners this week? (1 = rough, 5 = great)</div>
            <div style={{ display:"flex",flexDirection:"column",gap:6,marginBottom:28 }}>
              {["Annie","Dion"].map(who => (
                <div key={who} style={{ display:"flex",alignItems:"center",gap:10,padding:"14px 18px",background:"var(--card)",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)" }}>
                  <span style={{ fontSize:13,fontWeight:600,color:oc[who]?.text,minWidth:36 }}>{who}</span>
                  <div style={{ display:"flex",gap:4,flex:1 }}>
                    {[1,2,3,4,5].map(v => (
                      <button key={v} className={`scale-btn ${data.pulse?.[`${who}:${weekKey}`]==v?"active":""}`} onClick={()=>setPulse(who,v)}
                        style={data.pulse?.[`${who}:${weekKey}`]==v?{background:"var(--accent)",color:"white",borderColor:"var(--accent)"}:{}}>{v}</button>
                    ))}
                  </div>
                  <span style={{ fontSize:22 }}>{
                    data.pulse?.[`${who}:${weekKey}`]>=4?"😊":
                    data.pulse?.[`${who}:${weekKey}`]>=3?"😐":
                    data.pulse?.[`${who}:${weekKey}`]>=1?"💬":"·"
                  }</span>
                </div>
              ))}
            </div>

            <Label>Friday reflection</Label>
            <div style={{ fontSize:14,color:"var(--text-muted)",marginBottom:14 }}>Weekly check-in from Atomic Habits + DOAC.</div>
            <div style={{ display:"flex",flexDirection:"column",gap:4,marginBottom:28 }}>
              {reflectionQs.map((rq,i) => (
                <div key={i} style={{ background:"var(--card)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",padding:"14px 18px" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:6 }}>
                    <div style={{ fontSize:14,fontWeight:600,color:"var(--text)" }}>{rq.q}</div>
                    {rq.src && <span style={{ fontSize:10,fontWeight:700,padding:"1px 5px",borderRadius:4,flexShrink:0,background:rq.src.startsWith("DOAC")?"rgba(160,82,45,0.06)":"rgba(74,124,89,0.06)",color:rq.src.startsWith("DOAC")?"var(--accent)":"var(--green)" }}>{rq.src}</span>}
                  </div>
                  {rq.type === "scale" ? (
                    <div style={{ display:"flex",gap:3 }}>
                      {[1,2,3,4,5,6,7,8,9,10].map(v => (
                        <button key={v} className={`scale-btn ${data.reflections?.[`${weekKey}:${i}`]==v?"active":""}`} onClick={()=>setReflection(i,v)}
                          style={{...(data.reflections?.[`${weekKey}:${i}`]==v?{background:"var(--accent)",color:"white",borderColor:"var(--accent)"}:{}),width:32,height:32,fontSize:13}}>{v}</button>
                      ))}
                    </div>
                  ) : (
                    <textarea value={data.reflections?.[`${weekKey}:${i}`]||""} onChange={e=>setReflection(i,e.target.value)} placeholder="..."
                      style={{ width:"100%",border:"1px solid var(--border)",borderRadius:6,padding:"6px 8px",fontSize:14,color:"var(--text)",fontFamily:"var(--font)",background:"var(--bg)",minHeight:50,lineHeight:1.5 }} />
                  )}
                </div>
              ))}
            </div>

            <Label>Recent wins</Label>
            {(() => {
              const wins = [];
              for (let i = 0; i < 7; i++) { const d = nowEST(); d.setDate(d.getDate()-i); const key = dk(d); const win = data.wins?.[key]; if (win) wins.push({ date: key, text: win }); }
              return !wins.length ? <div style={{ fontSize:14,color:"var(--text-muted)",padding:12 }}>No wins logged yet.</div> :
                wins.map(w => <div key={w.date} style={{ display:"flex",gap:8,alignItems:"baseline",padding:"6px 0",borderBottom:"1px solid var(--border)" }}>
                  <span style={{ fontSize:12,color:"var(--text-muted)" }}>{fmt(w.date)}</span>
                  <span style={{ fontSize:14,color:"var(--text)" }}>{w.text}</span>
                </div>);
            })()}
          </div>
        )}

        <div style={{ textAlign:"center",padding:"32px 0 16px",fontSize:13,color:"var(--text-muted)",letterSpacing:0.5 }}>
          {lastSync?lastSync.toLocaleTimeString():""}  ·  quietly.systems
        </div>
      </div>

      {moveTask && <div onClick={()=>setMoveTask(null)} style={{ position:"fixed",inset:0,zIndex:40 }} />}
    </div>
  );
}
