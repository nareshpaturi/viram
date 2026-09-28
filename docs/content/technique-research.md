# Technique content research · v1.0

Research date: September 23, 2026. Status: **drafted, content version 1 for all eight techniques.** Studies source-checked; book page references still to confirm against print copies; no instructor review recorded; voice clips not yet generated.

This is the research record behind the v1.0 library: why each default is what it is, where each claim comes from, and what still needs a human check. The app copy itself lives in one place so it can't drift:

| What | Where |
|---|---|
| App copy and practice data (single source) | [`src/content/library.ts`](../../src/content/library.ts), schema in [`types.ts`](../../src/content/types.ts) |
| Sources shown under “Based on” and in About | [`src/content/sources.ts`](../../src/content/sources.ts) |
| Voice cue scripts and the rule that picks each step's cue | [`src/content/voice.ts`](../../src/content/voice.ts) |
| Readable preview for review (generated, don't edit) | [library-preview.html](library-preview.html) · `npm run content:preview` |
| Content rules check (bounds, sources, claims, review records) | `npm run check:content` |
| Pronunciation lexicon for voice generation | [viram-lexicon.pls](viram-lexicon.pls) |

## Decisions

| Technique | Default | Outcome | Why |
|---|---|---|---|
| **Sama Vritti** · box | 4 · 4 · 4 · 4 · 5 min | Confirmed | The standard box count in training and in every box-breathing study found. Iyengar adds holds gradually, so the guide teaches shortening a hold or setting it to Off. |
| **Visama Vritti** · extended exhale | in 4 · out 6, holds Off · 5 min | Confirmed; **framing changed** | Iyengar's visama vrtti always includes long holds and needs a teacher. Viram teaches a gentle, hold-free form and says so. |
| **Nadi Shodhana** · alternate nostril | in 4 · out 6, each side · 5 min | Confirmed | Sits between Satyananda's 1:1 and 1:2 stages. Starting on the left follows HYP, Satyananda, and the AYUSH protocol. Equal counts are offered for beginners. |
| **Bhramari** · humming bee | in 4 · hum 8 · 5 min | Confirmed | Trivedi 2023 found 4 : 8 among the best humming lengths tested. Seated only (Satyananda). |
| **Ujjayi** · ocean breath | in 5 · out 5 · 5 min | Confirmed | Exactly the pattern Mason 2013 tested. The throat sound stays light. |
| **Sheetali** · cooling breath | in 4 · out 6 · 3 min | Confirmed; **claims changed** | “Cooling” is framed as tradition: the only temperature study found body temperature *rose*. |
| **Coherent breathing** | 5.5 · 5.5 · 5 min | Confirmed; **name flagged** | Vaschillo's average resonance pace. “Coherent Breathing” is a registered trademark of COHERENCE LLC (open question 1). |
| **4-7-8** | 4 · 7 · 8 · rest Off · **4 rounds** | **Target changed** from 1 min | Andrew Weil teaches four breaths to start. A “1 min” target actually ran 1:16. |

Planned rounds and duration are unchanged for every technique (19 rounds / 5:04 box, 15 / 5:00 Nadi Shodhana, 28 / 5:08 coherent, 4 / 1:16 for 4-7-8).

**Voice decisions**

- **Side cues are recorded as whole phrases** (“Inhale left”, “Exhale right”, …), up to 1.2 s each, so they sound like one calm instruction instead of two stitched words. Standalone “Left”, “Right”, and “Switch” are dropped: “Switch” had no step to play on, and the side phrase already says where to breathe.
- **Two route phrases join v1.0:** “In through the mouth” (Sheetali) and “Out through the mouth” (4-7-8), spoken on the first round in place of the step word. Later rounds use “Inhale” or “Exhale”. The screen shows the route on every round.
- **Pronunciation uses alias rules**, which work on every ElevenLabs model; phoneme rules are limited to two models.

## Method

- **Classical texts** were read in public-domain translations: *Hatha Yoga Pradipika* (HYP; Pancham Sinh, 1914; standard four-chapter numbering, checked against the Sanskrit), *Gheranda Samhita* (GS; Srisa Chandra Vasu; numbering varies between editions, so cite “Vasu numbering”), and the *Yoga Sutras* with Vyasa's commentary (J.H. Woods, 1914).
- **Teaching books:** B.K.S. Iyengar, *Light on Pranayama* (1981); Swami Satyananda Saraswati, *Asana Pranayama Mudra Bandha* (APMB, 4th revised edition, 2008); T.K.V. Desikachar, *The Heart of Yoga* (1995). These are under copyright: the app paraphrases and never quotes them, and page references below are approximate.
- **Public guides:** Ministry of AYUSH *Common Yoga Protocol* (4th revised edition, 2019), the Andrew Weil Center for Integrative Medicine, NHS, and the British Heart Foundation.
- **Studies:** every study cited in the app was checked against its PubMed record through the Europe PMC API on September 23, 2026 (authors, year, title, journal, DOI). All 22 matched, as did four uncited trials checked the same way. Other studies noted below as “also reviewed” were checked by the research pass but aren't cited in the app.
- **Copy rules applied:** original writing; tradition framed as tradition; evidence stated plainly, including null results; no treatment, diagnosis, or outcome claims (enforced by `check:content`); common romanization without diacritics; gentle defaults; holds of 20 s or less. Every “What research says” ends with “It is not a treatment.”

---

## Sama Vritti · box breathing

**Classical and teaching sources**
- *Sama vrtti* (“even movement”) is B.K.S. Iyengar's name for breathing with equal step lengths (*Light on Pranayama*, ch. 18, “Vrtti Pranayama”). He builds it gradually: an even inhale and exhale first; then a hold after the inhale, starting shorter than the inhale and working up to 1 : 1 : 1; only then a hold after the exhale, up to 1 : 1 : 1 : 1. At first, single held breaths are spaced between normal breaths.
- Yoga Sutra 2.50 describes breath regulation “by place, time, and number,” and Vyasa's commentary explains time and number as counts that lengthen gradually. **Fair link:** even counting is one way of regulating by time and count. **Overstated:** “sama vritti comes from the Yoga Sutras.” The named technique is 20th-century teaching (Iyengar; Desikachar uses the same terms).
- **Box breathing:** Mark Divine named it and describes 4-4-4-4 through the nose for about five minutes, with holds that feel open rather than tense (TIME, 2016). Police training traces the same four-count through “combat” or “tactical” breathing seminars of the 1980s–90s.
- HYP 2.15–2.17: tame the breath slowly, as wild animals are tamed; forcing it causes harm. This is classical support for “never force.”

**Rhythm.** 4 · 4 · 4 · 4 is a 16 s round (3.8 guided breaths/min), the count used by Divine, Harvard Health, Cleveland Clinic, and the McAllister 2026 and Ibrahim 2024 trials. Balban 2023 set counts of 3–10 s by CO₂ tolerance, and 4 s was at the easy end. By Iyengar's standard, starting with both holds is advanced, so holds can be shortened or set to Off, and the hold after the exhale is the first to drop.

**Take care basis.**
- Iyengar: no holds with heart or chest problems or when unwell; the hold after the inhale is not advisable with high blood pressure; avoid long holds in pregnancy.
- No medical source found rules out 4 s holds; Harvard Health presents box breathing to people with high blood pressure. The app's “set the holds to Off or check with your clinician” wording is conservative, not mandated.
- Maximal breath holds can trigger panic in people with panic disorder (Nardi 2006, PMID 16635529). Those holds are much longer than 4 s, but this supports “turn the holds off if they make you uneasy.”
- Holding against a closed throat while bearing down is a Valsalva maneuver, hence “don't clamp or bear down.”
- Never practise holds in or near water (CDC MMWR 2015;64(19)).

**Evidence**

| Study | Design | Finding |
|---|---|---|
| Balban 2023, *Cell Rep Med* · PMID 36630953 | Remote RCT, 28 days, 5 min/day, 108 randomized (box arm 19) | Box breathing improved mood and anxiety within a day, but was **not significantly different from mindfulness**; no heart rate or HRV change in any arm. Only cyclic sighing beat mindfulness. |
| McAllister 2026, *Compr Psychoneuroendocrinol* · PMID 42388906 | RCT, 66 students, around a virtual social-stress test | Box and prolonged exhale both blunted rises in heart rate, anxiety, and salivary alpha-amylase vs normal breathing; no effect on HRV or cortisol. |

Also reviewed:
- Riedl 2026 (PMID 42002307): pilot, 1-minute box breathing lowered anxiety vs a passive control.
- Röttger 2021 (PMID 32757097): tactical breathing gave lower physiological arousal, but a prolonged exhale gave better task performance.
- Ibrahim 2024 (PMID 37733483): better first shot in a simulator for 100 student officers.
- Dujawara 2026 (PMID 42768274): review of box-breathing RCTs reporting short-term, uneven benefits.

**Summary:** small, short-term studies, mostly in healthy young adults. Box breathing eases anxiety within a session. In the largest head-to-head trial it did no better than mindfulness and didn't change HRV. There are no long-term data.

## Visama Vritti · extended exhale

**Classical and teaching sources**
- Iyengar's *visamavrtti* varies step lengths and **always includes holds**. He works from 1 : 2 : 1 through 1 : 4 : 2 to an ideal of 1 : 4 : 2 : 1 (for example 5 s in, 20 s hold, 10 s out, 5 s hold). He warns that it taxes the lungs, heart, and nerves, and should be learned only under an experienced teacher (*Light on Pranayama*, ch. 18).
- GS 5.39–40 (Vasu) counts 16 : 64 : 32 (1 : 4 : 2) for nadi purification. The 1 : 2 inhale-to-exhale ratio is classical *within* hold-based practice.
- Desikachar (*The Heart of Yoga*, ch. 6) describes varied lengths and gives an exhale twice the inhale as an example. That is closer to Viram's version.

**What Viram does, and says:** only the lengthened exhale, with holds Off. The context copy calls it “a gentle, hold-free form closer to modern teaching,” and Take care says the classical form belongs with a teacher. Holds stay as Off steps so the v1.1 progression (out 7, then out 8, moving toward 1 : 2) and Adjust rhythm keep the step structure.

**Rhythm.** in 4 · out 6 is 10 s a breath, six a minute, the most-studied slow-breathing rate. Komori 2018 used exactly 4 : 6, and Magnon 2021 built from 4 : 4 to 4 : 6 over five minutes. With no holds, the hold cautions don't apply.

**Take care basis.** Keep breaths soft rather than big, to avoid lightheadedness from overbreathing. The NHS says not to force the breath, and that some people can't reach a count of 5 at first. Iyengar notes gasping when the ratio is too long, hence “if the next inhale feels rushed, shorten the exhale.”

**Evidence**

| Study | Design | Finding |
|---|---|---|
| Van Diest 2014, *Appl Psychophysiol Biofeedback* · PMID 25156003 | Within-subject, 30 | A longer exhale felt more relaxing; higher HRV only at 6 breaths/min. |
| Magnon 2021, *Sci Rep* · PMID 34588511 | 47 young and older adults, 4 : 4 → 4 : 6 | HRV up and anxiety down, more in older adults. **No control group.** |
| Meehan &amp; Shaffer 2024, *Appl Psychophysiol Biofeedback* · PMID 38507210 | 26 plus a replication of 16 | **Null:** a 1 : 2 ratio didn't change HRV vs 1 : 1 at 6/min. Reviews a mixed literature. |
| Laborde 2022, *Neurosci Biobehav Rev* · PMID 35623448 | Meta-analysis, 223 studies | Slow breathing raises vagally mediated HRV during, right after, and across sessions. |

Also reviewed:
- Bae 2021 (PMID 34289128): a 2 : 1 exhale-to-inhale ratio raised HRV.
- Komori 2018 (PMID 30046408): 10 men at 4 : 6, more parasympathetic HRV, no control.
- Laborde 2021 (*Sustainability*, doi 10.3390/su13147775): a longer exhale raised RMSSD in athletes.
- Fincham 2023 meta-analysis (PMID 36624160): small-to-medium benefits of breathwork on stress, at moderate risk of bias.

**Summary:** slow breathing near six a minute reliably raises HRV in the short term. Whether the longer exhale adds anything beyond slowing down is genuinely mixed.

## Nadi Shodhana · alternate nostril breathing

**Classical sources**
- HYP 2.7–2.10: in through the left, hold as long as is comfortable, out through the right; then in through the right, hold, out through the left. Breathe out slowly, never forcibly (2.9). The nadis are said to be cleansed in three months (2.10).
- Later verses describe four sittings a day with up to 80 holds (2.11) and the signs of clean nadis (2.19–20).
- HYP describes the practice only *with* retention. Pancham Sinh's edition includes an appended passage that uses “anuloma” and “viloma” for the left-then-right sequence.
- GS 5.36–55 (Vasu): 16 : 64 : 32 counts with seed mantras, in three versions. GS 5.53 closes the nostrils with the thumb and the ring and little fingers, never the index and middle.

**Teaching sources**
- **Satyananda (APMB):** fingers in Nasagra mudra (index and middle on the eyebrow centre); breathing without holds at 1 : 1, then 1 : 2 from 5 : 10. Holds come only in later techniques, over years and with a teacher. The breath is silent and never forced.
- **Iyengar (*Light on Pranayama*, ch. 22 and 28):** index and middle fingers folded into the palm, and he argues against resting them on the forehead. Fingertips should be sensitive, not strong, with short nails. Start with Ujjayi first. His stage without holds starts on the **right**, unlike HYP, Satyananda, and the AYUSH protocol.
- **AYUSH Common Yoga Protocol:** starts on the left; its definition of one round matches Viram's four steps; beginners use equal counts, then move toward 1 : 2; breathing is slow and never forced.
- **Viram's how-to offers both hand positions** (fold the two fingers, or rest them between the eyebrows) and starts on the left.
- **Anulom Vilom:** research papers and Indian practitioners use it for alternate nostril breathing. In Iyengar's system *anuloma* and *viloma* are separate practices, so the alias is popular and regional rather than universal. The context copy says “many practitioners in India know it as Anulom Vilom.”

**Rhythm.** in 4 · out 6 each side is a 20 s round (15 rounds in 5 min, 6 guided breaths/min). That is gentler than Satyananda's first 1 : 2 count of 5 : 10 and matches slow-breathing studies. Both teachers start complete beginners on equal counts, so Take care offers “make the exhale equal to the inhale.”

**Take care basis.** Skip it with a cold or blocked nose, and don't force air through a nostril (APMB). Use a light touch (Iyengar). Stop if the rhythm can't be kept (HYP 2.9, 2.15–17). No holds with heart problems or in pregnancy (Iyengar; APMB); Viram's version has none.

**Evidence**

| Study | Design | Finding |
|---|---|---|
| Nam 2024, *Complement Med Res* · PMID 39008954 | Meta-analysis, 6 RCTs, 525 people | Systolic −7.2, diastolic −5.2 mmHg vs control, with **very high heterogeneity** (I² 87–93%); mostly unblinded. |
| Ghiya &amp; Lee 2012, *Int J Yoga* · PMID 22346069 | Crossover, 20 beginners | HRV changes **matched plain paced breathing** at the same 5 breaths/min. |
| Kamath 2017, *Biomed Res Int* · PMID 29159176 | Pilot RCT, 30 | **No significant difference** in anxiety during a public-speaking test (a trend only). |

Also reviewed:
- Telles 2013 (PMID 23334063): blood pressure fell after one session in 90 people with hypertension; breath awareness also lowered systolic.
- Telles 2019 (PMID 31006767): anxiety didn't fall.
- Jahan 2021 (PMID 34213471): no between-group difference.
- Mittal 2025 (PMID 40242728): lower blood pressure at 6 weeks, with 25% dropout.
- Many of these trials come from one research group.

**Summary:** small, mostly single-session trials suggest a modest short-term drop in blood pressure, with results that vary widely. Anxiety and HRV findings are mixed. The only comparison with plain slow breathing at the same pace found similar effects.

## Bhramari · humming bee breath

**Classical sources**
- HYP 2.44 lists it among eight kumbhakas.
- HYP 2.68 pairs a fast inhale with the sound of a male bee and a very slow exhale with the sound of a female bee: **sound on both breaths**. Pancham Sinh's translation drops the male/female distinction.
- GS 5.78–82 (Vasu): inhale, hold, ears closed; listen in the right ear for inner sounds, from crickets to bells, ending in the *anahata* sound. **No humming instruction.**
- The app's silent inhale, humming exhale, and no hold follow modern teaching.

**Teaching sources**
- **Satyananda (APMB):** lips closed, teeth slightly apart; ears closed with a finger or by pressing the flaps, without inserting the fingers; a soft, steady hum; 5–10 rounds to start. Retention appears only in a later technique, and not for heart disease.
- **Iyengar:** holds are not advisable in Bhramari. The optional Shanmukhi mudra presses the tragus instead of putting thumbs in the ears.
- **AYUSH protocol:** Type I is a hands-free hum on the exhale.

**Rhythm.** in 4 · hum 8 is a 12 s round (25 rounds in 5 min, 5 guided breaths/min). Trivedi 2023 compared four humming lengths, and 4 : 8 and 5 : 9 gave the highest HRV. An exhale twice the inhale is natural because the hum narrows the airflow. Five minutes is longer than Satyananda's opening 5–10 rounds but matches most study sessions. People can pick 3 min.

**Take care basis.**
- Skip it with an ear or nose infection (APMB; AYUSH).
- Press the ear flaps gently and never put fingers in the canal (Iyengar).
- Practise seated: Satyananda says not lying down, though Iyengar includes a lying stage.
- Pregnancy: Iyengar allows pranayama without long holds; no clinical data exist.

**Evidence**

| Study | Design | Finding |
|---|---|---|
| Weitzberg &amp; Lundberg 2002, *Am J Respir Crit Care Med* · PMID 12119224 | Lab study, 10 adults | Nasal nitric oxide about 15× higher while humming. Maniscalco 2003 (PMID 12952268) found the rise **fades with repeated hums**. No health outcome. |
| Ghati 2021, *Explore* · PMID 32620379 | RCT, 70 people with hypertension | **No blood-pressure difference vs placebo slow breathing**; HRV improved during recovery. |
| Trivedi 2023, *Int J Yoga* · PMID 38204770 | Crossover, 118 | 4 : 8 and 5 : 9 gave the highest HRV of the four lengths. Short readings, no silent control. |
| Kuppusamy 2018, *J Tradit Complement Med* · PMID 29321984 | Systematic review, 6 studies | Leans calming, but quality “very low,” with no RCTs. |

Also reviewed:
- Nivethitha 2017 (PMID 28546681): heart rate rose and HRV shifted toward stress *during* practice.
- Kuppusamy 2020 (PMID 32025489): 520 adolescents over 6 months showed a parasympathetic shift, with no active control.
- Woo &amp; Kim 2025 (PMID 40482984): humming was no different from paced breathing.
- Kim 2026 (PMID 41686399): the HRV effect was tied to slow breathing, not to the sound.
- Abishek 2019 (PMID 31143019): sinusitis symptoms improved, unblinded.
- One researcher co-authors several of these studies, so the evidence is less independent than the count suggests.

**Summary:** Bhramari seems about as calming as other slow breathing. The hum may simply make slow breathing easier.

## Ujjayi · ocean breath

**Classical sources**
- HYP 2.51–53: close the mouth, draw the breath through both nostrils with a sound felt from throat to chest, hold, and breathe out through the left nostril. It is said to clear phlegm and strengthen digestion, and can be done walking or standing.
- GS 5.69–72 adds jalandhara bandha and a forceful hold.
- Viram: no hold, out through both nostrils, a gentle sound both ways.

**Teaching sources**
- **Satyananda (APMB):** a slight glottal contraction makes a soft snoring sound, “like a sleeping baby,” audible only to the practitioner. Keep the face relaxed. Sitting, standing, or lying all work. Start with 10 breaths and build to 5 minutes.
- **Iyengar:** early stages lying down; don't constrict the throat. Without holds and lying down, he describes it as suited to people with high blood pressure or heart trouble.

**Rhythm.** in 5 · out 5 is the exact equal 6-breaths-a-minute pattern Mason 2013 tested. Keep the throat narrowing very light.

**Take care basis.** Don't contract the throat strongly; the sound is soft and heard only by you (APMB; Iyengar). If the throat tires, drop the sound (from Satyananda's “slight, steady” guidance).

