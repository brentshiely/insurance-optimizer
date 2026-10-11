// Flags for the "other" domain group: the Other bucket (Story S11). Seven flags, one per planned row in
// docs/QUESTION-FLAG-PLAN.md section 4 (file `other`, priorities 510 to 570):
//
//   other-rental-car-waiver           drop      rental car coverage sold at the counter
//   other-towing-roadside-duplicate   drop      two or more sources of roadside help
//   other-vehicle-towing-check        question  a towing plan on a motorcycle or boat policy
//   other-travel-insurance-overlap    drop      travel insurance against what you already have
//   other-phone-insurance-card        question  a monthly phone protection fee
//   other-extended-warranty-overlap   drop      extended warranties on electronics or appliances
//   other-add-on-term-life            question  accidental death coverage next to regular life insurance
//
// Rules this file follows (see docs/DECISIONS.md S11-*):
//  * Pure and deterministic: no DOM, no Node APIs, no Date, no Intl.
//  * Facts come only from the verified research in research/other-bucket.mjs (plus the Triple-I home and
//    renters facts for the phone flag); gaps recorded there are worded as questions to ask.
//  * Credit cards. The card table is empty until Stories S4b and S11b (DECISIONS D14), so with the real
//    catalog every card sentence is generic: no card is named, emphasis stays normal, and the text says to
//    check the card's current benefits guide. The card logic below still works against any table: a held card
//    with a confirmed benefit (`ctx.cardsWith`) is named and, when the user also says they usually pay with
//    their cards, raises the emphasis to strong. A held card whose benefit is `unverified` is never asserted:
//    it becomes "check whether <card> includes this in its current benefits guide". A card with status
//    `none` is not mentioned. Card claims are only ever the table's own `summary` and `conditions`.
//    The payment answers are coarse: `card_usual_payment` says the user usually pays with one of the cards they
//    ticked, and `phone_bill_on_card` says a credit card pays the phone bill. Neither says which card, so the text
//    never puts a named card in the user's mouth: "one of these cards" only when every ticked card is named,
//    otherwise "this only helps if that is <named card>", and the phone ask and reason are conditional on the bill
//    being on the named card (DECISIONS S11-8).
//  * Not sure never raises emphasis and never fires a Raise-like claim; a missing answer never fires a flag.
//  * No state is named; the card-freshness caution is attached whenever a card is mentioned.

// Replace with CARD_DISCLAIMER from data/cards.mjs when Story S4b adds it (Story S11b). Exported for the tests.
export const CARD_CAUTION = "Card benefits change often and differ from card to card, so treat this as a prompt to check, not a promise of coverage. Your own card's current benefits guide has the final word.";

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// "2026-10-01" -> "October 1, 2026"; anything that is not an ISO date is returned as written.
function plainDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso));
  const month = m ? MONTHS[Number(m[2]) - 1] : undefined;
  return month ? `${month} ${Number(m[3])}, ${m[1]}` : String(iso);
}

