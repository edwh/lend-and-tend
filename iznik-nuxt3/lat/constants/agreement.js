/**
 * Shared data for the garden-sharing agreement, derived from the Lend & Tend
 * "Garden-Sharing Agreement" template (Jan 2025).
 *
 * Single source of truth for:
 *   - CONDITIONS_OF_USE  — the conduct rules shown on /ground-rules
 *   - KEY_CLAUSES        — plain-language summary of the main legal clauses
 *   - GROUND_RULE_ITEMS  — the structured toggles captured in the agreement
 *                          ("3 + other" model: start small, gather data, evolve)
 *   - TIMELINE           — the four-month "what to expect" narrative
 *
 * Nothing here invents new backend concepts: the agreement itself is stored in
 * the Freegle message's textbody (see AgreementForm.vue) and check-ins in the
 * user's settings (see pages/checkin/[id].vue).
 */

/* Conditions of Use — plain-language version of the template's
 * "Conditions of Use" section. */
export const CONDITIONS_OF_USE = [
  {
    key: 'animals',
    icon: '🐾',
    title: 'Animals',
    text: "No animals may be kept or let loose in the gardening space without the lender's consent — for example, a well-controlled pet dog.",
  },
  {
    key: 'trees',
    icon: '🌳',
    title: 'Trees',
    text: "Don't plant fruit or other trees/plants that take more than 12 months to cultivate, and don't cut or prune existing trees, without the lender's written consent.",
  },
  {
    key: 'nuisance',
    icon: '🤝',
    title: 'No nuisance or annoyance',
    text: "Use the space safely and considerately, causing no nuisance to the lender or neighbours, and don't obstruct or damage other parts of the property.",
  },
  {
    key: 'noise',
    icon: '🔊',
    title: 'No excessive noise',
    text: 'Excessive noise is not permitted. Agree in advance whether audible music is OK.',
  },
  {
    key: 'dumping',
    icon: '🚯',
    title: 'No dumping',
    text: 'No petrol, oil, rubbish, lubricants or other inflammable liquids or refuse may be left in the gardening space.',
  },
  {
    key: 'rules',
    icon: '📋',
    title: 'Reasonable rules & requests',
    text: 'The tender follows reasonable rules and requests from the lender for the orderly management of the space.',
  },
  {
    key: 'statutory',
    icon: '⚖️',
    title: 'Statutory requirements',
    text: "Don't do anything that breaches the law or that could invalidate the lender's insurance.",
  },
  {
    key: 'unauthorised',
    icon: '👥',
    title: 'Unauthorised persons',
    text: 'Only the tender — or people approved in writing by the lender and/or accompanied by the tender — may enter the space.',
  },
  {
    key: 'notices',
    icon: '📌',
    title: 'Noticeboards & advertisements',
    text: "No notices or advertisements may be posted on the property without the lender's express permission.",
  },
  {
    key: 'other',
    icon: '🪴',
    title: 'Other restrictions',
    text: "Hoses/sprinklers only to fill water containers unless agreed; bonfires only for diseased plant material and never left unattended; no corrugated iron or barbed wire; and don't remove soil, minerals or gravel without written permission.",
  },
]

/* Key clauses worth surfacing in plain language, drawn from "Your Agreement",
 * "Grower's Obligations", "Landowner's Rights" and "Termination". */
export const KEY_CLAUSES = [
  {
    title: 'Sharing, not exclusive use',
    text: "The garden is shared. The tender doesn't get exclusive use, and if the lender and tender disagree about how the space is used, the lender's wishes take precedence.",
  },
  {
    title: 'Produce is for the tender',
    text: 'Anything grown is for the tender and their household — not for any trade or business. You can agree to share some produce with the lender; note that in your agreement.',
  },
  {
    title: 'Keep it cultivated and tidy',
    text: 'The tender keeps the space cultivated, in good condition, clean, tidy and free from weeds, and leaves it that way at the end.',
  },
  {
    title: 'No hazardous substances',
    text: "No pesticides, fungicides, poisons or other hazardous substances without the lender's written approval (an email is fine).",
  },
  {
    title: 'No structures without consent',
    text: "No sheds or other structures may be put up without the lender's written consent.",
  },
  {
    title: 'Liability & insurance',
    text: 'Neither party is liable for accidental injury or damage except through negligence. Check your own insurance — Lend & Tend accepts no liability.',
  },
  {
    title: 'Ending the arrangement',
    text: 'Either party can end the arrangement with notice. It can also end on an agreed date, or if the space is left untended for more than a month between March and October.',
  },
]

/* Structured ground-rule toggles captured in the agreement. Deliberately a
 * short list ("3 + other") so people don't switch off — gather data first and
 * evolve later. Each links to a Condition of Use so check-ins can be targeted
 * in future (e.g. "is the pets arrangement still working?"). */
export const GROUND_RULE_ITEMS = [
  {
    key: 'pets',
    label: 'Pets allowed in the garden',
    help: 'e.g. a well-controlled dog',
    condition: 'animals',
  },
  {
    key: 'water',
    label: 'Tender may use the water supply',
    help: 'tap or water butt',
    condition: 'other',
  },
  {
    key: 'shareProduce',
    label: 'Some produce shared with the lender',
    help: 'agree what and when',
    condition: null,
  },
]

/* Four-month "what to expect" narrative (from the template's Timeline page).
 * dayOffset drives a future cadence; the wording mirrors the template. */
export const TIMELINE = [
  {
    month: 'First month',
    dayOffset: 0,
    heading: 'Begin garden-sharing',
    text: "Once you've both confirmed the agreement, meet at the garden, sort out the practicalities and make a start. Take some “before” photos.",
  },
  {
    month: 'Second month',
    dayOffset: 30,
    heading: 'Clearing & establishing',
    text: 'It may take a few weeks to clear or establish the space. Keep talking — a quick message goes a long way.',
  },
  {
    month: 'Third month',
    dayOffset: 60,
    heading: 'Starting to grow',
    text: 'You may now be ready to start raising crops; a more seasoned gardener may already be seeing the fruits of their labour.',
  },
  {
    month: 'Fourth month',
    dayOffset: 90,
    heading: 'Review & reflect',
    text: 'In full swing, or time to reassess the terms? The most important thing is keeping the line of communication open between lender and tender.',
  },
]

/* The four "how it works once you're matched" cards from the template. */
export const ARRANGEMENT_STEPS = [
  {
    icon: '👋',
    title: 'Introductions',
    text: "Once you've agreed to meet at the gardening space, talk through your plans and a reasonable timeline for the shared project.",
  },
  {
    icon: '🧰',
    title: 'Garden materials',
    text: 'Not every garden comes with a fully kitted-out shed. Always ask before using the lender’s tools, and be ready to bring your own.',
  },
  {
    icon: '📝',
    title: 'Your agreement',
    text: 'When both lender and tender are happy, confirm the garden-sharing agreement so you each have a record of what you agreed.',
  },
  {
    icon: '📸',
    title: 'Track your progress',
    text: 'At the exciting getting-started stage, take some before pictures and plot a reasonable timeline for your project.',
  },
]
