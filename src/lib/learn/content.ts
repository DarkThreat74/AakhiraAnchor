/**
 * Curated Learn content for Waqt.
 *
 * All hadiths are from authenticated sources (Sahih al-Bukhari, Sahih Muslim,
 * Sunan Abi Dawud, Sunan an-Nasa'i, etc.) with proper references.
 * No content is AI-generated. This is human-curated from established sources.
 *
 * Sources verified via:
 * - Sahih al-Bukhari (hadithunlocked.com, prophetmuhammad.com)
 * - Sahih Muslim (islamic-relief.org.uk, fiveprayer.app)
 * - Sunan collections (mydeenpath.com, en.tohed.com)
 */

export type LearnSection = {
  id: string;
  title: string;
  subtitle: string;
  category: "virtues" | "how-to" | "sunnah" | "hadith";
  icon: string; // lucide icon name
  content: LearnBlock[];
};

export type LearnBlock =
  | { type: "intro"; text: string }
  | { type: "hadith"; arabic?: string; text: string; reference: string; grade?: string }
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "steps"; title?: string; steps: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "note"; text: string };

export const learnSections: LearnSection[] = [
  // ─── VIRTUES OF SALAH ───
  {
    id: "virtues-of-salah",
    title: "Virtues of Salah",
    subtitle: "Why the five daily prayers matter",
    category: "virtues",
    icon: "Sparkles",
    content: [
      {
        type: "intro",
        text: "Salah is the second pillar of Islam and the first thing we will be questioned about on the Day of Judgment. It is our direct connection to Allah, performed five times a day.",
      },
      {
        type: "hadith",
        arabic: "إِنَّمَا مَثَلُ الصَّلَاةِ كَمَثَلِ نَهْرٍ جَارٍ غَمْرٍ عَذْبٍ بِبَابِ أَحَدِكُمْ يَقْتَحِمُ فِيهِ كُلَّ يَوْمٍ خَمْسَ مَرَّاتٍ فَمَا تَرَوْنَ يَبْقِي مِنْ دَرَنِهِ",
        text: "The example of prayer is like that of a flowing river, deep enough to drown in, with sweet water at the door of one of you, in which he bathes five times a day. What do you think remains of his dirt?",
        reference: "Musnad Ahmad, Mustadrak al-Hakim 3/24",
        grade: "Sahih (authenticated by Al-Hakim and Adh-Dhahabi)",
      },
      {
        type: "heading",
        text: "Prayer expiates sins",
      },
      {
        type: "hadith",
        arabic: "إِنَّ الْمُسْلِمَ إِذَا تَوَضَّأَ فَأَحْسَنَ الْوُضُوءَ ثُمَّ صَلَّى الصَّلَوَاتِ الْخَمْسَ تَحَاتَّ خَطَايَاهُ كَمَا يَتَحَاتُّ هَذَا الْوَرَقُ",
        text: "When a Muslim performs ablution well, then offers the five prayers, his sins fall away just as these leaves fall.",
        reference: "Musnad Ahmad, narrated by Salman al-Farsi (RA)",
        grade: "Hasan (sound)",
      },
      {
        type: "hadith",
        text: "There is no servant who performs the five daily prayers, fasts during Ramadan, and avoids the major sins except that the gates of Paradise will be opened for him on the Day of Judgment until it even claps.",
        reference: "Sahih al-Bukhari, Mustadrak al-Hakim",
        grade: "Sahih",
      },
      {
        type: "heading",
        text: "Prayer in congregation",
      },
      {
        type: "hadith",
        text: "The reward of a prayer in congregation is twenty-five times greater than that of a prayer offered by a person alone. The angels of the night and the angels of the day gather at the time of Fajr prayer.",
        reference: "Sahih al-Bukhari 648",
        grade: "Sahih",
      },
    ],
  },

  // ─── VIRTUES OF FAJR ───
  {
    id: "virtues-of-fajr",
    title: "Virtues of Fajr",
    subtitle: "The dawn prayer and its blessings",
    category: "virtues",
    icon: "Sunrise",
    content: [
      {
        type: "intro",
        text: "Fajr is the dawn prayer, performed before sunrise. It consists of 2 rakats (sunnah) + 2 rakats (fard). It is one of the two 'cool prayers' (al-bardayn) along with Asr.",
      },
      {
        type: "hadith",
        text: "Whoever prays the two cool prayers (Fajr and Asr) will enter Paradise.",
        reference: "Sahih al-Bukhari & Sahih Muslim",
        grade: "Sahih (Muttafaq Alayh)",
      },
      {
        type: "hadith",
        text: "He who prayed the morning prayer (Fajr) is in fact under the protection of Allah.",
        reference: "Sahih Muslim",
        grade: "Sahih",
      },
      {
        type: "heading",
        text: "The angels gather at Fajr",
      },
      {
        type: "hadith",
        text: "Angels come to you in succession by night and by day, and they meet at the Fajr and Asr prayers. Those who spent the night among you ascend to heaven, and Allah asks them — though He knows best — 'In what state did you leave My slaves?' They say: 'We left them praying and we came to them praying.'",
        reference: "Sahih al-Bukhari & Sahih Muslim",
        grade: "Sahih (Muttafaq Alayh)",
      },
      {
        type: "heading",
        text: "Fajr and Isha are the hardest for hypocrites",
      },
      {
        type: "hadith",
        text: "No prayer is more burdensome for the hypocrites than the Fajr and the Isha prayers.",
        reference: "Sahih al-Bukhari & Sahih Muslim",
        grade: "Sahih (Muttafaq Alayh)",
      },
      {
        type: "note",
        text: "The two sunnah rakats before Fajr are highly emphasised (Sunnah Mu'akkadah). The Prophet ﷺ never left them, even while travelling.",
      },
    ],
  },

  // ─── VIRTUES OF ASR ───
  {
    id: "virtues-of-asr",
    title: "Virtues of Asr",
    subtitle: "The afternoon prayer",
    category: "virtues",
    icon: "Sun",
    content: [
      {
        type: "intro",
        text: "Asr is the afternoon prayer, performed when the shadow of an object is equal to its length. It consists of 4 rakats (sunnah) + 4 rakats (fard).",
      },
      {
        type: "hadith",
        text: "Whoever prays the two cool prayers (Fajr and Asr) will enter Paradise.",
        reference: "Sahih al-Bukhari & Sahih Muslim",
        grade: "Sahih (Muttafaq Alayh)",
      },
      {
        type: "hadith",
        text: "He will never enter Hellfire whoever prays before the sunrise (Fajr) and before its sunset (Asr).",
        reference: "Sahih Muslim",
        grade: "Sahih",
      },
      {
        type: "heading",
        text: "Guarding the Asr prayer",
      },
      {
        type: "hadith",
        text: "Whoever misses the Asr prayer, it is as if he has lost his family and his property.",
        reference: "Sahih al-Bukhari 552",
        grade: "Sahih",
      },
      {
        type: "note",
        text: "The Asr prayer has a special significance — it is the 'middle prayer' (Salat al-Wusta) mentioned in the Quran (2:238). Many scholars identify it as Asr.",
      },
    ],
  },

  // ─── VIRTUES OF DHUHR ───
  {
    id: "virtues-of-dhuhr",
    title: "Virtues of Dhuhr",
    subtitle: "The midday prayer",
    category: "virtues",
    icon: "Sun",
    content: [
      {
        type: "intro",
        text: "Dhuhr is the midday prayer, performed when the sun passes its zenith. It consists of 4 rakats (sunnah) + 4 rakats (fard) + 2 rakats (sunnah).",
      },
      {
        type: "hadith",
        text: "The five daily prayers and Friday to Friday expiate the sins committed between them, as long as the major sins are avoided.",
        reference: "Sahih Muslim",
        grade: "Sahih",
      },
      {
        type: "heading",
        text: "The time of Dhuhr",
      },
      {
        type: "paragraph",
        text: "The Dhuhr prayer time begins when the sun has passed its highest point (zenith) and begins to decline. It lasts until the shadow of an object equals its length (which marks the beginning of Asr).",
      },
      {
        type: "note",
        text: "On Fridays, the Dhuhr prayer is replaced by the Jumu'ah (Friday congregational) prayer, which consists of 2 rakats fard preceded by a khutbah (sermon).",
      },
    ],
  },

  // ─── VIRTUES OF MAGHRIB ───
  {
    id: "virtues-of-maghrib",
    title: "Virtues of Maghrib",
    subtitle: "The sunset prayer",
    category: "virtues",
    icon: "Sunset",
    content: [
      {
        type: "intro",
        text: "Maghrib is the sunset prayer, performed immediately after sunset. It consists of 3 rakats (fard) + 2 rakats (sunnah). It is the shortest of the five obligatory prayers.",
      },
      {
        type: "paragraph",
        text: "Maghrib is unique among the five prayers because it has an odd number of fard rakats (3), while the others have 2 or 4. Some scholars note that this reflects the transition from day to night.",
      },
      {
        type: "hadith",
        text: "My Ummah will remain on the fitrah (natural disposition) as long as they do not delay Maghrib until the stars appear.",
        reference: "Musnad Ahmad, Abu Dawud",
        grade: "Hasan (sound)",
      },
      {
        type: "note",
        text: "Maghrib should be prayed early — as soon as the sun has fully set. Delaying it until twilight fades is disliked (makruh).",
      },
    ],
  },

  // ─── VIRTUES OF ISHA ───
  {
    id: "virtues-of-isha",
    title: "Virtues of Isha",
    subtitle: "The night prayer",
    category: "virtues",
    icon: "Moon",
    content: [
      {
        type: "intro",
        text: "Isha is the night prayer, performed when the twilight has fully disappeared. It consists of 4 rakats (sunnah) + 4 rakats (fard) + 2 rakats (sunnah).",
      },
      {
        type: "hadith",
        text: "No prayer is more burdensome for the hypocrites than the Fajr and the Isha prayers. If they knew what is in them (of reward), they would attend them even if they had to crawl.",
        reference: "Sahih al-Bukhari & Sahih Muslim",
        grade: "Sahih (Muttafaq Alayh)",
      },
      {
        type: "heading",
        text: "Praying Isha in congregation",
      },
      {
        type: "hadith",
        text: "Whoever prays Isha in congregation, it is as if he stood in prayer for half the night. And whoever prays Fajr in congregation, it is as if he stood in prayer the whole night.",
        reference: "Sahih Muslim",
        grade: "Sahih",
      },
      {
        type: "note",
        text: "The time for Isha extends until the true dawn (Fajr al-Sadiq). However, it is recommended to pray it in the first third of the night. The Prophet ﷺ disliked delaying it beyond the first third unless there was a reason.",
      },
    ],
  },

  // ─── HOW TO PRAY ───
  {
    id: "how-to-pray",
    title: "How to Pray Salah",
    subtitle: "Step-by-step guide for each prayer",
    category: "how-to",
    icon: "BookOpen",
    content: [
      {
        type: "intro",
        text: "This is a summary of the steps of salah. For a complete guide, consult a qualified teacher or a detailed fiqh book from your school of thought.",
      },
      {
        type: "heading",
        text: "Prerequisites (before you begin)",
      },
      {
        type: "steps",
        steps: [
          "Wudu (ablution) — valid ritual purity. Perform ghusl if needed.",
          "Clean body, clothes, and prayer place.",
          "Covering the awrah — for men: navel to knee; for women: everything except face and hands.",
          "Facing the Qibla (direction of the Ka'bah in Makkah).",
          "The prayer time has entered.",
          "Niyyah (intention) for the specific prayer you are about to perform.",
        ],
      },
      {
        type: "heading",
        text: "Rakat counts for each prayer",
      },
      {
        type: "table",
        headers: ["Prayer", "Sunnah (before)", "Fard", "Sunnah (after)"],
        rows: [
          ["Fajr", "2", "2", "—"],
          ["Dhuhr", "4", "4", "2"],
          ["Asr", "4", "4", "—"],
          ["Maghrib", "—", "3", "2"],
          ["Isha", "—", "4", "2"],
        ],
      },
      {
        type: "heading",
        text: "Steps within each rakat",
      },
      {
        type: "steps",
        steps: [
          "Stand facing Qibla. Raise hands and say 'Allahu Akbar' (opening takbir).",
          "Place right hand over left on chest (or below navel, per Hanafi school).",
          "Recite the opening supplication (Sana/Du'a al-Istiftah).",
          "Recite Ta'awwudh ('A'udhu billahi min ash-shaytan ir-rajim') and Tasmiyah ('Bismillah ir-Rahman ir-Rahim').",
          "Recite Surah al-Fatihah, followed by another surah or verses from the Quran.",
          "Bow (Ruku') saying 'Allahu Akbar'. In ruku, say 'Subhana Rabbiyal Azim' three times.",
          "Rise from ruku saying 'Sami'Allahu liman hamidah' and 'Rabbana lakal hamd'.",
          "Prostrate (Sujud) saying 'Allahu Akbar'. In sujud, say 'Subhana Rabbiyal A'la' three times.",
          "Rise from sujud saying 'Allahu Akbar' and sit briefly.",
          "Perform a second prostration (Sujud) with the same dhikr.",
          "After the second rakat, sit for the first Tashahhud (Attahiyyat).",
          "In the final rakat, complete the Tashahhud and recite Salawat (Durood) and closing du'as.",
          "Turn head to the right saying 'As-salamu alaykum wa rahmatullah', then to the left.",
        ],
      },
      {
        type: "heading",
        text: "If you make a mistake during prayer",
      },
      {
        type: "paragraph",
        text: "If you accidentally add or omit something non-essential (e.g., forgot the first tashahhud, or doubt how many rakats you prayed), perform Sajdat as-Sahw (two prostrations of forgetfulness) before the final salam. If you doubt the number of rakats, build on what you are certain of and complete the prayer, then add the forgetfulness prostrations.",
      },
    ],
  },

  // ─── WITR PRAYER ───
  {
    id: "witr-prayer",
    title: "Witr Prayer",
    subtitle: "The odd-numbered night prayer",
    category: "sunnah",
    icon: "Star",
    content: [
      {
        type: "intro",
        text: "Witr is a voluntary night prayer performed after Isha. It is the last prayer of the night, ending with an odd number of rakats. The word 'witr' means 'odd'.",
      },
      {
        type: "heading",
        text: "Is Witr obligatory or voluntary?",
      },
      {
        type: "paragraph",
        text: "There is a difference of opinion among the schools of thought:",
      },
      {
        type: "table",
        headers: ["School", "Ruling", "Minimum Rakats"],
        rows: [
          ["Hanafi", "Wajib (necessary)", "3"],
          ["Shafi'i", "Sunnah Mu'akkadah (emphasised)", "1"],
          ["Maliki", "Sunnah Mu'akkadah", "1"],
          ["Hanbali", "Sunnah Mu'akkadah", "1"],
        ],
      },
      {
        type: "hadith",
        text: "Allah has prescribed Witr for you, so pray it.",
        reference: "Sahih al-Bukhari 990",
        grade: "Sahih",
      },
      {
        type: "heading",
        text: "How many rakats?",
      },
      {
        type: "paragraph",
        text: "Witr can be 1, 3, 5, 7, 9, or 11 rakats — any odd number. The most common practice is 3 rakats. The maximum reported from the Prophet ﷺ is 11 rakats.",
      },
      {
        type: "hadith",
        text: "The Witr is a duty for every Muslim. If anyone wishes to observe it with five rak'ahs, he may do so; if anyone wishes to observe it with three, he may do so; and if anyone wishes to observe it with one, he may do so.",
        reference: "Sunan Abi Dawud, authenticated by Al-Albani",
        grade: "Sahih",
      },
      {
        type: "heading",
        text: "When to pray Witr",
      },
      {
        type: "paragraph",
        text: "The time for Witr begins after Isha and lasts until the true dawn (Fajr). The best time is the last third of the night, just before Fajr. However, if you are not confident you will wake up, praying Witr before sleeping after Isha is acceptable.",
      },
      {
        type: "hadith",
        text: "Make the last of your prayer at night Witr.",
        reference: "Sahih al-Bukhari 998",
        grade: "Sahih",
      },
      {
        type: "heading",
        text: "How to pray 3-rakat Witr",
      },
      {
        type: "paragraph",
        text: "There are two main methods depending on your school of thought:",
      },
      {
        type: "steps",
        title: "Option A — Shafi'i / Hanbali / Maliki (two separate units)",
        steps: [
          "Pray 2 rakats as a complete prayer (with tashahhud and salam at the end). This is the 'shafa' (pair).",
          "Then make niyyah for 1 rakat of Witr.",
          "Open with takbir, recite al-Fatihah and a surah (Surah al-Ikhlas is sunnah).",
          "Bow (ruku), rise, then recite the Qunoot du'a while standing.",
          "Complete the rakat with sujud, tashahhud, and salam.",
        ],
      },
      {
        type: "steps",
        title: "Option B — Hanafi (three continuous rakats)",
        steps: [
          "Pray all 3 rakats as one continuous prayer (similar to Maghrib structure).",
          "In the 3rd rakat, after reciting al-Fatihah and a surah, say an additional takbir and raise your hands.",
          "Recite the Qunoot du'a while standing.",
          "Then bow for ruku and complete the prayer normally.",
          "End with one salam after the final tashahhud.",
        ],
      },
      {
        type: "heading",
        text: "Sunnah surahs for Witr",
      },
      {
        type: "paragraph",
        text: "It is sunnah to recite: Surah al-A'la (87) in the first rakat, Surah al-Kafirun (109) in the second, and Surah al-Ikhlas (112) in the third. Some narrations add Surah al-Falaq (113) and Surah an-Nas (114) alongside al-Ikhlas. These are recommended but not obligatory.",
      },
      {
        type: "heading",
        text: "If you miss Witr",
      },
      {
        type: "paragraph",
        text: "If you sleep through Witr or forget it, pray it when you remember. If making it up during the day, add one rakat to make it even (e.g., if your usual Witr is 3, pray 4 as makeup).",
      },
      {
        type: "hadith",
        text: "When the Prophet missed his night prayers due to sleep or illness, he would pray twelve rakats during the day.",
        reference: "Sahih Muslim 746",
        grade: "Sahih",
      },
    ],
  },

  // ─── SUNNAH PRAYERS ───
  {
    id: "sunnah-prayers",
    title: "Sunnah Prayers",
    subtitle: "The voluntary prayers around the fard",
    category: "sunnah",
    icon: "Layers",
    content: [
      {
        type: "intro",
        text: "Sunnah prayers are voluntary prayers that the Prophet ﷺ prayed regularly. They are divided into two types: Sunnah Mu'akkadah (emphasised — rarely left) and Sunnah Ghair Mu'akkadah (non-emphasised — occasionally left).",
      },
      {
        type: "heading",
        text: "The 12 daily sunnah rakats",
      },
      {
        type: "hadith",
        text: "Whoever prays twelve rakats in a day and night, a house will be built for him in Paradise.",
        reference: "Sahih Muslim 728",
        grade: "Sahih",
      },
      {
        type: "table",
        headers: ["Prayer", "Sunnah Rakats", "Type", "Timing"],
        rows: [
          ["Fajr", "2", "Mu'akkadah", "Before fard"],
          ["Dhuhr", "4 + 2", "Mu'akkadah", "4 before, 2 after fard"],
          ["Asr", "4", "Ghair Mu'akkadah", "Before fard"],
          ["Maghrib", "2", "Mu'akkadah", "After fard"],
          ["Isha", "2", "Mu'akkadah", "After fard"],
        ],
      },
      {
        type: "heading",
        text: "The most emphasised sunnah",
      },
      {
        type: "hadith",
        text: "Do not abandon the two rakats before Fajr, even if cavalry trample you.",
        reference: "Musnad Ahmad, Abu Dawud",
        grade: "Sahih",
      },
      {
        type: "note",
        text: "The 2 sunnah rakats before Fajr are the most emphasised of all sunnah prayers. The Prophet ﷺ never left them, even while travelling.",
      },
    ],
  },
];