// ["A"] -> "A"; ["A","B"] -> "A and B"; ["A","B","C"] -> "A, B and C". `word` replaces "and" ("or" for a choice).
function joinList(items, word = 'and') {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} ${word} ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} ${word} ${items[items.length - 1]}`;
}

// Makes a table phrase read as a sentence.
function sentence(text) {
  const t = String(text).trim();
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

const join = (parts) => parts.filter((p) => typeof p === 'string' && p.length > 0).join(' ');

// Who is speaking. A reader should not have to know these names, so the first time a flag's background uses one
// it uses the full name with a one-clause gloss in brackets (DECISIONS S11-7). Each flag's text stands alone, so
// every background that names an organisation uses these once, at the first mention, and the short form after.
// Write "The ${NAIC} says ..." or "the ${FTC} warns ...". The copy test fails on an acronym with no definition.
const NAIC = 'National Association of Insurance Commissioners (NAIC, a group of state insurance regulators)';
const TRIPLE_I = 'Insurance Information Institute (Triple-I, an insurance industry research group)';
const FTC = 'Federal Trade Commission (FTC, a federal consumer protection agency)';

// ---------------------------------------------------------------------------------------------------
// Card helpers. Everything here reads the card table through ctx.cards() / ctx.cardsWith().
// ---------------------------------------------------------------------------------------------------

const CARD_BENEFITS = {
  rentalCar: { what: 'rental car coverage', thing: 'rental' },
  tripProtection: { what: 'trip protection', thing: 'trip' },
  cellPhone: { what: 'cell phone protection', thing: null },
  extendedWarranty: { what: 'an extended warranty benefit', thing: 'purchase' },
  roadside: { what: 'roadside help', thing: null },
};

function statusOf(card, key) {
  const b = card.benefits && card.benefits[key];
  return b && typeof b.status === 'string' ? b.status : 'unverified';
}

// What the table says about one benefit on the cards the user holds:
//   confirmed    status primary, secondary or yes (the only ones that may be stated as fact)
//   unconfirmed  status unverified (or missing): never stated, only "check whether ..."
// A card whose status is `none` is in neither list.
function cardView(ctx, key) {
  const held = ctx.cards();
  const confirmed = ctx.cardsWith(key);
  const confirmedIds = confirmed.map((c) => c.id);
  const unconfirmed = held.filter((c) => !confirmedIds.includes(c.id) && statusOf(c, key) !== 'none');
  return { held, confirmed, unconfirmed };
}

// The listed cards the user ticked, whether or not the table knows them (`ctx.cards()` drops the unknown ones).
function pickedCards(ctx) {
  const picked = ctx.answer('cards');
  return Array.isArray(picked) ? picked.filter((id) => id !== 'other_none') : [];
}

// True when the user said they carry one of the listed cards, whether or not the table knows it.
const carriesListedCard = (ctx) => pickedCards(ctx).length > 0;

// True when every card the user ticked has a confirmed benefit of this kind. Only then can a coarse answer about
// "one of your cards" (card_usual_payment) be said to mean one of the cards we just named. A ticked card with
// status none or unverified, or one the table does not know, makes it false (DECISIONS S11-8).
function everyHeldCardConfirmed(ctx, key) {
  const confirmed = cardView(ctx, key).confirmed.length;
  return confirmed > 0 && confirmed === pickedCards(ctx).length;
}

function rentalGloss(status) {
  if (status === 'primary') return 'That coverage is listed as primary, which means it pays before your own insurance.';
  if (status === 'secondary') return 'That coverage is listed as secondary, which means it pays only after your own insurance.';
  return '';
}

// The card paragraph of a flag's background: what the table confirms (named, with its own words and the date
// we last checked), what it cannot confirm (a question), or, when the table says nothing about any held
// card, the generic sentence. Always ends with the freshness caution.
function cardParagraph(ctx, key, opts = {}) {
  const spec = CARD_BENEFITS[key];
  const { confirmed, unconfirmed } = cardView(ctx, key);
  const parts = [];
  for (const card of confirmed) {
    const b = card.benefits[key];
    parts.push(join([
      `Our notes on ${card.name} (last checked ${plainDate(card.lastVerified)}) show that its benefits guide lists ${spec.what}.`,
      sentence(b.summary),
      opts.gloss ? opts.gloss(b.status) : '',
      b.conditions ? `Conditions: ${sentence(b.conditions)}` : '',
    ]));
  }
  if (confirmed.length > 0 && spec.thing) parts.push(paymentLine(ctx, key, spec.thing));
  if (unconfirmed.length > 0) {
    const names = joinList(unconfirmed.map((c) => c.name));
    parts.push(unconfirmed.length === 1
      ? `Check whether ${names} includes ${spec.what} in its current benefits guide.`
      : `Check whether ${names} include ${spec.what} in their current benefits guides.`);
  }
  if (confirmed.length === 0 && unconfirmed.length === 0) {
    parts.push(carriesListedCard(ctx)
      ? `Check the current benefits guide for the card you carry to see whether it includes ${spec.what} before paying separately.`
      : `If you carry a credit card, check its current benefits guide for ${spec.what} before paying separately.`);
  }
  parts.push(CARD_CAUTION);
  return join(parts);
}

// What the user said about paying with their cards, in words that claim no more than the answer does.
// `card_usual_payment` asks whether they usually pay with one of the cards they ticked, not which one, and this
// paragraph names only the cards whose benefit is confirmed. "One of these cards" is therefore said only when every
// ticked card is named; otherwise the sentence says the benefit helps only if the card they use is a named one.
function paymentLine(ctx, key, thing) {
  if (ctx.is('card_usual_payment', 'yes')) {
    if (everyHeldCardConfirmed(ctx, key)) return 'You told us you usually pay with one of these cards.';
    const names = joinList(cardView(ctx, key).confirmed.map((c) => c.name), 'or');
    return `You told us you usually pay with one of the cards you carry; this only helps if that is ${names}.`;
  }
  if (ctx.is('card_usual_payment', 'no')) {
    return `You told us you usually do not pay with these cards, and a card's coverage may apply only to what you charge to it, so you would need to put the ${thing} on the card.`;
  }
  return "Check whether the card's coverage applies only to what you charge to it.";
}

