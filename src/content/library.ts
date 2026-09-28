/**
 * The v1.0 practice library. Copy is original, drafted from the sources each
 * technique lists; the research record is docs/content/technique-research.md.
 * Bump a technique's contentVersion whenever its steps or copy change.
 */
import type { Technique } from './types';

export const LIBRARY: Technique[] = [
  {
    id: 'sama-vritti',
    contentVersion: 1,
    riskTier: 'gentle',
    shareable: true,
    family: 'classical',
    name: 'Sama Vritti',
    subtitle: 'Box breathing',
    pronunciation: { devanagari: 'सम वृत्ति', respelling: 'SUH-muh VRIT-tee', clip: 'name.sama-vritti' },
    practice: {
      steps: [
        { kind: 'inhale', seconds: 4, caption: 'In through the nose, slow and even.' },
        { kind: 'hold', seconds: 4, caption: 'Pause at the top. Keep your throat soft.' },
        { kind: 'exhale', seconds: 4, caption: 'Out through the nose, just as slowly.' },
        { kind: 'rest', seconds: 4, caption: 'Pause, empty and easy.' },
      ],
      increment: 1,
      target: { minutes: 5 },
      posture: 'seated-or-lying',
      progression: { steps: [[5, 5, 5, 5], [6, 6, 6, 6]], prompt: 'Try one second longer on every step next time?' },
    },
    guidance: {
      lead: 'Four equal steps: breathe in, pause, breathe out, pause. An even count gives a busy mind something simple to follow.',
      takeCareShort: 'Keep the holds easy. If one feels tight, shorten it or set it to Off.',
      howTo: [
        'Sit upright, or lie down with your head supported. Let your shoulders drop.',
        'Breathe through your nose for every step.',
        'Inhale for 4, without straining to fill up.',
        'Hold for 4 with your throat soft. Don’t clamp your throat or bear down.',
        'Exhale for 4, smooth and unhurried, then rest for 4 before the next breath.',
        'If the holds feel tight, shorten them or turn them off in Adjust rhythm.',
      ],
      context:
        'Sama vritti means “even movement.” The Yoga Sutras describe regulating the breath by time and count, and B.K.S. Iyengar taught equal counts gradually: first an even inhale and exhale, then a pause after the inhale, and only later a pause after the exhale. The same four-count pattern spread through military and police training as “box breathing.”',
      takeCare: [
        'Holds should feel easy. If one feels tight, shorten it or set it to Off.',
        'If holding your breath makes you uneasy, turn the holds off and breathe evenly instead.',
        'With high blood pressure, a heart or lung condition, or in pregnancy, set the holds to Off or check with your clinician first.',
        'Stop and breathe normally if you feel dizzy or short of breath.',
        'Never practice breath holds in or near water.',
      ],
      research:
        'In small, short studies, mostly with healthy students, box breathing eased anxiety within a session, and one trial found it softened the body’s stress response compared with normal breathing. In the largest head-to-head trial, it did no better than mindfulness meditation and didn’t change heart rate variability. There are no long-term studies. It is not a treatment.',
      basedOn: ['iyengar-pranayama', 'yoga-sutras', 'divine-time', 'balban-2023', 'mcallister-2026'],
      introduction: {
        clip: 'intro.sama-vritti',
        lines: [
          'Sit tall, or lie down with your head supported.',
          'Every step is four counts, all through the nose.',
          'Breathe in. Pause, with your throat soft. Breathe out. Pause, empty and easy.',
          'If a pause ever feels tight, let the breath go and carry on gently.',
          'We’ll begin with an inhale.',
        ],
        long: {
          clip: 'intro-long.sama-vritti',
          lines: [
            'Sit upright, or lie down with your head supported. Let your shoulders drop, and let your jaw soften.',
            'This is box breathing: four equal steps, all through the nose.',
            'Breathe in for four, without straining to fill up.',
            'Pause for four, with your throat soft. Nothing clamps or bears down.',
            'Breathe out for four, smooth and unhurried. Then rest for four before the next breath.',
            'The count stays the same all the way through. Let it carry you, rather than holding on to it.',
            'If a pause ever feels tight, let the breath go and carry on gently. You can shorten the pauses, or turn them off, whenever you like.',
            'We’ll begin with an inhale.',
          ],
        },
      },
    },
    review: null,
  },
  {
    id: 'visama-vritti',
    contentVersion: 1,
    riskTier: 'gentle',
    shareable: true,
    family: 'classical',
    name: 'Visama Vritti',
    subtitle: 'Extended exhale',
    pronunciation: { devanagari: 'विषम वृत्ति', respelling: 'VISH-uh-muh VRIT-tee', clip: 'name.visama-vritti' },
    practice: {
      steps: [
        { kind: 'inhale', seconds: 4, caption: 'In through the nose, soft and easy.' },
        // Holds start Off; Adjust rhythm can add short ones within the 20 s cap.
        { kind: 'hold', seconds: 0, caption: 'Pause at the top, throat soft.' },
        { kind: 'exhale', seconds: 6, caption: 'Out through the nose, slow and unhurried.' },
        { kind: 'rest', seconds: 0, caption: 'Pause, empty and easy.' },
      ],
      increment: 1,
      target: { minutes: 5 },
      posture: 'seated-or-lying',
      progression: { steps: [[4, 0, 7, 0], [4, 0, 8, 0]], prompt: 'Try a slightly longer exhale next time?' },
    },
    guidance: {
      lead: 'A breath where the exhale is longer than the inhale. Viram starts with the gentlest form: in for 4, out for 6, with no holds.',
      takeCareShort: 'Keep breaths soft. If the next inhale feels rushed, shorten the exhale.',
      howTo: [
        'Sit upright or lie down, and let your jaw and shoulders soften.',
        'Breathe in through your nose for 4.',
        'Breathe out through your nose for 6, slow and smooth, without pushing the air out.',
        'Keep the breaths soft rather than big.',
        'If you find yourself gasping for the next breath, shorten the exhale in Adjust rhythm.',
      ],
      context:
        'Visama vritti means “uneven movement”: steps of different lengths. B.K.S. Iyengar taught it with long holds in ratios such as 1:4:2, and only under a teacher’s eye; the Gheranda Samhita counts a similar ratio. Viram keeps just the lengthened exhale, a gentle, hold-free form closer to modern teaching.',
      takeCare: [
        'Keep the breaths soft. Big breaths can make you lightheaded.',
        'If the next inhale feels rushed, shorten the exhale.',
        'Stop and breathe normally if you feel dizzy or short of breath.',
        'The classical form adds long holds. Learn it from a teacher, not from an app.',
      ],
      research:
        'Breathing slowly, around six breaths a minute as here, reliably raises heart rate variability in the short term. Two small studies of this 4 · 6 pattern reported calmer readings and less anxiety, but neither had a comparison group. Whether the longer exhale adds anything beyond slowing down is mixed: some studies say yes, and the most careful recent one found no difference. It is not a treatment.',
      basedOn: ['iyengar-pranayama', 'desikachar', 'gheranda', 'nhs-breathing', 'van-diest-2014', 'magnon-2021', 'meehan-2024', 'laborde-2022'],
      introduction: {
        clip: 'intro.visama-vritti',
        lines: [
          'Sit comfortably, or lie down.',
          'Breathe in through your nose for four, and out through your nose for six.',
          'Let the exhale be slow and smooth. There’s no need to push the air out.',
          'Keep each breath soft rather than big.',
          'We’ll begin with an inhale.',
        ],
        long: {
          clip: 'intro-long.visama-vritti',
          lines: [
            'Sit upright or lie down, and let your jaw and shoulders soften.',
            'In this practice the exhale is a little longer than the inhale.',
            'Breathe in through your nose for four.',
            'Then breathe out through your nose for six, slow and smooth. There’s no need to push the air out; let it leave at its own pace.',
            'Keep each breath soft rather than big. The length of the exhale matters more than its size.',
            'If you find yourself gasping for the next breath, the exhale is too long for today. Shorten it, and carry on gently.',
            'We’ll begin with an inhale.',
          ],
        },
      },
    },
    review: null,
  },
  {
    id: 'nadi-shodhana',
    contentVersion: 1,
    riskTier: 'gentle',
    shareable: true,
    family: 'classical',
    name: 'Nadi Shodhana',
    subtitle: 'Alternate nostril breathing',
    aliases: ['Anulom Vilom'],
    pronunciation: { devanagari: 'नाडी शोधन', respelling: 'NAH-dee SHOH-duh-nuh', clip: 'name.nadi-shodhana' },
    practice: {
      steps: [
        { kind: 'inhale', seconds: 4, side: 'left', caption: 'Thumb closes the right nostril.' },
        { kind: 'exhale', seconds: 6, side: 'right', caption: 'Ring finger closes the left. Thumb lifts.' },
        { kind: 'inhale', seconds: 4, side: 'right', caption: 'Ring finger stays on the left.' },
        { kind: 'exhale', seconds: 6, side: 'left', caption: 'Thumb closes the right. Ring finger lifts.' },
      ],
      increment: 1,
      target: { minutes: 5 },
      posture: 'seated',
      progression: { steps: [[4, 7, 4, 7], [4, 8, 4, 8]], prompt: 'Try a slightly longer exhale next time?' },
    },
    guidance: {
      lead: 'Breathe through one nostril at a time, switching sides with your right hand. Slow, silent, and without holds.',
      takeCareShort: 'Skip it with a blocked nose. Stop if you feel dizzy.',
      howTo: [
        'Sit tall and rest your left hand on your knee.',
        'Fold the index and middle fingers of your right hand into your palm, or rest them lightly between your eyebrows.',
        'Your thumb closes the right nostril; your ring finger closes the left. A light touch is enough.',
        'Inhale left. Close left, open right. Exhale right.',
        'Inhale right. Close right, open left. Exhale left. That’s one round.',
        'Keep the breath slow and silent. When you finish, lower your hand and breathe through both nostrils.',
      ],
      context:
        'Nadi shodhana means “clearing the channels.” The Hatha Yoga Pradipika describes breathing in through one nostril and out through the other, with long holds, to purify the nadis, the body’s energy channels in yoga tradition. It is traditionally practiced before meditation, and many practitioners in India know it as Anulom Vilom. Teachers usually begin without holds, as Viram does.',
      takeCare: [
        'Breathe softly; never force air through a nostril.',
        'Skip it with a blocked nose, a cold, or sinus pain.',
        'If the exhale feels long, make it equal to the inhale in Adjust rhythm.',
        'Stop and breathe normally if you feel dizzy, anxious, or short of breath.',
      ],
      research:
        'Most studies are small, single sessions, and many come from one research group. A review of six trials found blood pressure fell modestly, but results varied widely. Findings for anxiety are mixed, and the one study that compared it with plain slow breathing at the same pace found similar effects. It is not a treatment.',
      basedOn: ['hyp', 'gheranda', 'iyengar-pranayama', 'satyananda-apmb', 'ayush-cyp', 'nam-2024', 'ghiya-lee-2012', 'kamath-2017'],
      introduction: {
        clip: 'intro.nadi-shodhana',
        lines: [
          'Sit tall and let your shoulders soften.',
          'Bring your right hand up. Your thumb rests by the right nostril, your ring finger by the left.',
          'You’ll breathe in on one side and out on the other. The voice names each side.',
          'Keep every breath slow and silent.',
          'We’ll begin with an inhale through the left.',
        ],
        long: {
          clip: 'intro-long.nadi-shodhana',
          lines: [
            'Sit tall and rest your left hand on your knee. Let your shoulders soften.',
            'Fold the first two fingers of your right hand into your palm, or rest them lightly between your eyebrows.',
            'Your thumb closes the right nostril. Your ring finger closes the left. A light touch is enough.',
            'Breathe in through the left. Close the left, open the right, and breathe out through the right.',
            'Then breathe in through the right. Close the right, open the left, and breathe out through the left. That’s one round.',
            'The voice names each side, so you can keep your eyes closed.',
            'Keep every breath slow and silent. If your nose is blocked, or you feel dizzy, stop and breathe normally.',
            'We’ll begin with an inhale through the left.',
          ],
        },
      },
    },
    review: null,
  },
  {
    id: 'bhramari',
    contentVersion: 1,
    riskTier: 'gentle',
    shareable: true,
    family: 'classical',
    name: 'Bhramari',
    subtitle: 'Humming bee breath',
    pronunciation: { devanagari: 'भ्रामरी', respelling: 'BRAH-muh-ree', clip: 'name.bhramari' },
    practice: {
      steps: [
        { kind: 'inhale', seconds: 4, caption: 'In through the nose, quietly.' },
        { kind: 'exhale', seconds: 8, cue: 'hum', caption: 'Lips closed. A soft, even “mmm” as you breathe out.' },
      ],
      increment: 1,
      target: { minutes: 5 },
      posture: 'seated',
    },
    guidance: {
      lead: 'Breathe in quietly, then hum softly all the way through the exhale. The long, even hum slows the breath and gives your attention a sound to rest on.',
      takeCareShort: 'Skip it with an ear or nose infection. Never press inside your ears.',
      howTo: [
        'Sit upright with your jaw loose. Close your lips softly and keep your teeth slightly apart.',
        'If you like, press the small flaps at the front of your ears gently with your index fingers. Or rest your hands in your lap.',
        'Breathe in through your nose for 4.',
        'Breathe out for 8 while humming a low, steady “mmm.” Feel it buzz in your face and head.',
        'Keep the hum soft. It doesn’t need to be loud.',
        'When you finish, sit for a few breaths and notice the quiet.',
      ],
      context:
        'Bhramari is named after the bhramara, a large black bee. The Hatha Yoga Pradipika lists it among eight classical breath practices, with a bee-like sound on both the inhale and the exhale. The Gheranda Samhita teaches it with the ears closed, listening for inner sounds. Modern teachers usually hum only on the exhale, as here, often before meditation.',
      takeCare: [
        'Skip it with an ear infection, or a blocked or infected nose.',
        'If you close your ears, press the flaps gently. Never put your fingers inside your ears.',
        'Practice sitting up rather than lying down.',
        'Stop and breathe normally if you feel dizzy or uncomfortable.',
      ],
      research:
        'Most studies are small, short, and from India. They generally report lower heart rate or blood pressure after practice, but a controlled trial in people with high blood pressure found no difference from ordinary slow breathing. Humming briefly raises nitric oxide in the nose; no study links that to health. It seems about as calming as other slow breathing. It is not a treatment.',
      basedOn: ['hyp', 'gheranda', 'satyananda-apmb', 'iyengar-pranayama', 'ayush-cyp', 'weitzberg-2002', 'trivedi-2023', 'ghati-2021', 'kuppusamy-2018'],
      introduction: {
        clip: 'intro.bhramari',
        lines: [
          'Sit tall, lips softly closed, teeth slightly apart.',
          'You can rest your index fingers on the small flaps at the front of your ears and press gently, or leave your hands in your lap.',
          'Breathe in quietly through your nose. Then hum, low and soft, for the whole exhale.',
          'Let the sound be easy, not loud.',
          'We’ll begin with an inhale.',
        ],
        long: {
          clip: 'intro-long.bhramari',
          lines: [
            'Sit upright with your jaw loose. Close your lips softly, and keep your teeth slightly apart.',
            'If you like, rest your index fingers on the small flaps at the front of your ears and press them gently. Never press inside your ears. Or leave your hands in your lap.',
            'Breathe in quietly through your nose for four.',
            'Then breathe out for eight while humming a low, steady sound. Feel it buzz softly in your face and head.',
            'The hum doesn’t need to be loud. Let it be easy.',
            'When you finish, sit for a few breaths and notice the quiet.',
            'We’ll begin with an inhale.',
          ],
        },
      },
    },
    review: null,
  },
  {
    id: 'ujjayi',
    contentVersion: 1,
    riskTier: 'gentle',
    shareable: true,
    family: 'classical',
    name: 'Ujjayi',
    subtitle: 'Ocean breath',
    pronunciation: { devanagari: 'उज्जायी', respelling: 'ooj-JAH-yee', clip: 'name.ujjayi' },
    practice: {
      steps: [
        { kind: 'inhale', seconds: 5, caption: 'In through the nose, with a soft sound in the throat.' },
        { kind: 'exhale', seconds: 5, caption: 'Out through the nose, the same soft sound.' },
      ],
      increment: 1,
      target: { minutes: 5 },
      posture: 'seated-or-lying',
      progression: { steps: [[6, 6]], prompt: 'Try a slightly slower breath next time?' },
    },
    guidance: {
      lead: 'Slow breathing through the nose with a gentle narrowing at the back of the throat, so each breath makes a soft, even sound, like distant waves.',
      takeCareShort: 'Keep the sound soft, heard only by you. Never squeeze your throat.',
      howTo: [
        'Sit upright or lie down. Close your mouth and breathe through your nose.',
        'Gently narrow the back of your throat so the breath makes a soft, even sound, like a quiet snore.',
        'Breathe in for 5 and out for 5, keeping the sound steady both ways.',
        'Keep your face, jaw, and tongue soft. Only you need to hear it.',
        'If your throat tires, let the sound go and keep breathing slowly.',
      ],
      context:
        'Ujjayi is often translated as “victorious.” The Hatha Yoga Pradipika describes drawing the breath in through both nostrils with a sound felt from the throat to the chest, holding it, and breathing out through the left nostril. Modern teachers such as B.K.S. Iyengar and Swami Satyananda teach it without holds, often as a first pranayama.',
      takeCare: [
        'Keep your throat relaxed. The sound comes from a slight narrowing, never from squeezing.',
        'If your throat feels dry or strained, drop the sound and breathe slowly.',
        'Stop and breathe normally if you feel dizzy or short of breath.',
      ],
      research:
        'Research on Ujjayi itself is thin. In one small study of beginners, slow breathing alone lowered blood pressure more clearly than slow breathing with the Ujjayi sound, which raised heart rate slightly. Much of what people feel may come from breathing slowly; the sound can help keep attention on the breath. It is not a treatment.',
      basedOn: ['hyp', 'iyengar-pranayama', 'satyananda-apmb', 'mason-2013', 'laborde-2022'],
      introduction: {
        clip: 'intro.ujjayi',
        lines: [
          'Sit or lie down, with your mouth closed.',
          'Gently narrow the back of your throat, so each breath makes a soft sound, like distant waves.',
          'Breathe in for five, and out for five, keeping the sound even.',
          'Only you need to hear it. If your throat tires, let the sound go.',
          'We’ll begin with an inhale.',
        ],
        long: {
          clip: 'intro-long.ujjayi',
          lines: [
            'Sit upright or lie down. Close your mouth and breathe through your nose.',
            'Gently narrow the back of your throat, so each breath makes a soft, even sound, like distant waves.',
            'Breathe in for five, and out for five, keeping the sound steady both ways.',
            'Keep your face, jaw, and tongue soft. The sound is for you alone; no one else needs to hear it.',
            'Never squeeze your throat to make the sound. If your throat tires, let the sound go and keep breathing slowly.',
            'We’ll begin with an inhale.',
          ],
        },
      },
    },
    review: null,
  },
  {
    id: 'sheetali',
    contentVersion: 1,
    riskTier: 'gentle',
    shareable: true,
    family: 'classical',
    name: 'Sheetali',
    subtitle: 'Cooling breath',
    pronunciation: { devanagari: 'शीतली', respelling: 'SHEE-tuh-lee', clip: 'name.sheetali' },
    practice: {
      steps: [
        { kind: 'inhale', seconds: 4, route: 'mouth', caption: 'Curl your tongue and sip the air in.' },
        { kind: 'exhale', seconds: 6, caption: 'Close your mouth. Out through the nose.' },
      ],
      increment: 1,
      target: { minutes: 3 },
      posture: 'seated',
    },
    guidance: {
      lead: 'Breathe in through a curled tongue, as if through a straw, and out through your nose. The incoming air feels cool on the tongue.',
      takeCareShort: 'Skip it in cold weather, or with asthma, a cold, or low blood pressure.',
      howTo: [
        'Sit upright with your head level.',
        'Stick your tongue out a little and curl the sides up into a tube.',
        'Breathe in through the tube for 4, like sipping through a straw.',
        'Draw your tongue in, close your mouth, and breathe out through your nose for 6.',
        'Can’t curl your tongue? Many people can’t. Try Sheetkari (sheet-KAH-ree): teeth lightly together, lips parted, breathe in through your teeth with a soft hiss.',
      ],
      context:
        'Sheetali means “cooling.” The Hatha Yoga Pradipika describes drawing air in over the tongue, holding it, and breathing out through the nose, and credits it with easing heat, thirst, and hunger. Curling the tongue into a tube comes from modern teaching, and the practice is traditionally kept for hot weather. Viram’s version has no hold.',
      takeCare: [
        'Skip it in cold weather, or in smoky, dusty, or polluted air. Breathing through the mouth skips the nose’s warming and filtering.',
        'Skip it with asthma, a cold, a cough, or a sore throat.',
        'Skip it if you have low blood pressure.',
        'With sensitive teeth, use the curled tongue rather than breathing through your teeth.',
        'Stop and breathe normally if you feel dizzy.',
      ],
      research:
        'Evidence is thin. A few small trials in people with high blood pressure report lower readings after weeks of practice, but none compared it with another breathing practice. The only study that measured temperature found body temperature rose slightly rather than fell; the coolness is air passing over a wet tongue. It is not a treatment.',
      basedOn: ['hyp', 'gheranda', 'satyananda-apmb', 'iyengar-pranayama', 'ayush-cyp', 'telles-2020', 'shetty-2017', 'sharpe-2021'],
      introduction: {
        clip: 'intro.sheetali',
        lines: [
          'Sit tall with your head level.',
          'Curl your tongue into a tube and breathe in through it, like sipping through a straw.',
          'Then close your mouth and breathe out slowly through your nose.',
          'If your tongue doesn’t curl, keep your teeth lightly together and breathe in through them instead.',
          'We’ll begin with an inhale through the mouth.',
        ],
        long: {
          clip: 'intro-long.sheetali',
          lines: [
            'Sit upright with your head level.',
            'Stick your tongue out a little and curl the sides up into a tube.',
            'Breathe in through the tube for four, like sipping through a straw.',
            'Then draw your tongue in, close your mouth, and breathe out slowly through your nose for six.',
            'Many people can’t curl their tongue. If that’s you, keep your teeth lightly together, part your lips, and breathe in through your teeth with a soft hiss instead.',
            'Skip this practice in cold weather, or if you have asthma or a cold.',
            'We’ll begin with an inhale through the mouth.',
          ],
        },
      },
    },
    review: null,
  },
  {
    id: 'coherent',
    contentVersion: 1,
    riskTier: 'gentle',
    shareable: true,
    family: 'modern',
    name: 'Coherent breathing',
    subtitle: 'Slow, even breathing',
    practice: {
      steps: [
        { kind: 'inhale', seconds: 5.5, caption: 'Follow the guide in, soft and slow.' },
        { kind: 'exhale', seconds: 5.5, caption: 'Follow the guide out. No need to empty fully.' },
      ],
      increment: 0.5,
      target: { minutes: 5 },
      posture: 'seated-or-lying',
    },
    guidance: {
      lead: 'Slow, even breaths, about five and a half a minute, in and out for the same time. There are no counts to keep: just follow the guide.',
      takeCareShort: 'Keep breaths gentle. If you feel lightheaded or tingly, breathe smaller.',
      howTo: [
        'Sit or lie comfortably. Rest a hand on your belly if it helps.',
        'Breathe in through your nose as the guide grows, gently and without effort.',
        'Breathe out through your nose as it shrinks, just as slowly.',
        'Keep the breaths soft and roomy, not big. The pace matters more than the size.',
        'If 5.5 seconds feels long, shorten both steps in Adjust rhythm.',
      ],
      context:
        'Researchers found that heart rate rises and falls most with the breath at around five to six breaths a minute, and call this resonance breathing. Stephen Elliott introduced Coherent Breathing, a slow, even pace like this, in 2005, and Richard Brown and Patricia Gerbarg taught it widely. The 5.5-second rhythm is a common average; each person’s ideal pace varies a little.',
      takeCare: [
        'Keep breaths gentle. Lightheadedness, or tingling in your hands or lips, means you’re breathing too much: take smaller breaths or return to normal breathing.',
        'It’s fine to shorten the steps. Straining isn’t the goal.',
        'Stop and breathe normally if you feel dizzy or short of breath.',
      ],
      research:
        'Slow breathing at this pace reliably raises heart rate variability during and shortly after practice. But the largest controlled trial, 400 adults over four weeks at the University of Sussex, found it improved stress, anxiety, and mood no more than a faster placebo breathing practice: both groups improved equally. Its pace hasn’t been shown to beat simpler slow breathing. It is not a treatment.',
      basedOn: ['elliott', 'brown-gerbarg', 'lehrer-gevirtz-2014', 'laborde-2022', 'fincham-2023'],
      introduction: {
        clip: 'intro.coherent',
        lines: [
          'Sit or lie comfortably.',
          'There’s nothing to count. Breathe in through your nose as the guide grows, and out as it shrinks.',
          'Keep each breath soft and roomy, never big.',
          'If you feel lightheaded, breathe smaller for a while.',
          'We’ll begin with an inhale.',
        ],
        long: {
          clip: 'intro-long.coherent',
          lines: [
            'Sit or lie comfortably. Rest a hand on your belly if it helps.',
            'There’s nothing to count here. Breathe in through your nose as the guide grows, gently and without effort.',
            'Breathe out through your nose as it shrinks, just as slowly.',
            'Keep each breath soft and roomy, never big. The pace matters more than the size.',
            'If the pace feels long, you can shorten both steps. And if you feel lightheaded or tingly, breathe smaller for a while.',
            'We’ll begin with an inhale.',
          ],
        },
      },
    },
    review: null,
  },
  {
    id: '4-7-8',
    contentVersion: 1,
    riskTier: 'gentle',
    shareable: true,
    family: 'modern',
    name: '4-7-8 breathing',
    subtitle: 'Long hold, long exhale',
    practice: {
      steps: [
        { kind: 'inhale', seconds: 4, caption: 'In quietly through the nose.' },
        { kind: 'hold', seconds: 7, caption: 'Hold gently. Tongue stays behind your teeth.' },
        { kind: 'exhale', seconds: 8, route: 'mouth', caption: 'Out through the mouth with a soft whoosh.' },
        { kind: 'rest', seconds: 0, caption: 'Pause before the next breath.' },
      ],
      increment: 1,
      // Andrew Weil teaches four breaths at a time to start.
      target: { rounds: 4 },
      posture: 'seated-or-lying',
    },
    guidance: {
      lead: 'Breathe in for 4, hold for 7, and breathe out through your mouth for 8. The counts are a ratio, not a test: keep them comfortable.',
      takeCareShort: 'Start with 4 rounds. If the hold feels hard, shorten all three counts.',
      howTo: [
        'Sit with your back straight, or lie down if you’re settling for sleep.',
        'Rest the tip of your tongue on the ridge just behind your upper front teeth, and keep it there.',
        'Breathe in quietly through your nose for 4.',
        'Hold your breath gently for 7.',
        'Breathe out through your mouth for 8 with a soft whoosh. Purse your lips if that’s easier.',
        'Four rounds is enough to start. If the hold is hard, shorten all three counts together in Adjust rhythm.',
      ],
      context:
        'Andrew Weil, a physician, popularized this pattern and describes it as adapted from pranayama. He teaches the counts as a ratio rather than a speed, suggests four breaths at a time, twice a day, and building to eight only after a month.',
      takeCare: [
        'Mild lightheadedness is common at first. If it happens, stop and breathe normally.',
        'The hold should never strain. Shorten all three counts rather than forcing it.',
        'With a heart or lung condition, or in pregnancy, check with your clinician first, or choose a practice without holds.',
        'Never practice breath holds in or near water.',
      ],
      research:
        'Evidence is thin. Small trials, mostly around surgery or medical procedures, report less anxiety compared with routine care, but not compared with a placebo practice. In the one direct comparison, slow breathing at six breaths a minute raised heart rate variability more than 4-7-8. No rigorous trial has tested it for falling asleep. It is not a treatment.',
      basedOn: ['weil-478', 'bhf-breathing', 'vierra-2022', 'aktas-2023', 'marchant-2025'],
      introduction: {
        clip: 'intro.4-7-8',
        lines: [
          'Rest the tip of your tongue just behind your upper front teeth, and keep it there.',
          'Breathe in quietly through your nose for four. Hold for seven. Then breathe out through your mouth for eight, with a soft whoosh.',
          'If the hold feels hard, don’t force it. Breathe out when you need to.',
          'We’ll begin with an inhale.',
        ],
        long: {
          clip: 'intro-long.4-7-8',
          lines: [
            'Sit with your back straight, or lie down if you’re settling for sleep.',
            'Rest the tip of your tongue on the ridge just behind your upper front teeth, and keep it there the whole time.',
            'Breathe in quietly through your nose for four.',
            'Hold your breath gently for seven.',
            'Then breathe out through your mouth for eight, with a soft whoosh. Purse your lips if that’s easier.',
            'Four rounds is enough to start. If the hold feels hard, don’t force it. Breathe out when you need to.',
            'We’ll begin with an inhale.',
          ],
        },
      },
    },
    review: null,
  },
];
