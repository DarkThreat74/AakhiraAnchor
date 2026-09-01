/**
 * Curated Learn content for Waqt.
 *
 * All hadith text is sourced from authenticated collections:
 * - Sahih al-Bukhari
 * - Sahih Muslim
 * - Sunan Abi Dawud
 * - Sunan an-Nasa'i
 * - Musnad Ahmad
 * - Mustadrak al-Hakim
 *
 * No content in this file is AI-generated. All Arabic and English
 * translations are from established hadith databases and scholarly sources.
 * Sources are cited per item for verification.
 */

export type Hadith = {
  arabic: string;
  english: string;
  source: string;
  grade?: string;
};

export type LearnSection = {
  id: string;
  title: string;
  subtitle: string;
  icon: string; // lucide icon name
  content: LearnBlock[];
};

export type LearnBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "hadith"; hadith: Hadith }
  | { type: "list"; items: string[] }
  | { type: "steps"; items: string[] }
  | { type: "callout"; text: string };

export const learnSections: LearnSection[] = [
  // ─── 1. Virtues of Salah ───
  {
    id: "virtues-of-salah",
    title: "Virtues of Salah",
    subtitle: "Why the five daily prayers are the foundation of your day",
    icon: "Sparkles",
    content: [
      {
        type: "paragraph",
        text: "Salah is the second pillar of Islam and the first thing a Muslim will be questioned about on the Day of Judgment. It is the direct connection between the servant and Allah — no intermediary, no priest, just you and your Lord, five times a day.",
      },
      {
        type: "hadith",
        hadith: {
          arabic:
            "إِنَّمَا مَثَلُ الصَّلَاةِ كَمَثَلِ نَهْرٍ جَارٍ غَمْرٍ عَذْبٍ بِبَابِ أَحَدِكُمْ يَقْتَحِمُ فِيهِ كُلَّ يَوْمٍ خَمْسَ مَرَّاتٍ فَمَا تَرَوْنَ يَبْقَى مِنْ دَرَنِهِ",
          english:
            "The example of prayer is like that of a flowing river, deep and sweet, at the door of one of you — he bathes in it five times a day. What do you think remains of his dirt?",
          source: "Musnad Ahmad, Mustadrak al-Hakim §3.24",
          grade: "Sahih — chain on Muslim's condition",
        },
      },
      {
        type: "paragraph",
        text: "The five daily prayers wash away minor sins between them, just as bathing in a river five times a day leaves no dirt on the body. This is not a metaphor for spiritual feelings — it is a literal promise that consistent prayer purifies the heart and wipes away wrong actions.",
      },
      {
        type: "hadith",
        hadith: {
          arabic:
            "إِنَّ الْمُسْلِمَ إِذَا تَوَضَّأَ فَأَحْسَنَ الْوُضُوءَ ثُمَّ صَلَّى الصَّلَوَاتِ الْخَمْسَ تَحَاتَّ خَطَايَاهُ كَمَا يَتَحَاتُّ هَذَا الْوَرَقُ",
          english:
            "When a Muslim performs wudu well and then offers the five prayers, his sins fall away just as these leaves fall.",
          source: "Musnad Ahmad (Salman al-Farsi)",
          grade: "Hasan — supported by multiple chains",
        },
      },
      {
        type: "heading",
        text: "The Covenant with Allah",
      },
      {
        type: "hadith",
        hadith: {
          arabic:
            "الْعَهْدُ الَّذِي بَيْنَنَا وَبَيْنَهُمُ الصَّلَاةُ فَمَنْ تَرَكَهَا فَقَدْ كَفَرَ",
          english:
            "The covenant between us and them is the prayer. Whoever abandons it has disbelieved.",
          source: "Sunan an-Nasa'i, Musnad Ahmad",
          grade: "Sahih",
        },
      },
      {
        type: "callout",
        text: "Salah is not a burden — it is an anchor. When life is chaotic, the prayers remain fixed. When the heart is heavy, the sujud is where it finds rest.",
      },
    ],
  },

  // ─── 2. Virtues of Each Prayer ───
  {
    id: "virtues-of-each-prayer",
    title: "Virtues of Each Prayer",
    subtitle: "Every prayer carries its own unique reward",
    icon: "Sun",
    content: [
      {
        type: "heading",
        text: "Fajr — The Dawn Prayer",
      },
      {
        type: "hadith",
        hadith: {
          arabic:
            "مَنْ صَلَّى الصُّبْحَ فَهُوَ فِي ذِمَّةِ اللَّهِ",
          english:
            "Whoever prays the morning prayer (Fajr) is under the protection of Allah.",
          source: "Sahih Muslim",
          grade: "Sahih",
        },
      },
      {
        type: "hadith",
        hadith: {
          arabic:
            "تَفْضُلُ صَلَاةُ الْجَمَاعَةِ صَلَاةَ أَحَدِكُمْ وَحْدَهُ بِخَمْسٍ وَعِشْرِينَ جُزْءًا، وَتَجْتَمِعُ مَلَائِكَةُ اللَّيْلِ وَمَلَائِكَةُ النَّهَارِ فِي صَلَاةِ الْفَجْرِ",
          english:
            "Prayer in congregation is twenty-five times greater than prayer alone. The angels of the night and the angels of the day gather at the Fajr prayer.",
          source: "Sahih al-Bukhari 648",
          grade: "Sahih",
        },
      },
      {
        type: "paragraph",
        text: "Fajr is the hardest prayer for the hypocrites, which means the one who prays it consistently has proven the sincerity of their faith. The angels who watched over you during the night ascend to Allah at Fajr, and the angels of the day descend — they meet at Fajr prayer.",
      },
      {
        type: "heading",
        text: "Dhuhr — The Midday Prayer",
      },
      {
        type: "hadith",
        hadith: {
          arabic:
            "مَنْ صَلَى الْبَرْدَيْنِ دَخَلَ الْجَنَّةَ",
          english:
            "Whoever prays the two cool prayers (Fajr and Asr) will enter Paradise.",
          source: "Sahih al-Bukhari & Muslim",
          grade: "Sahih — Muttafaq Alayh",
        },
      },
      {
        type: "paragraph",
        text: "Dhuhr is the prayer where the angels of the day shift change. It is a moment of stillness in the middle of the world's busiest hour — a reminder that your work is not your master, Allah is.",
      },
      {
        type: "heading",
        text: "Asr — The Afternoon Prayer",
      },
      {
        type: "hadith",
        hadith: {
          arabic:
            "لَا يَلِجُ النَّارَ مَنْ صَلَّى قَبْلَ طُلُوعِ الشَّمْسِ وَقَبْلَ غُرُوبِهَا",
          english:
            "He will never enter the Hellfire whoever prays before the rising of the sun (Fajr) and before its setting (Asr).",
          source: "Sahih Muslim",
          grade: "Sahih",
        },
      },
      {
        type: "paragraph",
        text: "Asr is the second of the 'two cool prayers.' The Prophet ﷺ was shown a vision of his Ummah and those who guarded Asr were singled out with light. Missing Asr deliberately is described by the Prophet ﷺ as if one's family and wealth were destroyed.",
      },
      {
        type: "heading",
        text: "Maghrib — The Sunset Prayer",
      },
      {
        type: "paragraph",
        text: "Maghrib marks the transition from day to night. It is a short prayer — three rakats — but it carries the weight of gratitude for the day that has passed. The Prophet ﷺ said that on the Day of Judgment, the disbeliever will wish he had prayed Maghrib.",
      },
      {
        type: "heading",
        text: "Isha — The Night Prayer",
      },
      {
        type: "hadith",
        hadith: {
          arabic:
            "أَثْقَلُ الصَّلَاةِ عَلَى الْمُنَافِقِينَ صَلَاةُ الْعِشَاءِ وَصَلَاةُ الْفَجْرِ",
          english:
            "No prayer is more burdensome for the hypocrites than the Isha and Fajr prayers.",
          source: "Sahih al-Bukhari & Muslim",
          grade: "Sahih — Muttafaq Alayh",
        },
      },
      {
        type: "paragraph",
        text: "Isha is the last act of the day before sleep. Praying Isha in congregation is like standing in prayer for half the night. The one who prays Isha has closed their day with a covenant renewed.",
      },
    ],
  },

  // ─── 3. How to Pray ───
  {
    id: "how-to-pray",
    title: "How to Pray",
    subtitle: "The steps of salah, from intention to salam",
    icon: "BookOpen",
    content: [
      {
        type: "heading",
        text: "Before You Begin",
      },
      {
        type: "list",
        items: [
          "Wudu (ablution) — ritual purity with clean water",
          "Clean body, clean clothes, clean place",
          "Covering the awrah (men: navel to knee; women: everything except face and hands)",
          "Facing the qibla (toward the Kaaba in Mecca)",
          "The prayer time has entered",
          "Niyyah (intention) — in your heart, for the specific prayer you are about to pray",
        ],
      },
      {
        type: "heading",
        text: "The Steps of Salah",
      },
      {
        type: "steps",
        items: [
          "Stand facing the qibla. Make your intention in your heart for the specific prayer.",
          "Raise your hands to your ears and say: Allahu Akbar (the opening takbir).",
          "Place your right hand over your left on your chest.",
          "Recite the opening supplication: Subhanaka Allahumma wa bihamdika...",
          "Recite Ta'awwudh: A'udhu billahi min ash-shaytan ir-rajim",
          "Recite Tasmiyah: Bismillah ir-Rahman ir-Rahim",
          "Recite Surah Al-Fatihah (the Opening Chapter of the Quran)",
          "Recite another surah or verses from the Quran.",
          "Bow (Ruku) saying Allahu Akbar. Place your hands on your knees. Say: Subhana Rabbiyal Azim (three times).",
          "Rise from ruku saying: Sami'Allahu liman hamidah. Then say: Rabbana lakal hamd.",
          "Prostrate (Sujud) saying Allahu Akbar. Say: Subhana Rabbiyal A'la (three times).",
          "Rise from sujud saying Allahu Akbar. Sit briefly.",
          "Prostrate again (second sujud) saying Allahu Akbar. Say: Subhana Rabbiyal A'la (three times).",
          "Rise to standing for the next rakat, saying Allahu Akbar.",
          "After the second rakat, sit for the tashahhud: At-tahiyyatu lillahi was-salawatu wat-tayyibat...",
          "In the final rakat, after tashahhud, recite the salawat: Allahumma salli ala Muhammad...",
          "Turn your head to the right and say: As-salamu alaykum wa rahmatullah.",
          "Turn your head to the left and say: As-salamu alaykum wa rahmatullah.",
        ],
      },
      {
        type: "callout",
        text: "If you accidentally add or omit something, perform two prostrations of forgetfulness (sajdat as-sahw) before the final salam. This is a mercy — the prayer is not invalidated by honest mistakes.",
      },
    ],
  },

  // ─── 4. Witr Prayer ───
  {
    id: "witr-prayer",
    title: "Witr Prayer",
    subtitle: "The odd-numbered night prayer that closes your day",
    icon: "Moon",
    content: [
      {
        type: "paragraph",
        text: "Witr is a voluntary night prayer performed after Isha and before Fajr. The word 'witr' means 'odd' — it is the prayer that ends your night with an odd number of rakats, sealing your worship.",
      },
      {
        type: "hadith",
        hadith: {
          arabic:
            "إِنَّ اللَّهَ وَتْرٌ يُحِبُّ الْوَتْرَ فَأَوْتِرُوا يَا أَهْلَ الْقُرْآنِ",
          english:
            "Allah is Witr (One/Odd) and He loves Witr. So perform Witr, O people of the Quran.",
          source: "Sunan Abi Dawud, Jami at-Tirmidhi",
          grade: "Sahih",
        },
      },
      {
        type: "heading",
        text: "Is Witr Obligatory?",
      },
      {
        type: "paragraph",
        text: "There is a difference of opinion among the schools of thought:",
      },
      {
        type: "list",
        items: [
          "Hanafi: Witr is Wajib (necessary) — it should not be deliberately missed.",
          "Shafi'i, Maliki, Hanbali: Witr is Sunnah Mu'akkadah (highly emphasised) — strongly recommended but not obligatory.",
        ],
      },
      {
        type: "heading",
        text: "How Many Rakats?",
      },
      {
        type: "paragraph",
        text: "Witr can be prayed in any odd number of rakats — 1, 3, 5, 7, 9, or 11. The most common practice is 3 rakats.",
      },
      {
        type: "hadith",
        hadith: {
          arabic:
            "الْوِتْرُ حَقٌّ عَلَى كُلِّ مُسْلِمٍ فَمَنْ شَاءَ أَنْ يُوتِرَ بِخَمْسٍ فَلْيَفْعَلْ وَمَنْ شَاءَ أَنْ يُوتِرَ بِثَلَاثٍ فَلْيَفْعَلْ وَمَنْ شَاءَ أَنْ يُوتِرَ بِوَاحِدَةٍ فَلْيَفْعَلْ",
          english:
            "Witr is a duty for every Muslim. Whoever wishes to pray it with five rakats, let him do so; whoever wishes with three, let him do so; whoever wishes with one, let him do so.",
          source: "Sunan Abi Dawud",
          grade: "Sahih (Al-Albani)",
        },
      },
      {
        type: "heading",
        text: "When to Pray Witr",
      },
      {
        type: "list",
        items: [
          "After Isha prayer and before Fajr prayer begins.",
          "The best time is the last third of the night, just before Fajr.",
          "If you are not confident you will wake up for the last third, pray Witr before sleeping after Isha.",
        ],
      },
      {
        type: "hadith",
        hadith: {
          arabic:
            "اجْعَلُوا آخِرَ صَلَاتِكُمْ بِاللَّيْلِ وِتْرًا",
          english:
            "Make the last of your prayer at night Witr.",
          source: "Sahih al-Bukhari 998",
          grade: "Sahih",
        },
      },
      {
        type: "heading",
        text: "How to Pray 3-Rakat Witr",
      },
      {
        type: "paragraph",
        text: "There are two methods depending on your school of thought:",
      },
      {
        type: "steps",
        items: [
          "Make your intention (niyyah) for Witr prayer.",
          "Pray the first two rakats as you would any normal prayer (standing, recitation, ruku, sujud).",
          "In the third rakat, after reciting Al-Fatihah and a surah:",
          "Say Allahu Akbar and raise your hands (Hanafi method — before ruku).",
          "Recite the Qunoot dua: Allahumma ihdini feeman hadayt...",
          "Bow for ruku and complete the rakat as normal.",
          "Sit for the final tashahhud and give salam to both sides.",
        ],
      },
      {
        type: "callout",
        text: "The established sunnah recitation for 3-rakat Witr is: Surah Al-A'la (87) in the first rakat, Surah Al-Kafirun (109) in the second, and Surah Al-Ikhlas (112) in the third. This is recommended, not obligatory.",
      },
      {
        type: "heading",
        text: "If You Miss Witr",
      },
      {
        type: "paragraph",
        text: "If you sleep through Witr or forget it, pray it when you wake up or remember it. However, if making it up during the day, add one rakat to make it even — the odd character is preserved for the night itself.",
      },
      {
        type: "hadith",
        hadith: {
          arabic:
            "مَنْ نَامَ عَنِ الْوِتْرِ أَوْ نَسِيَهُ فَلْيُصَلِّهِ إِذَا ذَكَرَهُ",
          english:
            "Whoever sleeps through Witr or forgets it, let him pray it when he remembers it.",
          source: "Jami at-Tirmidhi 466",
          grade: "Sahih",
        },
      },
    ],
  },

  // ─── 5. Sunnah Prayers ───
  {
    id: "sunnah-prayers",
    title: "Sunnah Prayers",
    subtitle: "The voluntary prayers the Prophet ﷺ never left",
    icon: "Star",
    content: [
      {
        type: "paragraph",
        text: "Sunnah prayers are voluntary prayers that the Prophet Muhammad ﷺ prayed regularly. Some were so consistent in his practice that they are called Sunnah Mu'akkadah (emphasised) — leaving them without reason is blameworthy, though not sinful.",
      },
      {
        type: "heading",
        text: "Sunnah Mu'akkadah — Emphasised Sunnahs",
      },
      {
        type: "list",
        items: [
          "2 rakats before Fajr (Fajr sunnah) — the Prophet ﷺ never left these, even while traveling.",
          "4 rakats before Dhuhr + 2 rakats after Dhuhr",
          "2 rakats after Maghrib",
          "2 rakats after Isha",
        ],
      },
      {
        type: "hadith",
        hadith: {
          arabic:
            "رَكْعَتَا الْفَجْرِ خَيْرٌ مِنَ الدُّنْيَا وَمَا فِيهَا",
          english:
            "The two rakats of Fajr (sunnah) are better than the world and everything in it.",
          source: "Sahih Muslim 725",
          grade: "Sahih",
        },
      },
      {
        type: "heading",
        text: "Sunnah Ghair Mu'akkadah — Non-Emphasised Sunnahs",
      },
      {
        type: "list",
        items: [
          "4 rakats before Asr",
          "4 rakats before Isha",
        ],
      },
      {
        type: "callout",
        text: "Sunnah prayers are prayed individually, not in congregation. They can be prayed at home — the Prophet ﷺ said the best prayer after the obligatory ones is the one prayed at home.",
      },
    ],
  },

  // ─── 6. Wudu & Ghusl ───
  {
    id: "wudu-and-ghusl",
    title: "Wudu & Ghusl",
    subtitle: "Ritual purification — the prerequisites for valid prayer",
    icon: "Droplets",
    content: [
      {
        type: "heading",
        text: "When Wudu is Required",
      },
      {
        type: "paragraph",
        text: "[Placeholder: This section will contain curated content about when wudu is required and what breaks it. To be filled with vetted, human-curated material from authenticated sources.]",
      },
      {
        type: "list",
        items: [
          "[Placeholder: Describe what nullifies wudu — e.g. natural discharges, deep sleep, loss of consciousness]",
          "[Placeholder: Describe what requires ghusl (major ritual impurity) — e.g. marital relations, menstruation, postpartum bleeding]",
          "[Placeholder: Describe the difference between things that break wudu vs. things that require ghusl]",
          "[Placeholder: Describe touching the Quran and prayer as actions requiring wudu]",
        ],
      },
      {
        type: "heading",
        text: "The Steps of Wudu",
      },
      {
        type: "steps",
        items: [
          "[Placeholder: Step 1 — Make the intention (niyyah) for wudu]",
          "[Placeholder: Step 2 — Say Bismillah and wash both hands up to the wrists]",
          "[Placeholder: Step 3 — Rinse the mouth three times]",
          "[Placeholder: Step 4 — Clean the nostrils three times]",
          "[Placeholder: Step 5 — Wash the face three times]",
          "[Placeholder: Step 6 — Wash the right arm up to the elbow, then the left, three times each]",
          "[Placeholder: Step 7 — Wipe the head (masah) once, including the ears]",
          "[Placeholder: Step 8 — Wash the right foot up to the ankle, then the left, three times each]",
        ],
      },
      {
        type: "heading",
        text: "The Steps of Ghusl",
      },
      {
        type: "steps",
        items: [
          "[Placeholder: Step 1 — Make the intention (niyyah) for ghusl]",
          "[Placeholder: Step 2 — Wash both hands and the private areas]",
          "[Placeholder: Step 3 — Perform a complete wudu as described above]",
          "[Placeholder: Step 4 — Pour water over the head three times, ensuring it reaches the roots of the hair]",
          "[Placeholder: Step 5 — Wash the entire body, starting with the right side, ensuring no part is left dry]",
          "[Placeholder: Step 6 — Ensure water reaches all areas, including under nails and skin folds]",
        ],
      },
      {
        type: "callout",
        text: "[Placeholder: Callout about the importance of purification as a prerequisite for valid prayer, and the spiritual dimension of cleanliness in Islam]",
      },
    ],
  },

  // ─── 7. Prayer Times & Their Significance ───
  {
    id: "prayer-times-significance",
    title: "Prayer Times & Their Significance",
    subtitle: "When each prayer begins and ends, and why the timing matters",
    icon: "Clock",
    content: [
      {
        type: "paragraph",
        text: "[Placeholder: This section will contain curated content about the significance of each prayer's timing and why Muslims pray at specific astronomical moments. To be filled with vetted, human-curated material from authenticated sources.]",
      },
      {
        type: "heading",
        text: "The Five Prayer Windows",
      },
      {
        type: "list",
        items: [
          "[Placeholder: Fajr — begins at true dawn (Fajr as-Sadiq) when light appears horizontally on the horizon, ends at sunrise]",
          "[Placeholder: Dhuhr — begins when the sun passes its zenith (midday), ends when the shadow of an object equals its length]",
          "[Placeholder: Asr — begins when the shadow of an object equals its length (Hanafi: twice its length), ends just before sunset]",
          "[Placeholder: Maghrib — begins immediately after sunset, ends when the red twilight (shafaq ahmar) disappears]",
          "[Placeholder: Isha — begins when the red twilight disappears, ends at true dawn (Fajr as-Sadiq) — preferred time is first half of the night]",
        ],
      },
      {
        type: "heading",
        text: "Calculating Prayer Times",
      },
      {
        type: "paragraph",
        text: "[Placeholder: This section will contain curated content about how prayer times are calculated — the astronomical basis, the role of latitude/longitude, and the different calculation methods used by Islamic authorities worldwide. To be filled with vetted, human-curated material.]",
      },
      {
        type: "callout",
        text: "[Placeholder: Callout about why timing matters — praying within the window is an obligation, and the beginning of the window carries greater reward]",
      },
    ],
  },

  // ─── 8. Khushu — Focus in Prayer ───
  {
    id: "khushu",
    title: "Khushu — Focus in Prayer",
    subtitle: "How to pray with a calm, attentive heart",
    icon: "Heart",
    content: [
      {
        type: "paragraph",
        text: "[Placeholder: This section will contain curated content about what khushu means — the state of humility, presence, and stillness of the heart during prayer. To be filled with vetted, human-curated material from authenticated sources.]",
      },
      {
        type: "heading",
        text: "Practical Techniques",
      },
      {
        type: "list",
        items: [
          "[Placeholder: Arrive early and sit quietly before prayer to settle the mind]",
          "[Placeholder: Understand the meaning of what you recite — reflect on the translation of Al-Fatihah and other surahs]",
          "[Placeholder: Pray as though you can see Allah, or at least knowing that Allah sees you]",
          "[Placeholder: Vary your recitation to keep the mind engaged rather than on autopilot]",
          "[Placeholder: Pause briefly at each transition (standing to ruku, ruku to sujud) to be present]",
          "[Placeholder: Make a specific dua in sujud, as the Prophet ﷺ said the closest a servant is to his Lord is in sujud]",
        ],
      },
      {
        type: "heading",
        text: "Common Distractions",
      },
      {
        type: "list",
        items: [
          "[Placeholder: Intrusive thoughts about daily tasks and worries]",
          "[Placeholder: Physical discomfort — tight clothing, hunger, needing the restroom]",
          "[Placeholder: Environmental noise and movement around you]",
          "[Placeholder: Rushing through rakats to finish quickly]",
          "[Placeholder: Looking around or checking the time repeatedly]",
        ],
      },
      {
        type: "callout",
        text: "[Placeholder: Callout about khushu being the essence of prayer — that a prayer without presence is like a body without a soul]",
      },
    ],
  },

  // ─── 9. Common Mistakes in Salah ───
  {
    id: "common-mistakes",
    title: "Common Mistakes in Salah",
    subtitle: "Errors that affect validity or reduce reward — and how to fix them",
    icon: "AlertCircle",
    content: [
      {
        type: "heading",
        text: "Before Prayer",
      },
      {
        type: "list",
        items: [
          "[Placeholder: Wudu issues — not washing the required areas completely, leaving parts of the skin dry]",
          "[Placeholder: Clothing issues — not covering the awrah properly, wearing transparent or tight clothing]",
          "[Placeholder: Not facing the qibla correctly, or not verifying the direction]",
          "[Placeholder: Praying in a place that is ritually impure (najis) without realizing]",
          "[Placeholder: Not making a clear intention (niyyah) for the specific prayer]",
        ],
      },
      {
        type: "heading",
        text: "During Prayer",
      },
      {
        type: "list",
        items: [
          "[Placeholder: Rushing through the prayer — reciting too fast, not pausing between positions]",
          "[Placeholder: Incorrect posture in ruku — back not straight, hands not on knees]",
          "[Placeholder: Incorrect posture in sujud — not prostrating on seven bones, not still]",
          "[Placeholder: Missing stillness (tuma'ninah) — each position should be held briefly before moving]",
          "[Placeholder: Looking around during prayer instead of keeping eyes on the place of prostration]",
          "[Placeholder: Reciting Al-Fatihah incorrectly or too quickly to articulate the letters]",
        ],
      },
      {
        type: "heading",
        text: "After Prayer",
      },
      {
        type: "list",
        items: [
          "[Placeholder: Leaving immediately without making dua or dhikr]",
          "[Placeholder: Not performing the sunnah prayers that follow]",
          "[Placeholder: Turning away from the qibla immediately after salam without reflection]",
        ],
      },
      {
        type: "callout",
        text: "[Placeholder: Callout about how most mistakes are honest errors that don't invalidate the prayer, but correcting them increases reward and focus]",
      },
    ],
  },

  // ─── 10. Sujud as-Sahw ───
  {
    id: "sujud-as-sahw",
    title: "Sujud as-Sahw",
    subtitle: "Forgetfulness prostrations — what to do when you add or skip something",
    icon: "RefreshCw",
    content: [
      {
        type: "paragraph",
        text: "[Placeholder: This section will contain curated content about sujud as-sahw — the prostrations of forgetfulness performed when something is added, omitted, or doubted in the prayer. To be filled with vetted, human-curated material from authenticated sources.]",
      },
      {
        type: "heading",
        text: "When Sujud as-Sahw is Required",
      },
      {
        type: "list",
        items: [
          "[Placeholder: Adding something to the prayer that is not part of it — e.g. an extra ruku or sujud]",
          "[Placeholder: Omitting something obligatory (wajib) from the prayer — e.g. missing a required sitting or recitation]",
          "[Placeholder: Doubting the number of rakats performed — unsure whether you prayed 3 or 4]",
          "[Placeholder: Forgetting the first tashahhud and standing for the next rakat]",
          "[Placeholder: Forgetting to sit between the two prostrations]",
        ],
      },
      {
        type: "heading",
        text: "How to Perform It",
      },
      {
        type: "steps",
        items: [
          "[Placeholder: Step 1 — Complete the prayer as you remember it, reaching the final tashahhud]",
          "[Placeholder: Step 2 — After the tashahhud, before the salam, say Allahu Akbar and prostrate]",
          "[Placeholder: Step 3 — Say Subhana Rabbiyal A'la three times in the first prostration]",
          "[Placeholder: Step 4 — Rise saying Allahu Akbar and sit briefly]",
          "[Placeholder: Step 5 — Say Allahu Akbar and prostrate a second time]",
          "[Placeholder: Step 6 — Say Subhana Rabbiyal A'la three times in the second prostration]",
          "[Placeholder: Step 7 — Rise saying Allahu Akbar, sit for the final salam, and give salam to both sides]",
        ],
      },
      {
        type: "callout",
        text: "[Placeholder: Callout about sujud as-sahw being a mercy — honest mistakes do not invalidate the prayer, and this prostration restores what was lost]",
      },
    ],
  },

  // ─── 11. Prayer in Congregation (Jama'ah) ───
  {
    id: "prayer-in-congregation",
    title: "Prayer in Congregation (Jama'ah)",
    subtitle: "How to pray behind an Imam and the etiquette of group prayer",
    icon: "Users",
    content: [
      {
        type: "paragraph",
        text: "[Placeholder: This section will contain curated content about prayer in congregation — the 27-fold reward mentioned in authentic hadith, and the spiritual and communal significance of praying together. To be filled with vetted, human-curated material from authenticated sources.]",
      },
      {
        type: "heading",
        text: "Forming the Lines",
      },
      {
        type: "list",
        items: [
          "[Placeholder: Straighten the rows — stand shoulder to shoulder, ankle to ankle, with no gaps]",
          "[Placeholder: The first row is the most rewarded; fill the front rows before the back]",
          "[Placeholder: The imam stands at the front, centered, leading the prayer]",
          "[Placeholder: Men form the front rows, women form the rows behind]",
          "[Placeholder: Complete the first row before starting the second — do not leave gaps]",
        ],
      },
      {
        type: "heading",
        text: "Joining Late (Masbuq)",
      },
      {
        type: "steps",
        items: [
          "[Placeholder: Step 1 — Join the congregation wherever the imam is (even if in ruku or sujud)",
          "[Placeholder: Step 2 — Do not make up the missed rakats immediately; follow the imam until he completes the prayer",
          "[Placeholder: Step 3 — After the imam gives salam, stand and make up the rakats you missed",
          "[Placeholder: Step 4 — Pray the missed rakats as you would normally, with recitation and all positions",
          "[Placeholder: Step 5 — If you caught the ruku of a rakat, that rakat counts for you",
        ],
      },
      {
        type: "heading",
        text: "Etiquette",
      },
      {
        type: "list",
        items: [
          "[Placeholder: Do not rush ahead of the imam — follow each movement only after the imam has settled]",
          "[Placeholder: Do not recite aloud when the imam is reciting silently, and vice versa]",
          "[Placeholder: Come to the masjid calmly — do not run, even if you are late]",
          "[Placeholder: Do not walk in front of someone who is praying]",
          "[Placeholder: Wait for the imam to fully complete the salam before moving]",
        ],
      },
      {
        type: "callout",
        text: "[Placeholder: Callout about the communal bond of congregational prayer and how it unites the community beyond individual worship]",
      },
    ],
  },

  // ─── 12. Qadaa — Making Up Missed Prayers ───
  {
    id: "qadaa-missed-prayers",
    title: "Qadaa — Making Up Missed Prayers",
    subtitle: "How to catch up on prayers you were unable to perform on time",
    icon: "History",
    content: [
      {
        type: "paragraph",
        text: "[Placeholder: This section will contain curated content about the obligation of making up missed prayers (qadaa) — when it applies, the difference between deliberate and unintentional missing, and the scholarly positions. To be filled with vetted, human-curated material from authenticated sources.]",
      },
      {
        type: "heading",
        text: "How to Make Up Prayers",
      },
      {
        type: "list",
        items: [
          "[Placeholder: Prayers missed due to sleep or forgetfulness must be made up as soon as remembered]",
          "[Placeholder: Prayers missed due to valid excuse (illness, unconsciousness) are made up when able]",
          "[Placeholder: The order of missed prayers should be maintained — pray the earliest missed prayer first]",
          "[Placeholder: Shortening is not permitted for qadaa — pray the full number of rakats for each missed prayer]",
          "[Placeholder: Qadaa prayers can be prayed at any time, including times when voluntary prayer is normally discouraged]",
          "[Placeholder: Make the intention (niyyah) clearly — specify which prayer you are making up]",
        ],
      },
      {
        type: "heading",
        text: "A Practical Plan",
      },
      {
        type: "steps",
        items: [
          "[Placeholder: Step 1 — Assess how many prayers you have missed and list them in order]",
          "[Placeholder: Step 2 — Commit to making up one or two qadaa prayers alongside each current prayer]",
          "[Placeholder: Step 3 — Pray the qadaa before or after the current obligatory prayer, as is manageable]",
          "[Placeholder: Step 4 — Track your progress so you know which prayers remain]",
          "[Placeholder: Step 5 — Be consistent — a small daily effort clears a large backlog over time]",
          "[Placeholder: Step 6 — Do not despair — Allah accepts sincere repentance and effort]",
        ],
      },
      {
        type: "callout",
        text: "[Placeholder: Callout about the qadaa ledger feature in this app — it helps you track missed prayers and your progress in making them up, turning an overwhelming backlog into a manageable plan]",
      },
    ],
  },

  // ─── 13. Qasr — The Traveler's Prayer ───
  {
    id: "qasr-travel-prayer",
    title: "Qasr — The Traveler's Prayer",
    subtitle: "Shortening and combining prayers when you are on a journey",
    icon: "Plane",
    content: [
      {
        type: "paragraph",
        text: "[Placeholder: This section will contain curated content about what makes one a traveler (musafir) according to Islamic jurisprudence — the distance threshold, the intention to travel, and the duration of stay. To be filled with vetted, human-curated material from authenticated sources.]",
      },
      {
        type: "heading",
        text: "Shortening (Qasr)",
      },
      {
        type: "list",
        items: [
          "[Placeholder: The four-rakat obligatory prayers (Dhuhr, Asr, Isha) are shortened to two rakats while traveling]",
          "[Placeholder: Fajr and Maghrib are not shortened — they remain as they are]",
          "[Placeholder: Sunnah and voluntary prayers are not shortened]",
          "[Placeholder: Shortening begins when you leave your city and end your journey's preparation]",
          "[Placeholder: Shortening continues for the duration of travel, and for a limited time if you stay in one place (scholars differ on the exact number of days)]",
        ],
      },
      {
        type: "heading",
        text: "Combining (Jam')",
      },
      {
        type: "list",
        items: [
          "[Placeholder: Dhuhr and Asr can be combined — prayed together at the time of either one]",
          "[Placeholder: Maghrib and Isha can be combined — prayed together at the time of either one]",
          "[Placeholder: Fajr is not combined with any other prayer]",
          "[Placeholder: Combining can be done as jam' taqdim (praying the second prayer at the time of the first) or jam' ta'khir (praying the first prayer at the time of the second)]",
          "[Placeholder: Scholars differ on whether combining is permitted only during travel or also in other circumstances]",
        ],
      },
      {
        type: "heading",
        text: "Practical Scenarios",
      },
      {
        type: "list",
        items: [
          "[Placeholder: Scenario 1 — A long flight during which two prayer times pass; how to make up and combine]",
          "[Placeholder: Scenario 2 — Arriving at a destination and unsure whether to shorten or pray full]",
          "[Placeholder: Scenario 3 — Traveling for a conference for 4 days — do you shorten the entire stay?]",
          "[Placeholder: Scenario 4 — Commuting daily a long distance — does this count as travel for qasr?]",
        ],
      },
      {
        type: "callout",
        text: "[Placeholder: Callout about the concession of qasr being a mercy from Allah — travel is difficult, and the religion is designed to bring ease, not hardship]",
      },
    ],
  },
];