// Names of the cards whose benefit is confirmed, for the ask text ("" when none).
const confirmedNames = (ctx, key) => joinList(cardView(ctx, key).confirmed.map((c) => c.name));

// "Card A" for one confirmed card, "one of Card A and Card B" for several ("" when none).
function confirmedChoice(ctx, key) {
  const cards = cardView(ctx, key).confirmed;
  const names = joinList(cards.map((c) => c.name));
  return cards.length > 1 ? `one of ${names}` : names;
}

// Strong emphasis for the card-linked drops: the table confirms the benefit on a held card AND the user says
// they usually pay with their cards. A Not sure (or missing) payment answer never raises emphasis.
const strongCard = (ctx, key) => cardView(ctx, key).confirmed.length > 0 && ctx.is('card_usual_payment', 'yes');

// ---------------------------------------------------------------------------------------------------
// 1. Rental car (drop)
// ---------------------------------------------------------------------------------------------------

function rentalState(ctx) {
  const hasAuto = ctx.holds('auto');
  const noCollision = hasAuto && ctx.is('auto_collision', 'no');
  const confirmed = cardView(ctx, 'rentalCar').confirmed;
  const pays = ctx.is('card_usual_payment', 'yes');
  return {
    hasAuto,
    noCollision,
    // The user's own policy may not extend to a rental: no car policy at all, or no collision and comprehensive.
    ownMayNotExtend: !hasAuto || noCollision,
    // Strong needs a confirmed card benefit, the user paying with their cards, and an own policy to rely on.
    strong: confirmed.length > 0 && pays && hasAuto && !noCollision,
  };
}

const RENTAL_INTRO = 'The extra coverage a rental company sells at the counter, called a collision or loss damage waiver, is not technically insurance. It relieves you of responsibility if the rental car is damaged or stolen.';
const RENTAL_OWN_POLICY = "You may already have that protection. If you still carry collision and comprehensive on your own car (collision pays for crash damage, comprehensive for things like theft and hail), the coverage and deductible on your car generally apply to a rental you use for personal trips.";
const RENTAL_NO_COLLISION = 'You told us you do not carry collision and comprehensive on your car. Without them, your own policy may not pay if a rental car is damaged or stolen, so the waiver, or a card that covers rentals, may be the only thing standing between you and the repair bill.';
const RENTAL_NO_AUTO = 'You did not tell us about a car insurance policy, so there may be no policy of your own for a rental to fall back on. That makes it more important to check what else would pay before you decline anything.';
const RENTAL_CARDS = 'Many credit cards cover rental car damage when you pay for the rental with the card, but you generally have to decline the rental company\'s waiver to use it. That coverage is usually secondary, meaning it pays only after your own car insurance or the rental company\'s coverage, and it may cover only your deductible.';
const RENTAL_RISK = "If nothing else covers the rental and you decline the waiver, you can owe for the damage, sometimes up to the car's full value.";