**Evidence**

| Study | Design | Finding |
|---|---|---|
| Mason 2013, *eCAM* · PMID 23710236 | Within-person, 17 beginners, lying down | Slow breathing raised baroreflex sensitivity and lowered BP. The Ujjayi sound added a little oxygen saturation but **raised heart rate and blunted the BP drop**; Ujjayi in and out gave no significant baroreflex gain. |
| Laborde 2022 · PMID 35623448 | Meta-analysis | Slow breathing raises HRV (the likely source of what people feel). |

Also reviewed: Mazur 2024 (PMID 38507692, 12 people with spinal cord injury, oxygen saturation up) and Wooten 2020 (PMID 30142133, no effect on muscle power). Brown &amp; Gerbarg 2005 (PMID 15750381) proposes a vagal mechanism; it is theory, not evidence.

**Summary:** direct research is thin. The throat sound adds effort without a clear cardiovascular benefit over plain slow breathing in beginners; its value is as a focus aid.

## Sheetali · cooling breath (Sheetkari alternative)

**Classical sources**
- HYP 2.57–58 (Sitali): draw air in over the tongue, protruded a little past the lips; hold; exhale slowly through both nostrils. **The verse doesn't say to curl the tongue**; that comes from modern teaching. Traditional claims: eases gulma, spleen, fever, bile, hunger, and thirst, and counteracts poison. The app mentions only heat, thirst, and hunger, as tradition.
- HYP 2.54–56 (Sitkari): a hissing inhale through the mouth, exhale through the nose.
- GS 5.73–74 (Vasu) gives Sitali with a brief hold. The app's version has no hold.

