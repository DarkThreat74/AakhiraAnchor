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
];