const rentalCarWaiver = {
  id: 'other-rental-car-waiver',
  domain: 'other',
  bucket: 'drop',
  kind: 'cross-policy',
  priority: 510,
  title: "Check whether you can skip the rental company's extra coverage",
  applies(ctx) {
    if (!ctx.holds('rental_car')) return false;
    return { emphasis: rentalState(ctx).strong ? 'strong' : 'normal' };
  },
  background(ctx) {
    const s = rentalState(ctx);
    return join([
      RENTAL_INTRO,
      s.hasAuto ? (s.noCollision ? RENTAL_NO_COLLISION : RENTAL_OWN_POLICY) : RENTAL_NO_AUTO,
      RENTAL_CARDS,
      RENTAL_RISK,
      cardParagraph(ctx, 'rentalCar', { gloss: rentalGloss }),
    ]);
  },
  ask(ctx) {
    const s = rentalState(ctx);
    if (s.strong) {
      return `Read the current benefits guide for ${confirmedNames(ctx, 'rentalCar')} and ask the issuer for the rental terms in writing, including whether it pays first or second. Confirm your car insurance still includes collision and comprehensive. If both check out, put your next rental on ${confirmedChoice(ctx, 'rentalCar')} and decline the waiver at the counter.`;
    }
    if (s.ownMayNotExtend) {
      return join([
        s.hasAuto
          ? 'Ask your car insurer whether anything on your policy extends to a rental car, and what you would owe if one were damaged or stolen.'
          : 'Before you decline anything at the counter, find out what would pay if the rental were damaged or stolen.',
        'If you plan to rely on a credit card, ask its issuer for the rental coverage terms in writing, including whether it pays first or second.',
        'If nothing else covers the rental, the waiver may be worth buying for that trip.',
      ]);
    }
    return 'Before your next rental, ask your car insurer whether your policy covers a rental car on personal trips, including theft and damage, and what your deductible would be. Rules vary, so get the answer from your insurer or your state\'s department of insurance. Then, if you plan to rely on a card, ask its issuer for the rental terms in writing: whether it pays first or second, and what you must do to qualify, which usually means paying with the card and declining the waiver. If both cover you, decline the waiver at the counter.';
  },
  reason(ctx) {
    return rentalState(ctx).ownMayNotExtend
      ? "I want to know what would pay if a rental car were damaged before I decide whether the rental company's coverage is worth buying."
      : "I want to confirm my own policy and my card already cover a rental car before I pay the rental company for the same protection.";
  },
  sourceIds: ['iii-rental-car-insurance', 'ftc-renting-a-car', 'naic-consumer-auto-insurance'],
};

// ---------------------------------------------------------------------------------------------------
// 2. Towing and roadside: two or more sources of the same help (drop)
// ---------------------------------------------------------------------------------------------------

// Option ids of roadside_sources that count as a source, in question order, with plain-language labels.
const ROADSIDE_SOURCES = [
  ['auto_policy', 'a roadside add-on on your car insurance'],
  ['club', 'an auto club membership'],
  ['card', 'a credit card'],
  ['car_maker', 'roadside help that came with your car'],
];

// The counted sources the user ticked. `other` and Not sure do not count.
function roadsideTicked(ctx) {
  const picked = ctx.answer('roadside_sources');
  if (!Array.isArray(picked)) return [];
  return ROADSIDE_SOURCES.filter(([id]) => picked.includes(id));
}

const towingDuplicate = {
  id: 'other-towing-roadside-duplicate',
  domain: 'other',
  bucket: 'drop',
  kind: 'cross-policy',
  priority: 520,
  title: 'Check whether you are paying twice for roadside help',
  applies(ctx) {
    if (!ctx.holds('towing')) return false;
    const ticked = roadsideTicked(ctx);
    if (ticked.length < 2) return false;
    const cardBacked = ticked.some(([id]) => id === 'card') && cardView(ctx, 'roadside').confirmed.length > 0;
    return {
      emphasis: cardBacked ? 'strong' : 'normal',
      vars: { sourceList: joinList(ticked.map(([, label]) => label)) },
    };
  },
  background(ctx, vars) {
    const mentionsCard = roadsideTicked(ctx).some(([id]) => id === 'card') || ctx.cards().length > 0;
    return join([
      `Towing or roadside coverage on a car insurance policy pays for things like a tow when your car is disabled. The ${NAIC} calls it an optional extra, separate from the basic policy, and says an auto club such as AAA or another membership may already include some of the same help.`,
      `You told us you get roadside help from ${vars.sourceList}, so you may be paying for the same tow more than once. Plans differ, so ask each one what it covers.`,
      mentionsCard ? cardParagraph(ctx, 'roadside') : '',
    ]);
  },
  ask(ctx) {
    const ticked = roadsideTicked(ctx).map(([id]) => id);
    const names = confirmedNames(ctx, 'roadside');
    return join([
      'Ask each plan what it covers and what it costs, starting with your car insurer if you have a roadside add-on there.',
      names ? `Read the current benefits guide for ${names} to see what its roadside help covers.` : '',
      ticked.includes('auto_policy')
        ? 'If another plan already gives you the same help, ask your agent to take the add-on off your car policy.'
        : 'If another plan already gives you the same help, cancel the one you would use least.',
    ]);
  },
  reason: 'I already get roadside help from another plan, so I want to know whether I need to keep paying for this one.',
  sourceIds: ['naic-what-does-auto-insurance-cover', 'naic-consumer-insight-right-protection', 'naic-shopping-tool-auto-2023'],
};