**Teaching sources**
- **Satyananda (APMB):** roll the tongue into a tube; 9–15 rounds, up to 60 in hot weather. About a third of people can't roll the tongue; Sheetkari (teeth lightly together, lips apart) gives similar effects.
- **Iyengar:** hot weather, before sunrise or after sunset.
- **AYUSH protocol:** tongue-tube inhale, exhale through both nostrils; avoid with a severe cold, cough, or tonsillitis.
- Tongue rolling: 65–81% of people can, according to studies summarized by J.H. McDonald (University of Delaware). It isn't a simple genetic trait. Hence “Many people can't,” not a precise share.

**Rhythm.** in 4 · out 6 at 3 min is 18 rounds, close to Satyananda's 9–15 and at the slow-breathing rate of 6/min.

**Take care basis.**
- Skip it in cold weather or polluted air; mouth breathing skips the nose's warming and filtering (APMB).
- Skip it with asthma, bronchitis, or excess mucus (APMB), or a severe cold, cough, or tonsillitis (AYUSH).
- Skip it with low blood pressure (APMB).
- With sensitive teeth, use the tongue version rather than Sheetkari (APMB).
- APMB's chronic-constipation caution is traditional reasoning with no evidence behind it, so it is left out.

**Evidence**

| Study | Design | Finding |
|---|---|---|
| Telles 2020, *Med Sci Monit Basic Res* · PMID 31907342 | Crossover, 17 young men, 18 min | **Body temperature rose** during both Sheetali and Sitkari; oxygen use rose. The authors say the results don't support calling them cooling. |
| Shetty 2017, *Integr Med* · PMID 30936803 | RCT, 60 people with hypertension vs wait-list | Systolic −16 mmHg and heart rate −7 after the program. Unblinded; no active control. |
| Sharpe 2021, *J Psychosom Res* · PMID 34271528 | Crossover, 25 analysed | HRV rose in all conditions; Sheetali/Sheetkari wasn't significantly better than deep breathing. |

Also reviewed: Thanalakshmi 2020 (PMID 32379673; 3 months, BP fell, no active control) and Rohini 2021 (PMID 33962510; one session, heart rate and BP fell). No Sheetali-specific systematic review exists.

**Summary:** thin evidence. Small, unblinded trials report lower blood pressure without an active comparison, and the only temperature study found warming, not cooling. The coolness is air over a wet tongue.

## Coherent breathing

**Origins**
- Stephen Elliott introduced **Coherent Breathing** in 2005 (*The New Science of Breath*) at a nominal 5 breaths/min. “COHERENCE and COHERENT BREATHING are registered trademarks of COHERENCE LLC” (coherentbreathing.com).
- Richard Brown and Patricia Gerbarg adopted it and taught it widely (*The Healing Power of the Breath*, 2012).
- The research term is resonance-frequency breathing (Lehrer and Vaschillo). Heart-rate swings with the breath peak near 0.1 Hz, and Vaschillo's refinement is about 5.5 breaths/min on average, with individual values from about 4.5 to 6.5.
- The 5.5 s × 5.5 s rhythm was popularized by James Nestor's *Breath* (2020), and it matches the Sussex trial's protocol.

**Rhythm.** 5.5 · 5.5 as a population default, followed rather than counted (half-second steps show a progress ring). It isn't personalized, so the how-to offers shortening both steps. Keep breaths gentle: Marchant 2025 found mild overbreathing at 6/min.

**Take care basis.** Lightheadedness or tingling in the hands or lips means overbreathing, which lowers CO₂ (Cleveland Clinic): take smaller breaths or stop.

**Evidence**

| Study | Design | Finding |
|---|---|---|
| Fincham 2023, *Sci Rep* · PMID 38092805 (University of Sussex) | Blinded RCT, 400 UK adults, 10 min/day for 4 weeks, 5.5/min vs placebo 12/min breathing | Stress, anxiety, depression, and wellbeing improved **equally in both arms**; expectations were matched. HRV wasn't measured. |
| Laborde 2022 · PMID 35623448 | Meta-analysis, 223 studies | Slow breathing raises HRV during, right after, and across sessions. |
| Lehrer &amp; Gevirtz 2014, *Front Psychol* · PMID 25101026 | Review | Baroreflex mechanism; few applications have extensive controlled support. |

Also reviewed:
- Zaccaro 2018 (PMID 30245619): systematic review, 15 small studies.
- Goessl 2017 (PMID 28478782): coached HRV biofeedback reduced stress and anxiety with a large effect, but that is equipment and coaching, not unguided pacing.
- Streeter 2017 (PMID 28296480): yoga plus coherent breathing for depression, with no non-yoga control.

**Summary:** the short-term physiology is well established, but the pace hasn't been shown to beat a simple slow-breathing routine for how people feel.

## 4-7-8 breathing

**Origin.** Andrew Weil, via the University of Arizona Andrew Weil Center page, “4-7-8 Breath”:
- Tongue tip on the ridge behind the upper front teeth throughout.
- In quietly through the nose for 4, hold for 7, whoosh out through the mouth for 8 (pursed lips are fine).
- The ratio matters, not the absolute time: speed up if the hold is hard.
- Four breaths, at least twice a day; no more than four at a time for the first month, later up to eight.
- Early lightheadedness passes.

Cleveland Clinic notes its roots in pranayama. Weil's own wording on that couldn't be fetched (drweil.com blocks automated access).

**Rhythm.** Four rounds with rest Off matches Weil. At 1 s per count, a round is 19 s, so the old “1 min” target really took 1:16. The default target is now **4 rounds** (1:16), which says what happens. Weil's opening full exhale isn't modelled.

**Take care basis.**
- Mild lightheadedness is common at first; stop and breathe normally (Weil; BHF, which also suggests limiting it to four rounds).
- Shorten all three counts rather than straining the hold (Weil).
- Breath holds and heart or lung conditions: check first (BHF).
- Never practise holds in or near water (CDC).

**Evidence**

| Study | Design | Finding |
|---|---|---|
| Vierra 2022, *Physiol Rep* · PMID 35822447 | Before and after, 43 young adults | Heart rate and systolic BP fell; no comparison breathing condition. |
| Aktaş &amp; İlgin 2023, *Obes Surg* · PMID 36480101 | RCT, 90 after bariatric surgery | Lower state anxiety with 4-7-8 vs routine care; unblinded, no sham. |
| Marchant 2025, *Appl Psychophysiol Biofeedback* · PMID 39864026 | Within-subject, 84 students | **6 breaths/min raised HRV more than 4-7-8** or square breathing; no condition changed mood or BP. |

Also reviewed:
- Avcık 2026 (PMID 42771122): no HRV change.
- Kirazli 2026 (PMID 41676854): tinnitus, vs an information session.
- Parlak 2026 (PMID 42715135): before endoscopy.

No rigorous trial tests 4-7-8 for falling asleep in the general population.

**Summary:** thin evidence. It is a structured, easy-to-remember routine with plausible short-term effects, and unproven as a sleep aid.

---

## v1.1 library additions · draft for owner review

Researched September 28, 2026 for delivery plan E12. **Draft, content version 1**: studies checked against PubMed (through NCBI E-utilities), classical verses checked in public-domain translations where noted, teaching-book points marked where they still need a print check; no instructor review; placeholder voice clips only. Sources are in `src/content/sources.ts`; the content is in `library.ts` after 4-7-8.

| Technique | Rhythm | Planned |
|---|---|---|
| Dirgha | in 4 · out 6 | 30 rounds · 5:00 · 6 breaths/min |
| Udgeeth | in 4 · Om 8 | 25 rounds · 5:00 · 5 breaths/min |
| Chandra Bhedana | in 4 left · out 6 right | 30 rounds · 5:00 · 6 breaths/min |
| Cyclic sighing | in 3 · top up 1 · out 6 through the mouth | 30 rounds · 5:00 · 6 breaths/min (the top-up is part of the same breath) |

### Decisions

| Technique | Default | Family | Why |
|---|---|---|---|
| **Dirgha** · three-part breath | in 4 · out 6 · 5 min · seated or lying | classical | Sanskrit name, so it needs a pronunciation (FR-09) and sits with Sama Vritti, whose named form is also 20th-century teaching. The context text says plainly that the three-part method is modern. |
| **Udgeeth** · Om on the exhale | in 4 · Om 8 · 5 min · seated | classical | Rooted in the Chandogya Upanishad's *udgitha*; the named breathing practice is modern and the copy says so. Same 4 : 8 as Bhramari. |
| **Chandra Bhedana** · in left, out right | in 4 left · out 6 right · 5 min · seated | classical | Not in HYP, GS, or Hatharatnavali (all verified: they list only Surya Bhedana). Taught by Iyengar (*Light on Pranayama* ch. 27, title verified). Copy says it is the later mirror of the classical sun practice. |
| **Cyclic sighing** | in 3 · top up 1 · out 6 mouth · 5 min · seated or lying | modern | A 2023 Stanford research protocol; no Sanskrit name, no pronunciation, context headed “Where it comes from.” |

Increment is 1 for all four (whole seconds everywhere; no half seconds are justified by any source).

### Method

- **Studies:** every PMID below was retrieved from the PubMed database through NCBI E-utilities (`esummary` for authors, year, title, journal, volume, pages, DOI; `efetch` for abstracts) on September 28, 2026. The pubmed.ncbi.nlm.nih.gov web pages themselves return a reCAPTCHA challenge to automated requests, so they were **not** fetched and the challenge was not bypassed; the E-utilities record is the same PubMed record. Full texts were read on PMC where open (Balban 2023, Bhavanani 2014, Bernardi 2001).
- **Classical texts (public domain, archive.org):** HYP (Pancham Sinh 1914, `dli.csl.7087`), GS (Vasu, `Gheranda_Samhita`), Yoga Sutras (Woods 1914), Chandogya Upanishad (Max Müller, SBE vol. 1, 1879, `upanishads01mluoft`), and Yogi Ramacharaka, *The Hindu-Yogi Science of Breath* (1904, `scienceofbreathc00ramaiala`).
- **Under copyright, read only to check facts:** *Hatharatnavali* (Gharote et al., Lonavla Yoga Institute 2002) and Satyananda's APMB, both in an unofficial archive.org upload (`yogic-texts`). Paraphrase only; **confirm against print copies** before release. *Light on Pranayama*: only the table of contents was available (archive.org metadata for `lightonprymaprym0000iyen`); chapter contents are **unverified**.
- **Could not read:** the AYUSH Common Yoga Protocol PDF (text streams use CID fonts and could not be extracted), so `ayush-cyp` is not cited for any of the four.

---

### Dirgha · three-part breath

**Classical sources**
- Yoga Sutra 2.50 (Woods 1914): regulated breath, observed by place, time, and number, becomes “protracted and subtile” (*dirgha-sukshma*). **Fair link:** *dirgha* (“long”) is the sutra's own word for regulated breath. **Overstated:** “three-part breathing comes from the Yoga Sutras.” The sutra says nothing about belly, ribs, or chest.
- No three-part method appears in HYP or GS (not found in either text).