// ---------------------------------------------------------------------------------------------------
// 3. Towing on a motorcycle or boat policy (question)
// ---------------------------------------------------------------------------------------------------

function vehicleWord(ctx) {
  const moto = ctx.holds('motorcycle');
  const boat = ctx.holds('boat');
  if (moto && boat) return 'motorcycle or boat';
  return moto ? 'motorcycle' : 'boat';
}

const vehicleTowingCheck = {
  id: 'other-vehicle-towing-check',
  domain: 'other',
  bucket: 'question',
  kind: 'cross-policy',
  priority: 530,
  title: 'Check where the towing help on your {{vehicle}} comes from',
  applies(ctx) {
    if (!ctx.holds('towing') || !(ctx.holds('motorcycle') || ctx.holds('boat'))) return false;
    if (!(ctx.is('towing_vehicle_policy', 'yes') || ctx.isNotSure('towing_vehicle_policy'))) return false;
    return { vars: { vehicle: vehicleWord(ctx) } };
  },
  background(ctx, vars) {
    // Every version names a card as one possible source of tow help, so the caution is always attached.
    return join([
      ctx.holds('motorcycle')
        ? `The ${NAIC} says a car insurance policy does not cover motorcycles, so the towing help on your car policy generally does not reach one.`
        : '',
      ctx.holds('boat')
        ? `The ${TRIPLE_I} lists towing after an accident among the common and optional coverages on a boat policy, so check whether yours already has it.`
        : '',
      `So tow help for your ${vars.vehicle} may come from its own policy, a club or a card. We did not find anything saying these plans usually repeat each other, so this is a question to ask, not a verdict.`,
      CARD_CAUTION,
    ]);
  },
  ask(ctx, vars) {
    const ticked = roadsideTicked(ctx).map(([id]) => id);
    const others = joinList([
      ticked.includes('club') ? 'your auto club' : '',
      ticked.includes('card') ? 'the credit card' : '',
    ].filter((x) => x !== ''));
    const askOthers = others
      ? `Also ask ${others} whether the help reaches your ${vars.vehicle} at all.`
      : `Also ask any auto club or credit card that gives you roadside help whether it reaches your ${vars.vehicle} at all.`;
    if (ctx.isNotSure('towing_vehicle_policy')) {
      return `First find out whether your towing plan is on your ${vars.vehicle} policy: check the summary page of the policy or ask your agent. If it is, ask exactly what it covers. ${askOthers} If two of them cover the same thing, keep the one you would actually call.`;
    }
    return `Ask the company that insures your ${vars.vehicle} exactly what its towing coverage includes, for example whether it covers a breakdown or only a tow after an accident. ${askOthers} If two of them cover the same thing, keep the one you would actually call.`;
  },
  reason: 'I want to know whether the towing plan on my {{vehicle}} repeats help I already get from another plan.',
  sourceIds: ['naic-what-does-auto-insurance-cover', 'iii-boat-insurance-and-safety'],
};

// ---------------------------------------------------------------------------------------------------
// 4. Travel insurance (drop)
// ---------------------------------------------------------------------------------------------------

const travelOverlap = {
  id: 'other-travel-insurance-overlap',
  domain: 'other',
  bucket: 'drop',
  kind: 'cross-policy',
  priority: 540,
  title: 'Check what you already have before paying for travel insurance',
  applies(ctx) {
    if (!ctx.holds('travel')) return false;
    return { emphasis: strongCard(ctx, 'tripProtection') ? 'strong' : 'normal' };
  },
  background(ctx) {
    return join([
      `Travel insurance can bundle several kinds of coverage: trip cancellation, interruption and delay, emergency medical and evacuation, accidental death, and lost or delayed baggage. The ${NAIC} says a policy usually costs about 5% to 10% of the trip price, and each policy sets its own limits and covered reasons.`,
      'Some of it may repeat what you already have. Some credit cards include trip cancellation and lost baggage coverage, a home or renters policy usually covers belongings lost or stolen while you travel, and the accidental death coverage in a travel policy may duplicate your life insurance.',
      'Medical coverage is the part to be careful with, because your health plan may not cover care abroad.',
      cardParagraph(ctx, 'tripProtection'),
    ]);
  },
  ask(ctx) {
    const names = confirmedNames(ctx, 'tripProtection');
    return join([
      names
        ? `Read the current benefits guide for ${names} and compare the trip reasons it covers, and its limits, with the policy you are about to buy.`
        : 'Before you buy, ask the issuer of the card you would book with for its trip protection terms, including the reasons it covers and its limits.',
      'Check your home or renters policy for lost or stolen baggage, and your life insurance if the travel policy includes accidental death.',
      'Then buy only the parts you do not already have. Ask your health insurer whether it covers you abroad before you give up medical coverage.',
    ]);
  },
  reason: 'I want to compare this policy with the trip protection on my card and the coverage I already have, so I only pay for what is missing.',
  sourceIds: ['naic-should-i-get-travel-insurance', 'iii-should-you-buy-travel-insurance'],
};

// ---------------------------------------------------------------------------------------------------
// 5. Phone insurance (question)
// ---------------------------------------------------------------------------------------------------
// No allowlisted source describes phone protection plans or what a card's phone coverage requires (research gap 1,
// DECISIONS S3a-3), so every sentence here is either a question to ask, a Triple-I statement about what a home or
// renters policy covers, or a statement taken from the card table.

function homeOrRenters(ctx) {
  const home = ctx.holds('home');
  const renters = ctx.holds('renters');
  if (home && renters) return 'homeowners or renters';
  if (home) return 'homeowners';
  return renters ? 'renters' : '';
}

function phoneState(ctx) {
  const view = cardView(ctx, 'cellPhone');
  const bill = ctx.is('phone_bill_on_card', 'yes') ? 'yes' : (ctx.is('phone_bill_on_card', 'no') ? 'no' : 'unknown');
  // onlyCard: the one card the user ticked is the one with the benefit, so "the bill is on a card" can only mean it.
  const onlyCard = view.confirmed.length === 1 && pickedCards(ctx).length === 1;
  return { view, bill, onlyCard, strong: view.confirmed.length > 0 && bill === 'yes' };
}