**Teaching sources**
- **Yogi Ramacharaka, *The Hindu-Yogi Science of Breath* (1904)**, “The Yogi Complete Breath”: fill the lower lungs by lowering the diaphragm, then the middle (lower ribs, breastbone), then the upper chest; it is one continuous inhale, not three jerky movements; hold a few seconds; exhale slowly, drawing the abdomen in. This is the earliest English source found for the three-part method. “Ramacharaka” was a pen name of William Walker Atkinson, an American writer, so this is Western popular teaching, not an Indian classical text.
- **Satyananda (APMB), “Yogic breathing”** (index p. 383 in the copy read): abdominal, then thoracic, then clavicular, as one continuous movement “like the swell of the sea,” without strain; exhale from the top down (upper chest and neck relax, chest contracts, then the abdomen draws in); a brief pause after the exhale; start with 5–10 rounds, build to 10 minutes. He says it should not be done continually, and that once control is learned the clavicular part is dropped and the breath becomes abdominal plus thoracic. Seated or lying in shavasana.
- **The name “Dirgha pranayama”** is used by several modern schools (for example the Sivananda and Integral Yoga lineages; Kripalu). **Unverified — owner to confirm** which school first used the name; the copy avoids naming one.
- **Viram's version:** no pause after the exhale (APMB's brief one is dropped); the upper chest “lifts a little,” reflecting APMB's note that the clavicular part is dropped once learned.

**Rhythm.** in 4 · out 6 is a 10 s breath, six a minute, the most-studied slow pace (as for Visama Vritti). APMB's “5–10 rounds, build to 10 minutes” sits comfortably around a 5-minute default.

**Take care basis.**
- Overbreathing lowers CO₂ and causes lightheadedness and tingling (Cleveland Clinic, as in the general Take care), hence “fill comfortably, never to the limit.”
- APMB: no strain; shoulders and collarbones rise only slightly; not to be practised continually. Hence “keep your shoulders and neck soft” and “the upper chest lifts only a little.”
- No condition-specific contraindication was found in APMB or Ramacharaka.

**Evidence**

| Study | Design | Finding |
|---|---|---|
| Klinsophon 2020, *J Addict Nurs* · PMID 33264199 | Within-subject, 24 smokers abstaining 15 h; control, controlled deep breathing, and three-part breathing on separate days | Three-part breathing gave lower negative affect than control **and** than deep breathing, immediately after. The abstract also reports high-frequency HRV “significantly reduced” across the 30-minute session without saying in which condition; **full text not read**. |
| Klinsophon 2022, *J Bodyw Mov Ther* · PMID 36180143 | Cluster-randomized trial, 43 smokers in 8 companies, 12 weeks, 6-month follow-up | **Null:** no difference in abstinence vs counselling alone; cravings, withdrawal, and affect improved within both groups. |
| Kwon 2026, *Complement Ther Med* · PMID 41482169 | Systematic review, 48 RCTs of diaphragmatic breathing | Protocols very heterogeneous (2–10 breaths/min, 3–45 min); only about 2% of outcomes at low risk of bias; benefits reported for anxiety and some conditions; safety underreported, no serious adverse events. |
| Laborde 2022 · PMID 35623448 (existing) | Meta-analysis, 223 studies | Slow breathing raises vagally mediated HRV. |

Also reviewed:
- Hopper 2019 (PMID 31436595): JBI systematic review of diaphragmatic breathing for stress; only three studies qualified (one RCT); no pooling.
- Ma 2017 (PMID 28626434): 40 adults, 20 sessions over 8 weeks of feedback-guided diaphragmatic breathing at about 4/min; lower negative affect and cortisol and better sustained attention vs no training. Not three-part, and not unguided.
- Yildiz 2022 (PMID 35764793): 18 adults in MRI; abdominal, diaphragmatic, and chest breathing (together “three-part breath”) increased cerebrospinal fluid movement during the breath. Physiology only, no health outcome.

**Summary:** almost no research on the three-part breath itself: one small single-session study (positive for mood) and one small trial (null for quitting smoking). Belly-breathing trials are numerous but low in quality. What people feel is most plausibly slow breathing.

### Udgeeth · Om on the exhale

**Classical sources** (Chandogya Upanishad, Max Müller 1879; verses read)
- **1.1.1:** meditate on the syllable Om, called the *udgitha*, because the udgitha (the chanted portion of the Sama Veda) begins with Om. Müller's note: Om connected with the Sama Veda is called udgitha; its usual name is *pranava*.
- **1.1.5:** the Rik is speech, the Saman is breath, the udgitha is Om; speech and breath are joined in Om (1.1.6).
- **1.2.7:** after trying the senses and the mind, the gods meditated on the udgitha as the breath in the mouth, which the demons could not pierce.
- **Fair link:** the Upanishad ties Om, chant, and breath together. **Overstated:** “Udgeeth pranayama is described in the Upanishads.” The text is about meditation on the chanted syllable in Vedic ritual, not a breathing exercise with counts.

**Teaching sources**
- Udgeeth as a named pranayama (a long Om on each exhale, usually closing a pranayama sequence) is **modern**. It is widely attributed to Swami Ramdev's seven-pranayama sequence (Patanjali Yogpeeth). **Unverified — owner to confirm** from a primary source (e.g. Ramdev's own pranayama book); only secondary web pages were found, so the copy says only “modern, and popular in India.”
- Secondary descriptions differ on the O-to-M balance (a long O and short M, or roughly equal). The draft says “an open O that closes into a hum” and doesn't fix a ratio.
- APMB was searched and has no Om-chanting pranayama.

**Rhythm.** in 4 · Om 8 is a 12 s breath, 5 a minute, identical to Bhramari (a long voiced exhale naturally runs about twice the inhale). Bernardi 2001 found spoken mantra recitation settled at about 5.7 breaths/min without instruction; trained chanters in Hotho 2022 took about 20 s per Om (3/min), which is too long for a gentle default.