const phoneInsurance = {
  id: 'other-phone-insurance-card',
  domain: 'other',
  bucket: 'question',
  kind: 'cross-policy',
  priority: 550,
  title: 'Check whether a card or your home policy already covers your phone',
  applies(ctx) {
    if (!ctx.holds('phone')) return false;
    return { emphasis: phoneState(ctx).strong ? 'strong' : 'normal' };
  },
  background(ctx) {
    const policy = homeOrRenters(ctx);
    return join([
      'You told us you pay a monthly fee to insure your phone. Before you keep paying it, check two places that may already cover the same phone.',
      policy
        ? `Your ${policy} policy generally covers your belongings, including things you carry away from home, up to a limit, and some insurers cap the away-from-home part. Ask whether it covers a phone and what you would pay out of pocket first.`
        : '',
      phoneState(ctx).bill === 'yes' ? 'You said your phone bill is already charged to a credit card, so that card is the first one to check.' : '',
      cardParagraph(ctx, 'cellPhone'),
    ]);
  },
  ask(ctx) {
    const s = phoneState(ctx);
    const names = confirmedNames(ctx, 'cellPhone');
    if (s.strong) {
      // The bill answer says a credit card pays the bill, not which of the user's cards. Unless the card with the
      // benefit is the only card they ticked, say so and let the user check (DECISIONS S11-8).
      const whichCard = s.onlyCard ? '' : 'You told us your phone bill is on a credit card, but not which one. ';
      return `${whichCard}Make sure your phone bill is charged to ${confirmedChoice(ctx, 'cellPhone')}, and read that card's current benefits guide for what the phone coverage pays and what it requires. If it fits, ask your carrier to cancel the protection plan. The idea is to swap the carrier's plan for the card's coverage, not to cancel and go without.`;
    }
    if (names !== '') {
      return `Ask the issuer of ${names} whether paying your phone bill with the card turns its phone coverage on. If it does, the move is to put the bill on that card and then cancel the carrier's plan, rather than just cancelling and going without. Keep the carrier's plan until the card's coverage is confirmed.`;
    }
    return 'Ask the issuer of any card you carry whether it protects your phone and what it requires. Ask your home or renters insurer whether a phone is covered and what your deductible would be. Keep the carrier plan until one of them confirms coverage.';
  },
  reason(ctx) {
    // Conditional on purpose: the bill answer does not say which card the bill is on (DECISIONS S11-8).
    return phoneState(ctx).strong
      ? `If my phone bill is charged to ${confirmedChoice(ctx, 'cellPhone')}, I want to swap the carrier plan for that coverage instead of paying twice.`
      : 'I may already have coverage for my phone through a card or my home or renters policy, so I want to confirm that before I keep paying for a separate plan.';
  },
  sourceIds: ['iii-standard-homeowners-coverage', 'iii-renters-insurance'],
};

// ---------------------------------------------------------------------------------------------------
// 6. Extended warranties (drop)
// ---------------------------------------------------------------------------------------------------

const extendedWarranty = {
  id: 'other-extended-warranty-overlap',
  domain: 'other',
  bucket: 'drop',
  kind: 'cross-policy',
  priority: 560,
  title: 'Check before you pay extra for another extended warranty',
  applies(ctx) {
    if (!ctx.holds('warranty')) return false;
    return { emphasis: strongCard(ctx, 'extendedWarranty') ? 'strong' : 'normal' };
  },
  background(ctx) {
    return join([
      `An extended warranty or service contract costs extra and is sold separately from the product. It is different from the warranty that may come with the product, and the ${FTC} warns that the product's own warranty may already cover the same repairs for the same period.`,
      'The FTC says one may not be worth the cost if the product is unlikely to need repairs or if it adds no coverage beyond the warranty that came with the product. It also says to look for hidden costs such as deductibles, per-repair fees and shipping, and that setting the money aside in savings for repairs may be a better option.',
      cardParagraph(ctx, 'extendedWarranty'),
    ]);
  },
  ask(ctx) {
    const names = confirmedNames(ctx, 'extendedWarranty');
    return join([
      "Before you say yes to a plan, ask the seller what it covers beyond the product's own warranty, what the deductibles, per-repair fees and shipping costs are, and who stands behind the contract.",
      names
        ? `Read the current benefits guide for ${names} to see whether it extends the manufacturer's warranty on what you buy with it.`
        : "Check whether the card you would pay with extends the manufacturer's warranty.",
      'If the plan adds nothing you do not already have, say no. If you already pay for one, ask the company what it covers beyond the manufacturer\'s warranty and whether you can cancel.',
    ]);
  },
  reason: "I want to know what this plan covers that the product's own warranty and my card do not before I pay for it.",
  sourceIds: ['ftc-extended-warranties-service-contracts', 'ftc-warranties'],
};

// ---------------------------------------------------------------------------------------------------
// 7. Accidental death coverage next to life insurance (question)
// ---------------------------------------------------------------------------------------------------
// The plan says this stays a Question: the right answer depends on total life coverage, which v1 does not ask
// about, and "AD&D on top of adequate term life is largely redundant" is the SPEC's judgement, not a sourced
// fact (DECISIONS S3a-other-4). It never tells the user to drop anything and, with no term_life answer, stays silent.
// It also never calls the extra payout "one narrow case": the NAIC definition covers death and/or dismemberment,
// so accidental death coverage can pay for a non-fatal loss that a policy paying only on death never would
// (DECISIONS S11-9). Every branch keeps a loss in view and frames the question as what the extra buys for its price.

const ADD_INTRO = 'Accidental death coverage, often called AD&D (accidental death and dismemberment), pays a stated amount only when an accident, or certain kinds of accident, causes a death or a loss. Regular life insurance pays your beneficiaries if you die while the policy is active; a term policy, for example, pays if you die during its term. Read your policy for how it defines an accident and for its exclusions, and check what it counts as a loss.';

const ADD_BRANCHES = {
  own: {
    background: 'You told us you have a life insurance policy of your own. A term policy pays if you die during its term, so yours may already pay if an accident causes your death. Accidental death coverage adds a further payout when an accident causes a death. Some accidental death riders on a life policy pay two or three times the regular benefit. It may also pay for certain non-fatal losses, which a policy that pays only when you die would not. So the question is whether what it adds is worth what you pay for it.',
    ask: 'Ask your agent whether your term life policy already covers what this accidental death coverage is for, what the accidental death coverage pays for beyond it (including any non-fatal losses), and what that extra costs. Then decide whether the extra is worth it to you.',
    reason: 'I already have life insurance, so I want to know what my accidental death coverage adds beyond it, including any non-fatal losses it pays for.',
  },
  work_only: {
    background: `You told us your regular life insurance comes only through your job. The ${NAIC} says employer life insurance generally covers about one to two years of pay, which may not cover a mortgage or student loans, and that it ends if your job situation changes. Accidental death coverage pays only for accidents, so it does not fill that gap in the same way.`,
    ask: 'Ask your benefits office how much life insurance your job gives you, whether it and any accidental death coverage through work end if you leave, and whether you can keep or buy more on your own. Then ask whether your total life coverage is enough for the people who depend on you.',
    reason: 'My life insurance comes only through my job, so I want to know whether my total coverage is enough and whether it ends if I leave.',
  },
  none: {
    background: 'You told us you do not have regular life insurance. Accidental death coverage is not a substitute for it: it pays only when an accident causes a death or a loss, while regular life insurance pays if you die during its term.',
    ask: 'Ask your agent or benefits office what regular life insurance would cost and whether you need it, and check what your accidental death coverage actually pays, for which kinds of accident and for which losses.',
    reason: 'I have accidental death coverage but no regular life insurance, so I want to know whether that covers what my family would need.',
  },
  not_sure: {
    background: 'You were not sure what regular life insurance you have. That is the first thing to find out, because whether what accidental death coverage adds is worth its price depends on your total coverage, including any through your job.',
    ask: 'Ask your benefits office and your insurance agent what life insurance you have, through work or on your own, and how much each pays. Then ask what your accidental death coverage pays for beyond that, including any non-fatal losses, and whether it is worth its price.',
    reason: 'I want to know how much life insurance I have in total before I decide what my accidental death coverage is for.',
  },
};

function termLifeBranch(ctx) {
  if (ctx.isNotSure('term_life')) return 'not_sure';
  const answer = ctx.answer('term_life');
  return answer === 'own' || answer === 'work_only' || answer === 'none' ? answer : null;
}

const accidentalDeathAndTermLife = {
  id: 'other-add-on-term-life',
  domain: 'other',
  bucket: 'question',
  kind: 'cross-policy',
  priority: 570,
  title: 'Ask how your accidental death coverage fits with your life insurance',
  applies(ctx) {
    return ctx.holds('accidental_death') && termLifeBranch(ctx) !== null;
  },
  background(ctx) {
    return join([
      ADD_INTRO,
      ADD_BRANCHES[termLifeBranch(ctx)].background,
      ctx.holds('travel') ? `If your travel insurance includes accidental death coverage, the ${TRIPLE_I} says that can duplicate your life insurance too.` : '',
    ]);
  },
  ask: (ctx) => ADD_BRANCHES[termLifeBranch(ctx)].ask,
  reason: (ctx) => ADD_BRANCHES[termLifeBranch(ctx)].reason,
  sourceIds: ['naic-glossary', 'naic-consumer-life-insurance', 'naic-life-insurance-roadmap', 'iii-should-you-buy-travel-insurance'],
};

export default [
  rentalCarWaiver,
  towingDuplicate,
  vehicleTowingCheck,
  travelOverlap,
  phoneInsurance,
  extendedWarranty,
  accidentalDeathAndTermLife,
];