**Take care basis.**
- Vocal or throat strain: keep the volume low (judgment, by analogy with Satyananda's “soft, steady” Bhramari hum and the Ujjayi throat cautions).
- “Skip it with a blocked nose or a sore throat”: **judgment**, by analogy with Bhramari (APMB: skip with ear or nose infection). No source was found specific to Om chanting.
- Om is sacred in Hindu, Buddhist, and Jain practice. Offering a plain hum respects users who don't want to chant it; the hum keeps the same breath shape. This is an **owner decision** (open question 5).
- Seated only, as for Bhramari.

**Evidence**

| Study | Design | Finding |
|---|---|---|
| Bernardi 2001, *BMJ* · PMID 11751348 | Within-subject, 23 healthy adults | Reciting a yoga mantra (“om-mani-padme-om”) or the rosary aloud slowed breathing to about 6/min and raised baroreflex sensitivity. The effect followed the 6/min rhythm, not the words. Not a single Om, and no health outcome. |
| Inbaraj 2022, *Int J Yoga* · PMID 35444369 | 19 yoga practitioners vs 17 yoga-naive; 5 min of loud Om | High-frequency HRV rose more in experienced practitioners. **No non-chanting or slow-breathing control.** |
| Laborde 2022 · PMID 35623448 (existing) | Meta-analysis | Slow breathing raises HRV; the likely source of what people feel. |

Also reviewed:
- Hotho 2022 (PMID 35620613): 9 trained speech practitioners; Om at about 3 breaths/min strongly synchronized heart rate, blood pressure, and breathing. Physiology only.
- Kalyani 2011 (PMID 21654968): pilot fMRI, 12 people; limbic deactivation during audible Om vs rest, none for “ssss.” The authors' comparison with vagus nerve stimulation is speculation.
- Anjana 2022 (PMID 36375220): 80 people with hypertension; Om chanting plus yoga nidra vs usual care over 2 months lowered BP and LDL. Combined intervention, unblinded, no active control.
- Mooventhan 2025 (PMID 40064007): narrative (not systematic) review of 21 articles, uniformly positive; no quality appraisal.
- Bhoot 2025 (PMID 41395351): *listening* to recorded Om, not chanting; not applicable.
- No study was found comparing Om chanting with plain slow breathing, or silent exhale, at the same pace (PubMed search, September 28, 2026). The research copy's “hasn't been compared” rests on this search.

**Summary:** small, mostly Indian studies without active controls. Chanting slows the breath to around the resonance pace on its own, which likely explains most of the reported effects. The copy says so.

### Chandra Bhedana · in left, out right

**Classical sources**
- **HYP 2.44** (Sinh): the eight kumbhakas are Surya Bhedana, Ujjayi, Sitkari, Sitali, Bhastrika, Bhramari, Murchha, and Plavini. **No Chandra Bhedana.**
- **HYP 2.48–50:** Surya Bhedana is in through the right nostril, hold, out through the left, said to clear the frontal sinuses and vata disorders. Pancham Sinh adds a note (not in the verse) that it is done “alternately... and vice versa,” which is one reason some later readers treat the moon version as implied. The Jyotsna reading usually given is right-in every time; **owner to confirm** if this matters.
- **HYP 2.7–8** (nadi shodhana): Sinh glosses *chandra* as the left nostril and *surya* as the right. This is the basis for “left is linked with the moon.”
- **GS 5.46 (Vasu numbering):** eight kumbhakas, namely Sahita, Surya-bheda, Ujjayi, Sitali, Bhastrika, Bhramari, Murchha, and Kevali. **No Chandra.** **GS 5.58–68:** Surya-bheda with jalandhara and a long hold; “the air is always inspired” through the right.
- **Hatharatnavali 2.5–6** (Gharote et al. 2002 ed.): eight kumbhakas, Surya-bhedana among them, **no Chandra-bhedana**. Chapter number inferred from the copy read; **owner to confirm**.
- Not checked: *Kumbhaka Paddhati* (17th c.), which describes many more kumbhakas and might include a moon form. **Unverified.** The copy therefore says “later teaching,” not “no classical text.”

**Teaching sources**
- **Iyengar, *Light on Pranayama* ch. 27, “Surya bhedana and chandra bhedana pranayama”** (chapter title verified from the table of contents). Chandra Bhedana is commonly described as the mirror of Surya Bhedana: in left, out right. **The chapter's contents (holds, cautions, stages) are unverified — owner to confirm against print.**
- **Satyananda (APMB):** has Surya Bheda only, and his version is in **and out** through the right, which differs from HYP. It is contraindicated for heart disease, hypertension, epilepsy, and anxiety, and to be done under a teacher. No Chandra Bheda.
- **Bhavanani (Gitananda tradition), as used in the 2014 study:** Chandra Bhedana is in left and out right, using nasika mudra, at 5–6 breaths/min.
- **Distinct practices, don't confuse:** *Chandra nadi* or *chandra anga* pranayama is in **and** out through the left only; much of the “left nostril” research is this, not Chandra Bhedana.
- **Hand position:** the same as Nadi Shodhana (Viram offers both folding and resting the two fingers), so users learn one hand shape.

**Rhythm.** in 4 left · out 6 right is 10 s, 6 a minute, the same per-breath timing as Nadi Shodhana's half-round and inside Bhavanani's 5–6/min. No holds (HYP and GS forms have long holds).

**Take care basis.** The same as Nadi Shodhana: skip it with a blocked nose, a cold, or sinus pain (APMB, for nostril practices), don't force air through a nostril, use a light touch, and stop if the rhythm can't be kept (HYP 2.9, 2.15–17). Popular teaching often adds “avoid with low blood pressure or low mood, or in cold weather” for Chandra Bhedana, on the traditional idea that the moon side cools. **Not found in any verified source, so left out**; see open question 3.

**Evidence**

| Study | Design | Finding |
|---|---|---|
| Bhavanani 2014, *Int J Yoga* · PMID 25035609 | Crossover, 20 yoga-trained adults, six conditions on six days, 9 rounds each at 5–6/min | After Chandra Bhedana (in left, out right), heart rate and systolic BP fell; right-initiated forms raised them; normal breathing changed nothing. **No slow-breathing control at the same pace**; small; mixed health status; nasal dominance not measured. |
| Raghuraj &amp; Telles 2008, *Appl Psychophysiol Biofeedback* · PMID 18347974 | Crossover, 21 experienced men, 30 min per practice | Left-nostril breathing lowered systolic and mean BP; right-nostril breathing raised BP. Left-only breathing, not in-left-out-right. |
| Nivethitha 2016, *Anc Sci Life* · PMID 28446827 | Narrative review | Slow techniques generally beneficial; results for specific-nostril breathing **inconsistent**, and the mechanisms unclear. |
| Vanutelli 2024, *Brain Sci* · PMID 38671954 | Pilot, 20 people, 8 days of right- or left-only breathing | **Right**-nostril breathing gave more stress reduction and relaxation; left reduced mind-wandering. Contrary to the tradition that the left calms. |

Also reviewed:
- Bhavanani 2012 (PMID 22869993): 22 people with hypertension, 27 rounds left-only at 6/min; HR and systolic BP fell; no control.
- Pal 2014 (PMID 24741554): 85 students, 1 h a day for 6 weeks; left-only breathing shifted HRV toward parasympathetic and right-only toward sympathetic; groups “divided,” randomization unclear.
- Santhanam Kumar 2020 (PMID 32344403): pilot RCT, 20 people; 15 min of left-only breathing was **no different** from breath awareness on cognition.
- Price &amp; Eccles 2016 (PMID 27477330): review of theories linking nasal airflow to brain activity.
- Bhavanani co-authors two of these; most come from a few Indian groups.

**Summary:** one small crossover study tests exactly this practice; the wider one-nostril literature is small, short, and inconsistent, and no study compares it with slow two-nostril breathing at the same pace.

### Cyclic sighing

**Origins (modern; no classical source)**
- Spontaneous sighs are deeper breaths that occur every few minutes and reinflate collapsed air sacs (Li 2016, a mouse study of the brainstem sigh circuit, PMID 26855425). Vlemincx 2013 (PMID 23261937) proposes that sighs act as a psychophysiological “reset” (a model, not a trial).
- **Balban 2023 protocol** (PMC full text): inhale slowly through the nose; once the lungs are expanded, inhale once more to fill them fully; then exhale slowly and fully. 5 min a day, **self-paced (no fixed counts)**. The PMC summary read describes the mouth exhale as flexible; **owner to confirm** in the methods before keeping the “exhale through your nose instead” Take care item.
- **Stanford Medicine news, February 9, 2023** (Hadley Leggett, “‘Cyclic sighing’ can help breathe away anxiety”): nose inhale, a second deeper inhale, slow mouth exhale until empty, about five minutes a day; the study excluded people with moderate to severe psychiatric conditions. A search snippet dated it February 10; the page itself shows February 9.
- Popular name: “physiological sigh” (Huberman). Used only as a search alias.

**Rhythm.** Balban was self-paced, so Viram's 3 · top up 1 · out 6 is **a pacing choice, not a replication**. It keeps the exhale longer than the combined inhale (4 : 6) at 6 breaths/min. A search result attributed a 1 : 2 ratio to a Stanford write-up; **not verified**. A 3 · 1 · 8 pattern would give 1 : 2 at 5/min (open question 6). The 1 s top-up needs its cue clip to be ≤ 0.8 s, or the tone plays instead (FR-03); `voice.ts` already sets 0.8 s.

**Take care basis.**
- Overbreathing (Cleveland Clinic): a large double inhale repeated for 5 minutes could over-ventilate if breaths are big or fast. Hence “keep the top-up small, the exhale unhurried,” and the tingling item.
- Deliberate single sighs briefly raise heart rate and blood pressure (Muzumdar 2026; Vaschillo 2015). This isn't a risk at gentle volumes, but it supports “gentle, not forced.”
- Stanford excluded people with moderate to severe psychiatric conditions. The general first-use Take care already covers “if focusing on your breath makes you more anxious, stop.”

**Evidence**

| Study | Design | Finding |
|---|---|---|
| Balban 2023, *Cell Rep Med* · PMID 36630953 (existing) | Remote RCT, 108 enrolled; cyclic sighing 30 randomized, 27 analysed; 5 min/day for 28 days vs box breathing, cyclic hyperventilation, and mindfulness | Positive affect rose more than with mindfulness, and resting respiratory rate fell more. **State anxiety and negative affect: no difference from mindfulness. Heart rate and HRV: no change in any arm.** Remote, self-reported adherence, retrospectively registered; one author advises WHOOP. |
| Riedl 2026, *Anxiety Stress Coping* · PMID 42002307 | Preregistered pilot, 47 students, 1-min exercises during real-life stress moments | Both cyclic sighing and box breathing lowered state anxiety vs a passive control; reaction times were **slower** afterwards. |
| Hanley 2025, *J Behav Med* · PMID 39904867 | Single-site pilot RCT, orthopaedic x-ray waiting room, 4 min | Lower pain intensity and unpleasantness vs a time- and attention-matched injury-management control; **anxiety and depression no different**. Sample size not in the abstract. |

Also reviewed:
- Jones 2026 (PMID 41839180): RCT, 62 cadets after maximal exercise; cyclic sighing and box breathing both sped high-frequency HRV recovery vs spontaneous breathing.
- Muzumdar 2026 (PMID 41546440), Vaschillo 2015 (PMID 25720947): paced single sighs (one every 15–50 s) produce sympathetic-type cardiovascular responses; a different pattern from cyclic sighing, but relevant to “gentle.”

**Summary:** one small-per-arm, month-long trial showing a mood benefit over mindfulness but no anxiety or HRV advantage, plus brief pilot studies. Nothing long-term, and nothing in clinical anxiety.

---

### Proposed pronunciation rows (for the lexicon table)

| Term | Devanagari | Respelling (shown in app) | IPA target (proposed) | Lexicon alias | Listener note |
|---|---|---|---|---|---|
| Dirgha | दीर्घ | DEER-guh | ˈd̪iːrɡʱə | Deer-guh | Breathy gh simplified to g. Hindi speech often drops the final vowel (“deergh”). |
| Udgeeth | उद्गीथ | ood-GEET | ʊd̪ˈɡiːt̪ʰ | Ood-geet | Final *th* is an aspirated dental t, **not** English “th”; the respelling avoids “th” for that reason. Sanskrit keeps a final vowel (*udgitha*, ood-GEE-tuh); Viram follows the Hindi “Udgeeth” the PRD uses. |
| Chandra Bhedana | चन्द्र भेदन | CHUN-druh BAY-duh-nuh | ˈt͡ʃən̪d̪rə ˈbʱeːd̪ənə | Chun-druh Bay-duh-nuh | Breathy bh simplified to B, as for Bhramari. Some say “CHAHN-druh.” |

All three pass the respelling and Devanagari rules in `check-content.mjs`.

### Voice notes

- `om` (“Om”) plays on each Udgeeth exhale; `top-up` (“Top up”) on the 1 s step, so its clip must measure ≤ 0.8 s, or a tone plays.
- Cyclic sighing's exhale speaks “Out through the mouth” on round 1 and “Exhale” after, as 4-7-8 does. The screen shows the route every round.
- Chandra Bhedana uses the existing “Inhale left” and “Exhale right” phrases on every breath.
- New clips: `name.dirgha`, `name.udgeeth`, `name.chandra-bhedana`, plus `intro.*` and `intro-long.*` for all four. Short introductions run 45–56 words; long ones 87–116.

---

## General Take care · proposed for first use and Settings → Safety & wellbeing

These apply to every practice, so technique pages keep only the specific points.

| Guidance | Basis |
|---|---|
| Stop and breathe normally if you feel dizzy, tingly, short of breath, or anxious. | Overbreathing lowers CO₂ and causes lightheadedness and tingling ([Cleveland Clinic](https://my.clevelandclinic.org/health/diseases/hyperventilation)). |
| Chest pain, fainting, or a pounding heart with dizziness: stop and get medical help. | [British Heart Foundation](https://www.bhf.org.uk/informationsupport/heart-matters-magazine/wellbeing/breathing-exercises) |
| Don't practise while driving or operating machinery. | [Torbay and South Devon NHS Foundation Trust](https://www.torbayandsouthdevon.nhs.uk/services/pain-service/reconnect2life/creating-skills-for-the-future/learning-relaxation-skills/) |
| Never practise breath holds in or near water, including the bath. | Hyperventilation and breath-holding blackouts ([CDC MMWR 2015;64(19)](https://www.cdc.gov/mmwr/preview/mmwrhtml/mm6419a3.htm)) |
| Living with a heart or lung condition, or pregnant? Check with your clinician first, especially before holds. | BHF; teacher sources advise against retention in pregnancy. |
| If focusing on your breath makes you more anxious, stop. That happens to some people and is normal. | Relaxation-induced anxiety (Heide &amp; Borkovec 1983, PMID 6341426) |
| Breathing practice is not a treatment and doesn't replace medical care. | Mütze 2025 (PMID 40896223); PRD framing rules |

A 2024 review of 73 supervised RCTs in serious respiratory illness reported no adverse events from breathing techniques (Burge 2024, PMID 39477355). Safety reporting in breathwork trials is sparse overall, though: only 4 of 26 RCTs in Fincham's meta-analysis actively reported it.

---

## Voice

### Cue inventory

Generated once, measured, and bundled. A step shorter than its cue plus 0.2 s plays its tone instead (FR-03).

| Clip | Script | Longest | Plays on |
|---|---|---|---|
| `cue.inhale` | Inhale | 0.8 s | Inhale steps without a side (and mouth inhales after round 1) |
| `cue.hold` | Hold | 0.8 s | Hold steps |
| `cue.exhale` | Exhale | 0.8 s | Exhale steps without a side (and mouth exhales after round 1) |
| `cue.rest` | Rest | 0.8 s | Rest steps (the pause after exhaling) |
| `cue.hum` | Hum | 0.8 s | Bhramari exhale |
| `cue.inhale-left` / `-right` | Inhale left / Inhale right | 1.2 s | Nadi Shodhana (Chandra Bhedana in v1.1) |
| `cue.exhale-left` / `-right` | Exhale left / Exhale right | 1.2 s | Nadi Shodhana |
| `cue.inhale-mouth` | In through the mouth | 1.6 s | Sheetali, round 1 |
| `cue.exhale-mouth` | Out through the mouth | 1.6 s | 4-7-8, round 1 (cyclic sighing in v1.1) |

Plus one `name.<id>` clip per Sanskrit name (six) and one `intro.<id>` clip per technique (eight). The introduction scripts are the `introduction.lines` in `library.ts`, 44–61 words each, about 20–30 seconds at a calm pace, well under the brand's 40-second limit. Each line is also its caption.

### Production direction (proposed)

- **One voice** throughout: calm, warm, unhurried, neutral English. No music bed, no whisper, no performance.
- **Cue words:** spoken plainly with falling intonation, as instructions rather than questions. Generate 3–5 takes and choose by ear.
- **Timing:**
  - Trim leading silence to about 30 ms so each cue lands on the step boundary.
  - Keep trailing silence short.
  - Record each clip's measured length in the build manifest, and fail the build if a clip exceeds its limit.
- **Levels:** normalize every clip to the same loudness (about −16 LUFS integrated for speech on phones) so cues, names, and introductions match the cue-volume setting.
- **Format:** mono AAC or M4A at 64–96 kbps. Keep the lossless masters with the release evidence.
- **Keep with the release evidence:** the generation settings (model, voice ID, stability and similarity values), the lexicon version, and the listener approvals.

### Pronunciation

| Term | Devanagari | Respelling (shown in app) | IPA target | Lexicon alias | Listener note |
|---|---|---|---|---|---|
| Viram | विराम | vee-RAHM | ʋɪˈraːm | Vee-rahm | |
| Sama Vritti | सम वृत्ति | SUH-muh VRIT-tee | ˈsəmə ˈʋrɪt̪ːiː | Summuh Vrit-tee | Hindi speech often shortens *sama* to “sum”; *vritti* is “vrutti” in Marathi and South Indian speech. Choose one. |
| Visama Vritti | विषम वृत्ति | VISH-uh-muh VRIT-tee | ˈʋɪʂəmə ˈʋrɪt̪ːiː | Vish-uh-muh Vrit-tee | ṣ is usually said as “sh.” |
| Nadi Shodhana | नाडी शोधन | NAH-dee SHOH-duh-nuh | ˈnaːɖiː ˈʃoːd̪ʱənə | Nah-dee Show-duh-nuh | Retroflex ḍ; breathy dh. |
| Bhramari | भ्रामरी | BRAH-muh-ree | ˈbʱraːməriː | Brah-muh-ree | Breathy bh; the respelling simplifies it to B. |
| Ujjayi | उज्जायी | ooj-JAH-yee | ʊd͡ʒˈd͡ʒaːjiː | Ooj-jah-yee | Many studios say “oo-JAI-ee.” Viram follows the Sanskrit. |
| Sheetali | शीतली | SHEE-tuh-lee | ˈʃiːt̪əliː | Shee-tuh-lee | Dental t. |
| Sheetkari | शीत्कारी | sheet-KAH-ree | ʃiːt̪ˈkaːriː | Sheet-kah-ree | Appears in the Sheetali how-to text only; no clip. |
| pranayama | प्राणायाम | prah-nah-YAH-muh | praːɳaːˈjaːmə | prah-nah-yah-muh | For future scripts. |

Stress follows the usual Sanskrit rule: the second-to-last syllable if it is heavy, otherwise the one before it. The respellings avoid diacritics because the bundled fonts lack the IAST underdot letters.

### ElevenLabs notes (checked September 2026)

- **Lexicons:**
  - Dictionaries are W3C PLS files.
  - **Alias** rules work on every model. **Phoneme** (IPA or CMU) rules work only on `eleven_flash_v2` and `eleven_v3`; other models, including `eleven_multilingual_v2`, ignore them.
  - Up to three dictionaries per request, applied in order.
  - Matching is case-sensitive.
  - Inline SSML `<phoneme>` works only on `eleven_flash_v2`; `eleven_v3` reads inline IPA between slashes, less consistently.
  - Sources: [pronunciation dictionaries](https://elevenlabs.io/docs/eleven-api/guides/how-to/text-to-speech/pronunciation-dictionaries), [text-to-speech API](https://elevenlabs.io/docs/api-reference/text-to-speech/convert), [best practices](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices).
- **Licence:**
  - The free plan is non-commercial. All paid plans include a commercial licence, except output from Beta features.
  - Rights to audio generated while subscribed continue after cancelling.
  - Nothing found forbids bundling pre-generated clips in a free app, but the terms don't address it explicitly, so confirm when buying.
  - Sources: [help centre](https://elevenlabs.io/docs/help-center/legal/can-i-publish-the-content-i-generate-on-the-platform), [terms](https://elevenlabs.io/terms-of-use).
- **Voice choice:** Voice Library voices can be withdrawn by their creators after a notice period ([addendum](https://elevenlabs.io/vla)). Keep the generated masters, and prefer a default or owned voice so a regeneration is possible.

### Listener checklist (every clip, before release)

1. Each Sanskrit name matches the chosen pronunciation; record the listener's choice for each open note above.
2. Cue words are calm, clear, and consistent in tone and loudness. No clip sounds rushed or robotic.
3. Side phrases are unmistakable: “left” and “right” can't be confused at low volume or through phone speakers.
4. Introductions follow their captions word for word.
5. Record approval (listener, language background, date, lexicon version, clip manifest hash) with the release evidence. Voice gate: at least 8 listeners, median 4/5 or better for calm and pace (PRD).

---

## Source check

The PRD requires each draft to be checked against its listed sources before release, with the check recorded with the content version.

| Source | Check | Result for content v1 |
|---|---|---|
| 22 cited studies | Europe PMC API, September 23, 2026: authors, year, title, journal, DOI | All match `sources.ts` |
| HYP (Pancham Sinh 1914, archive.org scan) | Verses 2.7–2.12, 2.15–2.17, 2.19–20, 2.44, 2.51–58, 2.68 read; numbering checked against the Sanskrit | Matches the copy |
| GS (Vasu) | 5.36–55, 5.69–74, 5.78–82 read | Matches; numbering differs between editions |
| Yoga Sutras 2.50 (Woods 1914) | Sutra and Vyasa commentary read | Supports the “time and count” link only |
| *Light on Pranayama*, APMB, *The Heart of Yoga* | Read in copies during research; chapters and approximate pages noted | **Pending:** confirm the paraphrased points against print copies before release |
| AYUSH Common Yoga Protocol (2019) | Nadi Shodhana, Sheetali, and Bhramari sections read | Matches the copy |
| Weil Center, NHS, BHF pages | Pages load (HTTP 200); titles and dates recorded | Matches |
| TIME (Divine 2016) | Blocks automated requests (HTTP 406) | **Pending:** open once in a browser |

## Open questions for the owner

1. **Coherent breathing name.** COHERENCE LLC states that “Coherent Breathing” is its registered trademark. Using it as a practice name, and as a store keyword, carries risk. Options:
   - Keep it and ask the trademark attorney during the Viram clearance.
   - **Rename to “Resonance breathing” (recommended)**, the research term, and mention Elliott's Coherent Breathing in the context text, as it does now.
   - Choose another descriptive name, such as “Slow, even breathing.”

   Renaming touches the id (`coherent`), the PRD, the plan, the UX mocks, and the store keywords.
2. **Book check:** confirm the Iyengar and Satyananda points against print copies (about an hour with the page references above).
3. **Instructor review (optional):** a named review isn't required for gentle techniques. If one happens, the most useful focus is Nadi Shodhana hand positions, Bhramari ear closure, and the Sheetali cautions. Record it in `review` to show “Reviewed by.”
4. **Pronunciation choices** for the listener (Sama, Vritti, Ujjayi; see the table).
5. **v1.1 progression paths still fit the research:**
   - Visama Vritti and Nadi Shodhana move toward the classical 1 : 2 exhale.
   - Ujjayi goes to 6 · 6.
   - Sama Vritti goes to 6 · 6 · 6 · 6. Iyengar would build the holds last, so the path should lengthen inhale and exhale before the holds.

### v1.1 library additions

1. **Chandra Bhedana classical status.** Verified: HYP 2.44, GS 5.46 (Vasu), and Hatharatnavali 2.5–6 list only Surya Bhedana. Not checked: *Kumbhaka Paddhati*. The copy says the moon version “comes from later teaching, including B.K.S. Iyengar's.” Confirm this in *Light on Pranayama* ch. 27 (only the chapter title was verifiable), and note there whether Iyengar gives cautions or a hold-free stage.
2. **Book checks against print copies:** APMB “Yogic breathing” (p. 383 per the copy's index) and Surya Bheda (p. 416); *Light on Pranayama* ch. 27; Hatharatnavali chapter number. The Nadi Shodhana entry cited *Light on Pranayama* “ch. 22–23”; the table of contents has ch. 22 “Digital pranayama and the art of placing the fingers on the nose,” ch. 23 Bhastrika and Kapalabhati, and ch. 28 “Nadi sodhana pranayama,” so it now cites ch. 22 and 28. Confirm the page references against print.
3. **Chandra Bhedana cautions.** Popular teaching adds “avoid with low blood pressure, low mood, or in cold weather” (the moon side said to cool). No verified source was found, so it's left out. Add it only if Iyengar ch. 27 supports it.
4. **Udgeeth attribution.** Is it fine to leave Swami Ramdev unnamed (“modern, and popular in India”)? Naming him needs a primary source. Also confirm “Udgeet” and “Udgitha” as search aliases.
5. **Om and inclusivity.** The draft offers “hum instead” for people who'd rather not chant Om, and the voice still says “Om.” Keep it, or drop it as unnecessary?
6. **Cyclic sighing ratio.** Balban was self-paced; the PRD's 3 · 1 · 6 is Viram's pacing (4 : 6). A 1 : 2 pattern (3 · 1 · 8, 5/min) may be closer to how Stanford describes it, but the “1 : 2” attribution is unverified. Keep the PRD default?
7. **Mouth exhale alternative** (cyclic sighing Take care: “breathe out slowly through your nose instead”) relies on a PMC summary saying Balban's mouth exhale was flexible. Confirm in the paper's methods, or remove the item.
8. **Subtitles.** Proposed: “Three-part breath,” “Om on the exhale,” “In left, out right,” and “Double inhale, long exhale.” For Chandra Bhedana, the alternative “Moon breath” matches the Sanskrit but is less descriptive.
9. **Family for Dirgha and Udgeeth.** Both are marked `classical` because they have Sanskrit names and need pronunciations (FR-09), even though both named practices are modern. Their context copy says so, as Sama Vritti's does. Alternatively they could be `modern`, but then the check wouldn't require a pronunciation. Confirm.
10. **Pronunciations for the listener:** Udgeeth (Hindi ood-GEET vs Sanskrit ood-GEE-tuh; aspirated t), Dirgha (final vowel), Chandra (CHUN vs CHAHN).
11. **Chandogya source date** “c. 8th–6th century BCE” is a conventional scholarly range, not from the translation. Confirm the wording, or use “c. 1st millennium BCE.”
12. **Klinsophon 2020 HRV detail:** the abstract says high-frequency HRV was “significantly reduced throughout the 30-minute session” without naming the condition. The research copy doesn't mention HRV for that study; the full text would settle it.
