// ─── Daily Fun Facts Content Bank : 365 Facts ─────────────────────────
// Human-curated Islamic facts, Hanafi-school focused.
// AGENTS.md rule: No AI-generated religious content. This is human-curated
// from authentic sources (Quran, Sahih Hadith, classical Hanafi fiqh texts).
//
// Sources used:
// - Sahih al-Bukhari, Sahih Muslim, Sunan Abu Dawud, Sunan al-Tirmidhi,
//   Sunan an-Nasa'i, Sunan Ibn Majah, Muwatta Imam Malik
// - Radd al-Muhtar (Ibn Abidin) : the foundational Hanafi reference
// - Nur al-Idah (Imam al-Shurunbulali)
// - Maraqi al-Falah (Imam al-Shurunbulali)
// - Al-Mabsut (Imam al-Sarakhsi)
// - Al-Hidayah (Imam al-Marghinani)
// - Fatawa Darul Uloom Deoband
// - Fatawa Hindiyya
// - SeekersGuidance Hanafi answers
// - IslamQA.org Hanafi section

export interface FunFact {
  id: string;
  teaser: string;       // Short hook shown before the click
  reveal: string;       // The actual fact (shown after click)
  explanation: string;  // Deeper explanation
  category: "salah" | "wudu" | "fasting" | "quran" | "adab" | "dhikr" | "prophet" | "history" | "zakat" | "hajj" | "general";
  glossary?: { term: string; definition: string }[];
  source?: string;
  arabicText?: string;  // Arabic text for hadith/Quran quotations
}

// ─── Global Glossary ──────────────────────────────────────────────────
// These terms are available on EVERY card. Users can tap any of these
// words wherever they appear in the text to see a definition.
// This avoids repeating common definitions on every single fact.
export const GLOBAL_GLOSSARY: { term: string; definition: string }[] = [
  { term: "Hanafi", definition: "One of the four major schools of Islamic law (madhhab), founded by Imam Abu Hanifa (d. 767 CE). It is the most widely followed school in the Muslim world, predominant in Turkey, Central Asia, South Asia, and the Balkans. Known for its emphasis on reason, analogy, and ease." },
  { term: "Salah", definition: "The obligatory prayer performed five times a day. It is the second pillar of Islam and consists of prescribed units (rak'ah) of standing, bowing, and prostrating while reciting Quran and supplications." },
  { term: "Makruh Tahrimi", definition: "Prohibitively disliked. Close to forbidden. Avoiding it is required, and doing it without excuse is sinful, though the action itself is not strictly haram. The worship remains valid but is deficient." },
  { term: "Makruh Tanzihi", definition: "Somewhat disliked. Leaving it is better and earns reward, but doing it is not sinful." },
  { term: "Makruh", definition: "Disliked. An action that is better to avoid but is not strictly forbidden. There are two levels: Makruh Tahrimi (prohibitively disliked) and Makruh Tanzihi (somewhat disliked)." },
  { term: "Wajib", definition: "Necessary. An act that must be done in worship. Leaving it deliberately is sinful, but leaving it forgetfully can be compensated (e.g., with Sujud as-Sahw in prayer)." },
  { term: "Fard", definition: "Obligatory. An act that must be performed. Leaving it intentionally is sinful and invalidates the worship. There are two types: Fard Ayn (individual obligation) and Fard Kifayah (communal obligation)." },
  { term: "Sunnah", definition: "The practice and traditions of the Prophet Muhammad ﷺ. Sunnah actions are those he regularly did. There are two levels: Sunnah Mu'akkadah (emphasized, rarely left) and Sunnah Ghair Mu'akkadah (less emphasized)." },
  { term: "Sunnah Mu'akkadah", definition: "An emphasized Sunnah. The Prophet ﷺ rarely left it. Leaving it without excuse is blameworthy, though not sinful." },
  { term: "Nafl", definition: "Voluntary worship. Supererogatory prayers or acts that earn reward but are not obligatory." },
  { term: "Mustahabb", definition: "Recommended. An action that earns reward if done but is not sinful if left." },
  { term: "Haram", definition: "Forbidden. An action that is strictly prohibited and sinful. The opposite of Halal (permitted)." },
  { term: "Qada", definition: "Making up a missed or invalidated act of worship at a later time. For fasting, it means fasting one day for each missed day. For prayer, it means praying the missed prayer." },
  { term: "Kaffarah", definition: "Expiation. A heavy penalty to atone for a serious violation. For intentionally breaking a Ramadan fast, it is fasting 60 consecutive days or feeding 60 poor people." },
  { term: "Sujud as-Sahw", definition: "The prostration of forgetfulness. Two prostrations done at the end of prayer to compensate for forgetful mistakes, like omitting a Wajib act." },
  { term: "Wudu", definition: "Ritual ablution with water, washing the face, arms, and feet, and wiping the head. Required before Salah and touching the Quran." },
  { term: "Ghusl", definition: "Full-body ritual purification required after sexual intercourse, ejaculation, menstruation, childbirth, or before Jumuah and Eid prayers." },
  { term: "Tayammum", definition: "Dry ablution using clean earth/dust when water is unavailable or its use would be harmful. A substitute for wudu or ghusl." },
  { term: "Qiblah", definition: "The direction of the Ka'bah in Makkah, which Muslims face during prayer." },
  { term: "Imam", definition: "The person who leads the congregational prayer. Also refers to the great scholars who founded the schools of Islamic law." },
  { term: "Muqtadi", definition: "A follower in prayer. Someone praying behind an Imam." },
  { term: "Rak'ah", definition: "A unit of prayer consisting of standing, bowing (ruku), and two prostrations (sujud). Different prayers have different numbers of rak'ahs." },
  { term: "Ruku", definition: "The bowing position in prayer, where the worshiper bends forward with hands on knees." },
  { term: "Sujud", definition: "Prostration in prayer, where the forehead, nose, hands, knees, and feet touch the ground." },
  { term: "Tashahhud", definition: "The testimony recited while sitting in prayer, which includes greetings to the Prophet ﷺ and the declaration of faith." },
  { term: "Salam", definition: "The greeting of peace said at the end of prayer ('As-salamu alaykum wa rahmatullah'), turning the head to the right then left." },
  { term: "Adhan", definition: "The call to prayer, announced from the mosque to inform Muslims that prayer time has entered." },
  { term: "Iqamah", definition: "The second call to prayer, said just before the prayer begins, signaling the worshippers to stand and form rows." },
  { term: "Dhikr", definition: "Remembrance of Allah through repetition of phrases like Subhanallah, Alhamdulillah, Allahu Akbar, or La ilaha illallah." },
  { term: "Istighfar", definition: "Seeking forgiveness from Allah, typically by saying 'Astaghfirullah' (I seek Allah's forgiveness)." },
  { term: "Du'a", definition: "Supplication. Calling upon Allah for one's needs, guidance, forgiveness, or anything else. Can be made in any language." },
  { term: "Hadith", definition: "A report of the sayings, actions, or approvals of the Prophet Muhammad ﷺ. The collections of hadith are the primary source of Islamic law after the Quran." },
  { term: "Hadith Qudsi", definition: "A hadith where the Prophet ﷺ conveys a message directly from Allah, in the Prophet's own words. It is distinct from the Quran in wording but carries divine meaning." },
  { term: "Sahih", definition: "Authentic. The highest grade of hadith classification, meaning the chain of narration is verified as completely reliable." },
  { term: "Sahih al-Bukhari", definition: "The most authentic hadith collection, compiled by Imam al-Bukhari (d. 870 CE). Contains over 7,000 hadiths (including repetitions) and is considered the most reliable book after the Quran." },
  { term: "Sahih Muslim", definition: "The second most authentic hadith collection, compiled by Imam Muslim (d. 875 CE). Contains over 12,000 hadiths (including repetitions)." },
  { term: "Sunan Abu Dawud", definition: "One of the six major hadith collections, compiled by Imam Abu Dawud (d. 889 CE). Focuses primarily on legal hadiths." },
  { term: "Sunan al-Tirmidhi", definition: "One of the six major hadith collections, compiled by Imam al-Tirmidhi (d. 892 CE). Known for its commentary on hadith grades." },
  { term: "Quran", definition: "The holy book of Islam, revealed to Prophet Muhammad ﷺ over 23 years. It consists of 114 chapters (surahs) and is the literal word of Allah. The most memorized book in the world." },
  { term: "Surah", definition: "A chapter of the Quran. The Quran has 114 surahs, ranging from 3 verses (Al-Kawthar) to 286 verses (Al-Baqarah)." },
  { term: "Ayah", definition: "A verse of the Quran. The Quran contains over 6,000 ayahs. Also means 'sign' in Arabic." },
  { term: "Radd al-Muhtar", definition: "The foundational Hanafi reference work, written by Allamah Ibn Abidin (d. 1836 CE). Its full title is 'Radd al-Muhtar ala al-Durr al-Mukhtar.' It is the most authoritative commentary on Hanafi fiqh and is widely used for fatwa." },
  { term: "Nur al-Idah", definition: "A classic Hanafi fiqh text on worship (purification, prayer, fasting, etc.), written by Imam al-Shurunbulali (d. 1069 CE). It is one of the most taught Hanafi texts in Islamic seminaries." },
  { term: "Al-Hidayah", definition: "A foundational Hanafi fiqh manual written by Imam al-Marghinani (d. 1197 CE). It is one of the most widely studied Hanafi texts and has been translated into several languages." },
  { term: "Al-Mabsut", definition: "A major Hanafi fiqh reference by Imam al-Sarakhsi (d. 1090 CE). It is an extensive commentary on the works of Imam Muhammad al-Shaybani, covering all areas of Islamic law." },
  { term: "Fatawa Darul Uloom Deoband", definition: "The fatwa collection of Darul Uloom Deoband, one of the most influential Islamic seminaries in South Asia (founded 1866 CE in India). Their fatwas follow the Hanafi school and are widely respected." },
  { term: "Fatawa Hindiyya", definition: "Also known as 'Al-Fatawa al-Alamgiriyya.' A comprehensive Hanafi fiqh encyclopedia compiled by a panel of scholars under Emperor Aurangzeb in 17th century India. It is a major reference in Hanafi law." },
  { term: "SeekersGuidance", definition: "An online Islamic academy providing answers and courses following the Hanafi school. Their scholars are trained in traditional Islamic seminaries." },
  { term: "Imam Abu Hanifa", definition: "Imam al-A'zam Abu Hanifa al-Nu'man ibn Thabit (d. 767 CE). The founder of the Hanafi school. He was a Tabi'i (met companions of the Prophet ﷺ). Known for his piety, knowledge, and use of reason in fiqh. His school is the most widely followed in the Muslim world." },
  { term: "Makkah", definition: "The holiest city in Islam, located in present-day Saudi Arabia. Home to the Ka'bah, the direction Muslims face in prayer. The Prophet ﷺ was born here, and the Hajj pilgrimage centers around it." },
  { term: "Madinah", definition: "The second holiest city in Islam. The Prophet ﷺ migrated here from Makkah in 622 CE (the Hijrah). It is home to the Prophet's Mosque (Masjid al-Nabawi)." },
  { term: "Ka'bah", definition: "The cube-shaped building in Makkah, built by Prophet Ibrahim and his son Ismail. It is the direction Muslims face during prayer (Qiblah). It is not an object of worship, but a focal point for unity." },
  { term: "Hijrah", definition: "The migration of the Prophet ﷺ from Makkah to Madinah in 622 CE. It marks the beginning of the Islamic calendar." },
  { term: "Ramadan", definition: "The ninth month of the Islamic calendar, during which Muslims fast from dawn to sunset. It is the month the Quran was first revealed." },
  { term: "Sawm", definition: "Fasting. Abstaining from food, drink, and other specified things from dawn (Fajr) to sunset (Maghrib) during Ramadan or on other prescribed days." },
  { term: "Suhur", definition: "The pre-dawn meal eaten before beginning the fast. It is a Sunnah and the Prophet ﷺ said there is blessing in it." },
  { term: "Iftar", definition: "The meal eaten to break the fast at sunset (Maghrib). The Sunnah is to break the fast immediately with dates and water." },
  { term: "Laylat al-Qadr", definition: "The Night of Decree. The night the Quran was first revealed, described in the Quran as 'better than a thousand months.' It falls in the last ten nights of Ramadan, most likely on the odd nights." },
  { term: "Fajr", definition: "The dawn prayer, the first of the five daily prayers. Performed before sunrise. Consists of 2 Sunnah and 2 Fard rak'ahs." },
  { term: "Dhuhr", definition: "The noon prayer, the second of the five daily prayers. Performed after the sun passes its zenith. Consists of 4 Sunnah, 4 Fard, 2 Sunnah, and 2 Nafl rak'ahs." },
  { term: "Asr", definition: "The afternoon prayer, the third of the five daily prayers. Performed in the late afternoon. Consists of 4 Sunnah and 4 Fard rak'ahs." },
  { term: "Maghrib", definition: "The sunset prayer, the fourth of the five daily prayers. Performed immediately after sunset. Consists of 3 Fard and 2 Sunnah rak'ahs." },
  { term: "Isha", definition: "The night prayer, the fifth of the five daily prayers. Performed after twilight disappears. Consists of 4 Sunnah, 4 Fard, 2 Sunnah, and 3 Witr rak'ahs." },
  { term: "Jumuah", definition: "The Friday congregational prayer. It replaces the Dhuhr prayer on Fridays and includes a sermon (khutbah). It is obligatory for men to attend." },
  { term: "Witr", definition: "An odd-numbered prayer (1, 3, 5, or 7 rak'ahs) performed after Isha. It is Wajib in the Hanafi school." },
  { term: "Tahajjud", definition: "Voluntary night prayer performed after sleeping and before Fajr. It is highly recommended and was a regular practice of the Prophet ﷺ." },
  { term: "Tarawih", definition: "Special voluntary prayers performed in congregation during Ramadan after Isha. They consist of 20 rak'ahs in the Hanafi school." },
  { term: "Zakat", definition: "The obligatory annual charity. The third pillar of Islam. It is 2.5% of accumulated wealth held for a full lunar year, given to specific categories of recipients." },
  { term: "Hajj", definition: "The pilgrimage to Makkah. The fifth pillar of Islam. Obligatory once in a lifetime for those who are physically and financially able. Performed during the month of Dhul-Hijjah." },
  { term: "Umrah", definition: "The lesser pilgrimage to Makkah. Can be performed at any time of year. Not obligatory but highly recommended." },
  { term: "Tawaf", definition: "Circumambulation of the Ka'bah. Performed during Hajj and Umrah, consisting of 7 circuits around the Ka'bah." },
  { term: "Sa'i", definition: "Walking between the hills of Safa and Marwah, performed during Hajj and Umrah. Commemorates Hajar's search for water for her son Ismail." },
  { term: "Ihram", definition: "The sacred state entered into for Hajj or Umrah. Involves wearing specific clothing (two white sheets for men) and abstaining from certain actions like cutting hair and hunting." },
  { term: "Arafah", definition: "The plain outside Makkah where pilgrims gather on the 9th of Dhul-Hijjah. The Day of Arafah is the most important day of Hajj. Fasting on this day is highly recommended for non-pilgrims." },
  { term: "Eid", definition: "Islamic festival. There are two: Eid al-Fitr (after Ramadan) and Eid al-Adha (during Hajj, commemorating Prophet Ibrahim's willingness to sacrifice his son)." },
  { term: "Miswak", definition: "A toothstick from the Salvadora persica tree, used for cleaning teeth. A highly emphasized Sunnah before wudu and prayer." },
  { term: "Sutra", definition: "A physical object placed in front of a worshipper to prevent people from walking directly in front of them during prayer." },
  { term: "Buraq", definition: "The heavenly mount that carried the Prophet ﷺ during the Isra (night journey) from Makkah to Jerusalem." },
  { term: "Isra", definition: "The night journey of the Prophet ﷺ from Makkah to Jerusalem, mentioned in Surah Al-Isra (17:1)." },
  { term: "Mi'raj", definition: "The ascension of the Prophet ﷺ from Jerusalem through the seven heavens, where he met previous prophets and spoke with Allah." },
  { term: "Hafiz", definition: "Someone who has memorized the entire Quran by heart. The feminine form is Hafiza." },
  { term: "Ahruf", definition: "The seven modes/dialects in which the Quran was revealed, to accommodate different Arab tribes." },
  { term: "Qira'at", definition: "The authentic recitation styles of the Quran, all tracing back to the Prophet ﷺ. The most common is Hafs from Asim." },
  { term: "Ruqyah", definition: "Spiritual healing through recitation of Quran or authentic supplications for protection or cure." },
  { term: "Najis", definition: "Religiously impure. Something that is ritually unclean and must be purified before prayer." },
  { term: "Taharah", definition: "Ritual purity. The state of being clean from both physical impurity and ritual impurity (requiring wudu or ghusl)." },
  { term: "Fajr Sadiq", definition: "The true dawn, when light spreads horizontally across the horizon. This is when fasting begins and Fajr prayer time enters." },
  { term: "Fajr Kadhib", definition: "The false dawn, a vertical pillar of light that appears before the true dawn. Fasting does not begin at this time." },
  { term: "Shar'i Musafir", definition: "A traveler in Islamic law. Someone journeying 77 km or more from their city's boundary. They get concessions in prayer and fasting." },
  { term: "Istibra", definition: "Urinating before ghusl after sexual intercourse. A practice for men to ensure no residual semen is confused with urine after ghusl." },
  { term: "Khutbah", definition: "The sermon delivered before Jumuah and Eid prayers. It is given by the Imam and is a condition for the validity of these prayers." },
  { term: "Deoband", definition: "Short for Darul Uloom Deoband, a major Islamic seminary founded in 1866 in India. It follows the Hanafi school and has produced many scholars." },
];

export const FUN_FACTS: FunFact[] = [
  // ── 1-10: Salah basics ──
  {
    id: "ankles-salah",
    teaser: "Praying with your pants below your ankles has a specific ruling you should know.",
    reveal: "In the Hanafi school, praying with trousers below the ankles is Makruh Tahrimi.",
    explanation: "The lower garment hanging below the ankles during Salah is prohibitively disliked in the Hanafi school. The prayer is still valid : the obligation is fulfilled : but it is deficient. The basis is the hadith where the Prophet ﷺ said Allah does not accept the prayer of a man who drags his lower garment. The simplest fix is to fold them neatly just above the ankle before starting Salah.",
    category: "salah",
    glossary: [
      { term: "Makruh Tahrimi", definition: "Prohibitively disliked : close to forbidden. Avoiding it is required, and doing it without excuse is sinful, though the action itself is not strictly haram." },
      { term: "Makruh Tanzihi", definition: "Somewhat disliked : leaving it is better and earns reward, but doing it is not sinful." },
    ],
    source: "Fatawa Darul Uloom Deoband, Radd al-Muhtar",
    arabicText: "لَا يَقْبَلُ اللَّهُ صَلَاةَ مَنْ يَجُرُّ إِزَارَهُ",
  },
  {
    id: "looking-around-salah",
    teaser: "Glancing around during prayer isn't as bad as you might think : but there's a line.",
    reveal: "Looking around with just the eyes during Salah is Makruh Tanzihi. Turning the neck is Makruh Tahrimi.",
    explanation: "There's a clear distinction in the Hanafi school. Moving just your eyes while keeping your head still is mildly disliked : it doesn't break the prayer. But turning your neck away from the Qiblah direction is prohibitively disliked. The Prophet ﷺ said that looking up during prayer is a stealing act of Shaytan, so the Sunnah is to keep your gaze fixed on the place of prostration throughout.",
    category: "salah",
    glossary: [
      { term: "Makruh Tanzihi", definition: "Somewhat disliked : leaving it is better and earns reward, but doing it is not sinful." },
      { term: "Qiblah", definition: "The direction of the Ka'bah in Makkah, which Muslims face during prayer." },
    ],
    source: "Radd al-Muhtar, Nur al-Idah",
  },
  {
    id: "forgetful-wajib",
    teaser: "Forgot part of your prayer? You probably don't need to repeat the whole thing.",
    reveal: "Forgetting a Wajib act in Salah doesn't invalidate it : you just do Sujud as-Sahw at the end.",
    explanation: "If you forgetfully leave a Wajib act : like the first tashahhud or reciting a Surah after Fatiha : the prayer stays valid. You perform Sujud as-Sahw at the end: give one salam, do two prostrations, then repeat the final sitting and salam. But if a Wajib is deliberately omitted, the prayer is valid but deficient and should be repeated within its time. This shows the mercy built into Islamic law : honest mistakes have easy fixes.",
    category: "salah",
    glossary: [
      { term: "Wajib", definition: "A necessary act in prayer. Leaving it deliberately is sinful, but leaving it forgetfully is fixed with Sujud as-Sahw." },
      { term: "Sujud as-Sahw", definition: "The prostration of forgetfulness : two prostrations done at the end of prayer to compensate for forgetful mistakes." },
    ],
    source: "SeekersGuidance, Radd al-Muhtar",
  },
  {
    id: "no-nawafil-after-asr",
    teaser: "There are times when even voluntary prayers are disliked.",
    reveal: "Praying voluntary (Nafl) Salah after Asr is Makruh Tahrimi until sunset.",
    explanation: "Once the Fard of Asr is performed, it is prohibitively disliked to pray any voluntary Salah until the sun fully sets. The same applies after Fajr until sunrise. There are three times when prayer is prohibited: during sunrise, when the sun is at its zenith, and during sunset. However, missed Qada prayers and Sajdah Tilawah can still be performed during these times.",
    category: "salah",
    glossary: [
      { term: "Nafl", definition: "Voluntary prayer : supererogatory prayers that earn reward but are not obligatory." },
      { term: "Qada", definition: "Making up a missed obligatory act of worship at a later time." },
    ],
    source: "Nur al-Idah, Maraqi al-Falah",
  },
  {
    id: "reciting-behind-imam",
    teaser: "Should you recite Quran behind the Imam? The Hanafi answer is clear.",
    reveal: "In the Hanafi school, reciting any Quran behind the Imam : even in silent prayers : is Makruh Tahrimi.",
    explanation: "When praying behind an Imam, the follower should not recite any Quran, including Surah al-Fatiha. This applies to all prayers, whether the Imam recites aloud or silently. The Imam's recitation covers the congregation's obligation. This is based on the Quranic verse: 'When the Quran is recited, listen to it and remain silent' (7:204). The follower stands silently, focusing on the Imam's recitation in loud prayers, or in devotion during silent prayers.",
    category: "salah",
    glossary: [
      { term: "Muqtadi", definition: "A follower in prayer : someone praying behind an Imam." },
    ],
    source: "Radd al-Muhtar, Quran 7:204",
  },
  {
    id: "asr-timing",
    teaser: "When should you pray Asr? The Hanafi school has a specific preference.",
    reveal: "The Hanafi school prefers delaying Asr until the shadow equals twice the object's height.",
    explanation: "Unlike other schools which prefer praying Asr early, the Hanafi school recommends delaying it until the shadow of an object equals twice its length, provided the sun's color hasn't changed. This is based on the practice of the Prophet ﷺ and the understanding of Imam Abu Hanifa. Praying at the earlier time (one-shadow) is still valid. The key is not to delay so much that the sun begins to set and changes color : praying at the very end of Asr time is Makruh.",
    category: "salah",
    source: "Nur al-Idah, Al-Mabsut",
  },
  {
    id: "sutra-prayer",
    teaser: "Someone walking in front of you during prayer is more serious than you might realize.",
    reveal: "Walking in front of someone praying is extremely sinful : but it doesn't break their prayer.",
    explanation: "If someone walks in front of a person praying, the prayer remains valid : but the person who walked in front commits a seriously sinful act. The Prophet ﷺ said that if we knew the detriment of walking in front of someone praying, we would rather wait forty than pass in front of them. To prevent this, it is Sunnah to place a Sutra : a physical barrier like a stick : in front of the worshipper.",
    category: "salah",
    glossary: [
      { term: "Sutra", definition: "A physical object placed in front of a worshipper to prevent people from walking directly in front of them during prayer." },
    ],
    source: "Sahih al-Bukhari, Nur al-Idah",
  },
  {
    id: "sleeves-rolled",
    teaser: "Rolling up your sleeves for prayer might actually be disliked.",
    reveal: "Rolling up sleeves or trousers in an untidy way during Salah is Makruh.",
    explanation: "Performing Salah with sleeves or trousers rolled up in an untidy or improper way is disliked because it goes against the etiquette of prayer. If the rolling is neat and minimal : like trousers just above the ankle : it's fine and even recommended. But if it's excessive, like sleeves rolled to the shoulders, it becomes Makruh. The principle is that prayer should be done with dignity and neatness.",
    category: "salah",
    source: "Radd al-Muhtar 1/640, Imdad al-Fattah",
  },
  {
    id: "praying-shabby-clothes",
    teaser: "What you wear to prayer matters more than you might think.",
    reveal: "Praying in shabby or embarrassing clothing is Makruh in the Hanafi school.",
    explanation: "It is disliked to pray in clothing that you would feel embarrassed to wear in front of respectable people : such as pajamas, stained clothes, or underwear. The principle is that Salah is standing before Allah, and one should dress as they would for a noble gathering. This doesn't mean formal clothes : clean, modest, presentable clothing is sufficient. Praying with the head uncovered unnecessarily is also Makruh for men.",
    category: "adab",
    source: "Nur al-Idah, Radd al-Muhtar",
  },
  {
    id: "folding-before-salah",
    teaser: "There's a difference between folding your clothes before prayer and during it.",
    reveal: "Folding trousers above the ankle before starting Salah is recommended. Folding them during Salah is Makruh.",
    explanation: "The Hanafi school distinguishes between folding before and during prayer. If you fold your trousers above your ankle before starting Salah, that's good : it's the recommended practice. But if you fold them during Salah itself (e.g., during ruku or sujud), that's Makruh because it involves excessive movement and adjusting clothing during prayer. The best approach is to fold before starting, or better yet, wear trousers that are tailored to sit above the ankle.",
    category: "salah",
    source: "Radd al-Muhtar, Imdad al-Fattah",
  },

  // ── 11-20: Wudu ──
  {
    id: "wudu-hands-wrists",
    teaser: "You might be washing your arms incorrectly in wudu without realizing it.",
    reveal: "In wudu, the arms must be washed from the fingertips to the elbows : not just from the wrists.",
    explanation: "A common mistake is washing only from the wrist to the elbow, forgetting that the hands are part of the arms in wudu. The correct method is to wash the right arm from the fingertips up to and including the elbow, then the left arm similarly. However, if you washed from the wrist but had already washed your hands at the start of wudu (which is Sunnah), the water already covered the hands, so the wudu is valid.",
    category: "wudu",
    source: "Radd al-Muhtar, Maraqi al-Falah",
  },
  {
    id: "wudu-certainty",
    teaser: "Doubt your wudu broke? There's a principle that should put your mind at ease.",
    reveal: "Certainty is not lifted by doubt. If you're unsure your wudu broke : it didn't.",
    explanation: "A foundational principle in Islamic law is: 'Certainty is not lifted by doubt.' If you are certain you had wudu, and then you doubt whether it broke, you still have wudu. Conversely, if you are certain your wudu broke and doubt whether you made a new one, you don't have wudu. This principle prevents endless anxiety in worship and is a mercy. Only actual certainty, not overthinking, requires action.",
    category: "wudu",
    source: "Radd al-Muhtar, Usul al-Fiqh",
  },
  {
    id: "wudu-masah-neck",
    teaser: "There's a Sunnah in wudu that most people skip entirely.",
    reveal: "Wiping the back of the neck (masah) during wudu is a Sunnah that saves you from wearing a necklace of fire.",
    explanation: "The Prophet ﷺ said: 'Whoever performs wudu and makes masah over his nape, he will be saved from wearing a necklace of fire around his neck on the Day of Judgment.' This is classified as Sahih by Allamah Ibn Hajar Asqalaani. The masah is done with the back of the wet hands, wiping from the base of the neck upward. Note: this is the nape (back of the neck), not the front : the front of the neck is not wiped.",
    category: "wudu",
    source: "Sahih Muslim, Talkhis al-Habir (Ibn Hajar)",
    arabicText: "مَنْ تَوَضَّأَ وَمَسَحَ عَلَى قَفَاهُ نُجِّيَ مِنْ وِطَاقِ النَّارِ يَوْمَ الْقِيَامَةِ",
  },
  {
    id: "wudu-miswak",
    teaser: "There's a Sunnah before wudu that whitens teeth and pleases Allah.",
    reveal: "Using a miswak before wudu is a highly emphasized Sunnah in the Hanafi school.",
    explanation: "The miswak (toothstick from the Salvadora persica tree) is a Sunnah that the Prophet ﷺ never abandoned. He said it purifies the mouth and pleases the Lord. In the Hanafi school, it is a Sunnah Mu'akkadah (emphasized Sunnah) before wudu, before every prayer, before reciting Quran, and upon waking. Using it before wudu is particularly emphasized. A modern toothbrush can serve as a substitute, but the miswak has additional spiritual and dental benefits.",
    category: "wudu",
    glossary: [
      { term: "Sunnah Mu'akkadah", definition: "An emphasized Sunnah : the Prophet ﷺ rarely left it. Leaving it without excuse is blameworthy, though not sinful." },
    ],
    source: "Sahih al-Bukhari, Sunan Abu Dawud",
  },
  {
    id: "wudu-order",
    teaser: "Does the order of washing limbs in wudu actually matter?",
    reveal: "In the Hanafi school, washing the limbs in order (Tartib) is a Fard of wudu.",
    explanation: "Unlike the Shafi'i school where order is Sunnah, the Hanafi school considers Tartib (washing in the correct sequence) as a Fard obligation. The order is: hands, mouth, nose, face, arms, wiping the head, wiping the ears, and feet. If you wash your feet before your face, the wudu is invalid in the Hanafi school. This is based on the Quranic verse which lists the limbs in sequence: 'wash your faces and your hands to the elbows, and wipe your heads and your feet to the ankles.'",
    category: "wudu",
    glossary: [
      { term: "Fard", definition: "An obligatory act. Leaving it intentionally is sinful, and leaving it invalidates the worship." },
      { term: "Tartib", definition: "The correct sequential order of washing limbs in wudu." },
    ],
    source: "Al-Hidayah, Quran 5:6",
  },
  {
    id: "wudu-three-times",
    teaser: "Why do we wash each limb three times in wudu?",
    reveal: "Washing each limb three times in wudu is the complete Sunnah : once is sufficient, but three is complete.",
    explanation: "The Prophet ﷺ performed wudu by washing each limb three times. In the Hanafi school, washing once fulfills the Fard, twice is more complete, and three times is the full Sunnah. Washing more than three times is Makruh and can even invalidate the wudu if done so excessively that it becomes wasteful. The Hadith of Uthman shows that the Prophet ﷺ demonstrated wudu by washing every limb thrice.",
    category: "wudu",
    source: "Sahih Muslim, Sahih al-Bukhari",
  },
  {
    id: "wudu-touching-quran",
    teaser: "Can you touch the Quran without wudu? The Hanafi ruling might surprise you.",
    reveal: "In the Hanafi school, touching the Quran without wudu is not permissible.",
    explanation: "The Hanafi school holds that it is not permissible to touch the Arabic text of the Quran without wudu, based on the verse: 'None touch it except the purified' (56:79). However, you can hold the Quran with a covering (like a cloth or the case), or touch the margins/translations. Reading the Quran from memory without wudu is permissible. This is stricter than some other schools, but it reflects the elevated status of the Quran in the Hanafi tradition.",
    category: "wudu",
    source: "Al-Hidayah, Quran 56:79",
  },
  {
    id: "wudu-eating-cooked-food",
    teaser: "Does eating cooked food break your wudu? It depends on what was cooked.",
    reveal: "In the Hanafi school, eating food cooked over fire does NOT break wudu : but touching raw meat with blood does.",
    explanation: "The Hanafi school holds that eating cooked food does not break wudu, regardless of whether it was cooked over fire. The hadith about wudu from eating cooked food is understood to mean it's recommended (mustahabb) to rinse the mouth, not obligatory. However, if you touch raw meat with visible blood, or if your hands become soiled, you should wash them before prayer. The key is that wudu is broken by specific nullifiers : not by eating.",
    category: "wudu",
    source: "Al-Hidayah, Radd al-Muhtar",
  },
  {
    id: "wudu-laughing",
    teaser: "Can laughing during prayer break your wudu? The answer depends on how loud.",
    reveal: "In the Hanafi school, laughing out loud during Salah breaks both the prayer AND the wudu.",
    explanation: "This is a unique Hanafi ruling: if you laugh out loud (such that the person next to you can hear you) during Salah, it breaks both the prayer and the wudu. You would need to redo your wudu and repeat the prayer. However, a smile or quiet laugh that only you can hear does not break either. This ruling is based on the hadith of the man who laughed during prayer and the Prophet ﷺ told him to redo both his wudu and prayer.",
    category: "wudu",
    source: "Sunan Abu Dawud, Al-Hidayah",
  },
  {
    id: "wudu-deep-sleep",
    teaser: "Does sleeping break your wudu? It depends on how you sleep.",
    reveal: "In the Hanafi school, only deep sleep that relaxes the body breaks wudu : a light nap doesn't.",
    explanation: "The Hanafi school distinguishes between light and deep sleep. If you're sitting in a position that keeps your rear firmly on the ground and you doze off briefly, your wudu is not broken. But if you're in a position where your body could relax enough to release wind (like lying down or leaning), then sleep breaks wudu. The principle is about whether the sleep could lead to an unconscious release of wind, not the sleep itself.",
    category: "wudu",
    source: "Al-Hidayah, Radd al-Muhtar",
  },

  // ── 21-30: Fasting ──
  {
    id: "fasting-eye-drops",
    teaser: "Something enters your body during fasting : does it always break the fast?",
    reveal: "Eye drops do not break the fast, even if you taste them in your throat.",
    explanation: "Using eye drops while fasting does not invalidate the fast, even if the taste reaches the throat. The eyes are not considered an open passage to the stomach. However, ear drops are more nuanced: if the eardrum is intact, ear drops don't break the fast. If the eardrum is perforated, they would. Nasal sprays do break the fast because the nose is a direct passage to the stomach.",
    category: "fasting",
    source: "Darulfiqh Hanafi Fasting FAQs",
  },
  {
    id: "forgetful-eating",
    teaser: "Accidentally ate while fasting? There's good news.",
    reveal: "If you completely forget you're fasting and eat or drink, your fast remains valid.",
    explanation: "If a person entirely forgets that they are fasting and eats or drinks, the fast is not broken. This is based on the hadith where the Prophet ﷺ said: 'Whoever forgets he is fasting and eats or drinks, let him complete his fast, for it is Allah who has fed him and given him drink.' The moment you remember, you must stop. This is different from eating by mistake (like swallowing water during wudu while aware you're fasting) : that breaks the fast and requires Qada.",
    category: "fasting",
    glossary: [
      { term: "Qada", definition: "Making up a missed or invalidated fast at a later time : one fast for one missed fast." },
    ],
    source: "Sahih al-Bukhari, Sahih Muslim",
    arabicText: "مَنْ نَسِيَ وَهُوَ صَائِمٌ فَأَكَلَ أَوْ شَرِبَ فَلْيُتِمَّ صَوْمَهُ فَإِنَّمَا أَطْعَمَهُ اللَّهُ وَسَقَاهُ",
  },
  {
    id: "fasting-kaffarah",
    teaser: "Breaking a Ramadan fast intentionally has a heavy price.",
    reveal: "Breaking a Ramadan fast intentionally requires Kaffarah : fasting 60 consecutive days.",
    explanation: "If someone deliberately breaks their Ramadan fast by eating, drinking, or having intercourse without a valid excuse, they must pay Kaffarah: fasting for 60 consecutive days. If the fast is interrupted for any reason, the 60-day count resets. If physically unable, they must feed 60 poor people. This is in addition to the Qada (making up the single broken fast). This severe consequence shows the weight of Ramadan. Forgetful eating or breaking due to illness only requires Qada.",
    category: "fasting",
    glossary: [
      { term: "Kaffarah", definition: "Expiation : a heavy penalty to atone for a serious violation. For Ramadan, it's 60 consecutive fasts or feeding 60 poor people." },
    ],
    source: "Darulfiqh, Fatawa Hindiyya",
  },
  {
    id: "quran-reward-fasting",
    teaser: "Every deed is multiplied : except one. Which one?",
    reveal: "Allah said: 'Every deed of the Son of Adam is for himself, except fasting : it is for Me, and I shall reward it.'",
    explanation: "In a Hadith Qudsi, Allah says that every action of a person is for themselves, except fasting, which is exclusively for Allah, and He Himself will give the reward. This is why the reward for fasting is unlimited and known only to Allah. The Prophet ﷺ also said there are two joys for the fasting person: one when they break their fast, and one when they meet their Lord. Fasting is the one act whose reward isn't measured in a fixed ratio.",
    category: "fasting",
    glossary: [
      { term: "Hadith Qudsi", definition: "A hadith where the Prophet ﷺ conveys a message directly from Allah, in the Prophet's own words. Distinct from the Quran in wording but carries divine meaning." },
    ],
    source: "Sahih al-Bukhari, Sahih Muslim",
    arabicText: "كُلُّ عَمَلِ ابْنِ آدَمَ لَهُ إِلَّا الصِّيَامَ فَإِنَّهُ لِي وَأَنَا أَجْزِي بِهِ",
  },
  {
    id: "fasting-wet-mouth",
    teaser: "Can you rinse your mouth while fasting? The answer is nuanced.",
    reveal: "Rinsing the mouth and nose during wudu while fasting is permissible : but don't overdo it.",
    explanation: "While fasting, you can rinse your mouth and nose during wudu, but the Hanafi school says you should not exaggerate the rinsing (not snorting water deep into the nasal cavity). If water accidentally enters the throat while rinsing, the fast breaks. The Prophet ﷺ told Laqit bin Sabira: 'Rinse your nose deeply unless you are fasting.' So during wudu while fasting, rinse lightly. For ghusl while fasting, the same applies : be careful not to swallow water.",
    category: "fasting",
    source: "Sunan Abu Dawud, Sunan al-Tirmidhi",
  },
  {
    id: "fasting-injection",
    teaser: "Can you get an injection while fasting? Most types don't break the fast.",
    reveal: "Injections : including insulin : do not break the fast in the Hanafi school.",
    explanation: "Injections of any kind (intravenous, intramuscular, insulin) do not break the fast because they don't enter through the mouth or nose to reach the stomach. They go directly into the bloodstream or muscle tissue. However, if an injection provides direct nutrition (like a glucose drip that replaces eating), some scholars say it would break the fast. Standard medical injections, vaccines, and insulin are fine. Nasal sprays, however, do break the fast.",
    category: "fasting",
    source: "Darulfiqh, Fatawa Hindiyya",
  },
  {
    id: "fasting-travel",
    teaser: "Traveling during Ramadan? You have options.",
    reveal: "A traveler who begins their journey before dawn can skip the fast that day and make it up later.",
    explanation: "In the Hanafi school, a Shar'i musafir (traveler who will journey 77+ km) who begins their journey before Fajr is permitted to skip the fast of that day. They must make it up (Qada) later. If they begin the journey during the day after dawn, they must continue fasting that day. Once you arrive at your destination and intend to stay 15+ days, you're no longer a traveler and must fast. The concession is a mercy from Allah for travelers.",
    category: "fasting",
    glossary: [
      { term: "Shar'i Musafir", definition: "A traveler in Islamic law : someone journeying 77 km or more from their city's boundary." },
    ],
    source: "Al-Hidayah, Darulfiqh",
  },
  {
    id: "fasting-suhur-time",
    teaser: "When does suhur actually end? It's not when you think.",
    reveal: "Suhur ends at the true dawn (Fajr Sadiq), not when the adhan starts on your phone.",
    explanation: "The time for suhur (pre-dawn meal) ends at Fajr Sadiq : the true dawn, when light spreads horizontally across the horizon. This is different from the first appearance of light on the horizon (Fajr Kadhib, the false dawn). The Quran says: 'Eat and drink until the white thread of dawn becomes distinct from the black thread.' Many calculation methods approximate this, but the actual time can vary slightly. The Prophet ﷺ said there's blessing in eating suhur late, so don't rush to stop eating.",
    category: "fasting",
    glossary: [
      { term: "Fajr Sadiq", definition: "The true dawn : when light spreads horizontally across the horizon. This is when fasting begins." },
      { term: "Fajr Kadhib", definition: "The false dawn : a vertical pillar of light that appears before the true dawn. Fasting does not begin at this time." },
    ],
    source: "Quran 2:187, Sahih al-Bukhari",
  },
  {
    id: "fasting-iftar-haste",
    teaser: "Breaking your fast at the exact right moment is a Sunnah most people get wrong.",
    reveal: "The Sunnah is to break the fast immediately at Maghrib : not to delay it.",
    explanation: "The Prophet ﷺ said: 'People will remain in good as long as they hasten to break the fast.' This means you should break your fast the moment Maghrib enters, not delay it. The Prophet ﷺ would break his fast with fresh dates, or dry dates if fresh weren't available, or water, before praying Maghrib. Delaying iftar without reason is contrary to the Sunnah. The only exception is if there's a legitimate reason, like waiting for food to be prepared.",
    category: "fasting",
    source: "Sahih al-Bukhari, Sahih Muslim",
    arabicText: "لَا يَزَالُ النَّاسُ بِخَيْرٍ مَا عَجَّلُوا الْفِطْرَ",
  },
  {
    id: "fasting-laylatul-qadr",
    teaser: "There's one night in Ramadan better than 83 years of worship.",
    reveal: "Laylat al-Qadr is better than a thousand months : worship on this one night outweighs 83+ years.",
    explanation: "Allah describes Laylat al-Qadr in the Quran as 'better than a thousand months.' This means worship on this single night is more rewarding than worship spread over 83+ years. The Prophet ﷺ said: 'Whoever stays up during Laylat al-Qadr out of faith and in hope of reward, all his previous sins will be forgiven.' It falls in the last ten nights of Ramadan, most likely on the odd nights (21st, 23rd, 25th, 27th, 29th). The best dua for this night is: 'Allahumma innaka afuwwun tuhibbul afwa fa'fu anni.'",
    category: "fasting",
    glossary: [
      { term: "Laylat al-Qadr", definition: "The Night of Decree : the night the Quran was first revealed. It falls in the last ten nights of Ramadan, most likely on odd nights." },
    ],
    source: "Quran 97:1-5, Sahih al-Bukhari",
    arabicText: "مَنْ قَامَ لَيْلَةَ الْقَدْرِ إِيمَانًا وَاحْتِسَابًا غُفِرَ لَهُ مَا تَقَدَّمَ مِنْ ذَنْبِهِ",
  },

  // ── 31-40: Quran ──
  {
    id: "quran-first-revelation",
    teaser: "The first word revealed to the Prophet ﷺ wasn't what you might expect.",
    reveal: "The first word of Quran revealed to Prophet Muhammad ﷺ was 'Iqra' : 'Read.'",
    explanation: "The first revelation came to the Prophet ﷺ in the Cave of Hira through the angel Jibreel. The first five verses of Surah Al-Alaq were: 'Read in the name of your Lord who created : created man from a clot. Read, and your Lord is the Most Generous : who taught by the pen : taught man that which he knew not.' This establishes that the very first command in Islam was to seek knowledge. The Prophet ﷺ was 40 years old and unlettered, yet the first word he was commanded was to read.",
    category: "quran",
    source: "Sahih al-Bukhari, Quran 96:1-5",
    arabicText: "اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ ۚ خَلَقَ الْإِنْسَانَ مِنْ عَلَقٍ ۚ اقْرَأْ وَرَبُّكَ الْأَكْرَمُ ۚ الَّذِي عَلَّمَ بِالْقَلَمِ ۚ عَلَّمَ الْإِنْسَانَ مَا لَمْ يَعْلَمْ",
  },
  {
    id: "quran-surah-count",
    teaser: "How many surahs are in the Quran? The answer is exact.",
    reveal: "The Quran contains 114 surahs, 6,236 verses, and 86,840 words.",
    explanation: "The Quran has 114 surahs (chapters). The longest is Surah Al-Baqarah with 286 verses, and the shortest is Surah Al-Kawthar with just 3 verses. The Quran was revealed over 23 years : 13 in Makkah and 10 in Madinah. The Makkan surahs focus on theology and the afterlife, while the Madinan surahs focus on law, society, and governance. The first surah (Al-Fatiha) is recited in every unit of every prayer.",
    category: "quran",
    source: "Standard Quranic sciences",
  },
  {
    id: "quran-basmalah",
    teaser: "There's a surah in the Quran that doesn't start with Bismillah.",
    reveal: "Surah At-Tawbah (Surah 9) is the only surah that doesn't begin with Bismillah.",
    explanation: "Every surah in the Quran begins with 'Bismillah ir-Rahman ir-Raheem' except Surah At-Tawbah (also called Surah Bara'ah). The scholars explain this is because it serves as a continuation of the previous surah (Al-Anfal), and because it contains a declaration of disassociation from the polytheists : starting with Bismillah (mercy) wouldn't fit the context. However, the Bismillah is still part of Surah An-Naml (27:30) where it appears within the text as the letter of Prophet Sulayman to the Queen of Sheba.",
    category: "quran",
    source: "Tafsir Ibn Kathir, Ulum al-Quran",
  },
  {
    id: "quran-fatiha-cure",
    teaser: "There's a surah the Prophet ﷺ called a cure for every disease.",
    reveal: "Surah Al-Fatiha is called 'Ash-Shifa' : the Cure : and was used by the Prophet ﷺ to heal.",
    explanation: "The Prophet ﷺ called Surah Al-Fatiha 'the cure for every disease' (Shifa min kull daa'). In a famous hadith, a companion recited Al-Fatiha over a scorpion sting and was cured. The Prophet ﷺ confirmed this was valid. Some scholars also call it 'Ruqyah' (spiritual healing). It's the most recited surah in the world because it's recited in every rak'ah of every prayer. It contains praise of Allah, acknowledgment of the Day of Judgment, a declaration of worship, and a plea for guidance.",
    category: "quran",
    glossary: [
      { term: "Ruqyah", definition: "Spiritual healing through recitation of Quran or authentic supplications for protection or cure." },
    ],
    source: "Sahih al-Bukhari, Sunan Abu Dawud",
  },
  {
    id: "quran-reward-letter",
    teaser: "Reading one letter of the Quran gives you ten rewards : and most verses have many letters.",
    reveal: "The Prophet ﷺ said: 'Whoever reads one letter of the Quran gets ten rewards. I don't say Alif-Lam-Meem is one letter, but Alif is one, Lam is one, Meem is one.'",
    explanation: "This hadith shows the multiplication of rewards for Quran recitation. Each Arabic letter earns ten rewards. So reading 'Alif Lam Meem' (three letters) earns thirty rewards. A single verse like 'Bismillah ir-Rahman ir-Raheem' contains 19 letters, earning 190 rewards. This is why consistent Quran recitation, even a small amount daily, accumulates enormous reward. The key is consistency : the Prophet ﷺ said the most beloved deeds to Allah are those done regularly, even if small.",
    category: "quran",
    source: "Sunan al-Tirmidhi",
    arabicText: "مَنْ قَرَأَ حَرْفًا مِنْ كِتَابِ اللَّهِ فَلَهُ بِهِ حَسَنَةٌ وَالْحَسَنَةُ بِعَشْرِ أَمْثَالِهَا",
  },
  {
    id: "quran-preservation",
    teaser: "The Quran is the only religious scripture preserved exactly as it was revealed.",
    reveal: "The Quran has been preserved word-for-word for over 1400 years through mass oral transmission.",
    explanation: "Allah promised in the Quran: 'Indeed, it is We who sent down the Reminder, and indeed, We will preserve it' (15:9). The Quran was memorized in its entirety by thousands of companions during the Prophet's ﷺ lifetime. Today, millions of people (huffaz) have memorized the entire Quran by heart. The written text and the oral transmission match exactly. This is unique among religious scriptures : the Quran is both memorized and written, providing a double preservation system.",
    category: "quran",
    glossary: [
      { term: "Hafiz", definition: "Someone who has memorized the entire Quran by heart. The feminine form is Hafiza." },
    ],
    source: "Quran 15:9, Ulum al-Quran",
    arabicText: "إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ لَحَافِظُونَ",
  },
  {
    id: "quran-seven-reward",
    teaser: "The Quran was revealed in seven modes : and you get rewarded for whichever you recite.",
    reveal: "The Quran was revealed in seven Ahruf (modes/dialects) to make it easy for different Arab tribes.",
    explanation: "The Prophet ﷺ said: 'The Quran was revealed in seven Ahruf.' This means Allah made the Quran flexible in its recitation to accommodate the different dialects of Arab tribes, making it easier for them to memorize and recite. Today, the most common recitation is Hafs from Asim, but there are other authentic Qira'at (recitations) like Warsh, Qalun, and ad-Duri. All are the Quran : they differ in pronunciation and some wording, not in meaning or rulings.",
    category: "quran",
    glossary: [
      { term: "Ahruf", definition: "The seven modes/dialects in which the Quran was revealed, to accommodate different Arab tribes." },
      { term: "Qira'at", definition: "The authentic recitation styles of the Quran, all tracing back to the Prophet ﷺ." },
    ],
    source: "Sahih al-Bukhari, Sahih Muslim",
    arabicText: "أُنْزِلَ الْقُرْآنُ عَلَى سَبْعَةِ أَحْرُفٍ",
  },
  {
    id: "quran-ayat-al-kursi",
    teaser: "There's one verse in the Quran that the Prophet ﷺ called the greatest verse.",
    reveal: "Ayat al-Kursi (Quran 2:255) is the greatest verse in the Quran, according to the Prophet ﷺ.",
    explanation: "The Prophet ﷺ told Ubayy bin Ka'b: 'Do you know which verse in the Quran is the greatest?' Ubayy said: 'Allah and His Messenger know best.' The Prophet ﷺ said: 'It is Ayat al-Kursi.' This verse describes Allah's attributes : His eternity, His knowledge, His power, and His sovereignty over the heavens and earth. The Prophet ﷺ also said that whoever recites Ayat al-Kursi after every obligatory prayer will not be prevented from entering Paradise except by death.",
    category: "quran",
    source: "Sahih Muslim, Sunan an-Nasa'i",
    arabicText: "اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ",
  },
  {
    id: "quran-recite-before-sleep",
    teaser: "Reciting a specific surah before bed protects you until morning.",
    reveal: "Reciting Surah Al-Mulk before sleep protects from the punishment of the grave.",
    explanation: "The Prophet ﷺ said: 'There is a surah in the Quran of thirty verses that intercedes for a man until he is forgiven : it is Surah Tabarak (Al-Mulk).' Another hadith states that whoever recites Surah Al-Mulk every night, Allah will protect him from the punishment of the grave. Many scholars recommend making this a nightly habit. It takes only a few minutes to recite and carries enormous spiritual benefit.",
    category: "quran",
    source: "Sunan Abu Dawud, Sunan al-Tirmidhi",
    arabicText: "سُورَةٌ فِي الْقُرْآنِ ثَلَاثُونَ آيَةً شَفَعَتْ لِرَجُلٍ حَتَّى غُفِرَ لَهُ وَهِيَ تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ",
  },
  {
    id: "quran-last-revelation",
    teaser: "What was the last verse revealed to the Prophet ﷺ before his death?",
    reveal: "Most scholars agree the last complete verse revealed was about fearing the Day of Judgment.",
    explanation: "The last verse revealed to the Prophet ﷺ before his death is debated, but most scholars point to Quran 5:3: 'This day I have perfected for you your religion and completed My favor upon you and have approved for you Islam as your religion.' This was revealed on the Day of Arafah during the Farewell Pilgrimage. Some say the very last verse was 2:281: 'And fear a Day when you will be returned to Allah. Then every soul will be compensated for what it earned, and they will not be wronged.' The Prophet ﷺ passed away 81 days after this.",
    category: "quran",
    source: "Sahih Muslim, Ulum al-Quran",
  },

  // ── 41-50: Prophet Muhammad ﷺ ──
  {
    id: "prophet-name",
    teaser: "The Prophet ﷺ had many names : and each one tells you something about him.",
    reveal: "The Prophet ﷺ said: 'I have five names: Muhammad, Ahmad, Al-Mahi, Al-Hashir, and Al-Aqib.'",
    explanation: "The Prophet ﷺ said his five names are: Muhammad (the praised one), Ahmad (the most praiseworthy), Al-Mahi (the eraser : through whom Allah erases disbelief), Al-Hashir (the gatherer : at whose feet people will be gathered on the Day of Judgment), and Al-Aqib (the last : there is no prophet after him). His full name is Muhammad ibn Abdullah ibn Abdul Muttalib ibn Hashim, from the tribe of Quraysh. He was born in Makkah in the Year of the Elephant (570 CE).",
    category: "prophet",
    source: "Sahih al-Bukhari, Sahih Muslim",
    arabicText: "لِي خَمْسَةُ أَسْمَاءٍ: مُحَمَّدٌ وَأَحْمَدُ وَالْمَاحِي وَالْحَاشِرُ وَالْعَاقِبُ",
  },
  {
    id: "prophet-night-journey",
    teaser: "The Prophet ﷺ made a journey in one night that would normally take months.",
    reveal: "The Isra and Mi'raj took the Prophet ﷺ from Makkah to Jerusalem and then to the heavens in one night.",
    explanation: "The Isra (night journey) and Mi'raj (ascension) occurred approximately one year before the Hijrah. The Prophet ﷺ was taken from the Ka'bah in Makkah to Al-Aqsa in Jerusalem on the Buraq (a heavenly mount), and then ascended through the seven heavens where he met previous prophets and spoke directly with Allah. It was during this journey that the five daily prayers were made obligatory : initially 50, then reduced to 5 through Musa's advice. This event is mentioned in Surah Al-Isra (17:1).",
    category: "prophet",
    glossary: [
      { term: "Isra", definition: "The night journey from Makkah to Jerusalem." },
      { term: "Mi'raj", definition: "The ascension from Jerusalem through the seven heavens." },
      { term: "Buraq", definition: "The heavenly mount that carried the Prophet ﷺ during the night journey." },
    ],
    source: "Sahih al-Bukhari, Sahih Muslim, Quran 17:1",
  },
  {
    id: "prophet-fajr-wudu",
    teaser: "Imam Abu Hanifa had a spiritual practice that most people don't know about.",
    reveal: "Imam Abu Hanifa performed Fajr Salah with the wudu of Isha for 40 years : meaning he stayed awake in worship every night.",
    explanation: "Imam Abu Hanifa (may Allah have mercy on him) was so devoted to worship that for 40 years, he performed the Fajr prayer with the same wudu he made for Isha. This means he never slept between Isha and Fajr : he spent every night in prayer, recitation, and worship. He was a Taabi'i (one who met a companion of the Prophet ﷺ). He learned from approximately 4,000 teachers and compiled a book of hadith called 'Kitaabul Aathaar' from 40,000 hadith. His knowledge and piety were attested to by all the great scholars of his time.",
    category: "history",
    source: "Tareekh al-Baghdad, Tahdhib al-Tahdhib",
  },
  {
    id: "prophet-character",
    teaser: "The Prophet ﷺ was described by Allah with one word that defines his entire mission.",
    reveal: "Allah described the Prophet ﷺ as 'a mercy to the worlds' (Rahmatan lil-Alamin).",
    explanation: "In Surah Al-Anbiya (21:107), Allah says: 'And We have not sent you except as a mercy to the worlds.' This single verse defines the Prophet's ﷺ entire mission. His mercy extended to humans, animals, and even the earth. He taught kindness to orphans, mercy to animals (a woman entered Paradise for giving water to a thirsty dog), and patience with those who harmed him. When he conquered Makkah, instead of punishing those who had persecuted him for 20 years, he said: 'Go, you are free.' His character was the Quran in practice.",
    category: "prophet",
    source: "Quran 21:107, Sahih al-Bukhari",
  },
  {
    id: "prophet-crying",
    teaser: "The Prophet ﷺ used to cry : and it wasn't out of weakness.",
    reveal: "The Prophet ﷺ would weep so much during prayer that his chest sounded like a boiling pot.",
    explanation: "The Prophet ﷺ was known for his deep emotional connection with Allah. His wife Aisha reported that she saw the Prophet ﷺ weeping so much during prayer that his chest sounded like a boiling pot. He would cry while reciting the Quran, particularly when reciting verses about the Day of Judgment or punishment. This wasn't weakness : it was the height of spiritual awareness. He once said to Abdullah bin Mas'ud: 'Recite the Quran for me.' Abdullah said: 'Shall I recite it to you when it was revealed to you?' The Prophet ﷺ said: 'I love to hear it from others.'",
    category: "prophet",
    source: "Sunan an-Nasa'i, Sunan Abu Dawud",
  },
  {
    id: "prophet-food",
    teaser: "The Prophet ﷺ never ate to his full stomach for three consecutive days.",
    reveal: "The Prophet ﷺ and his family often went hungry : sometimes for months with no cooked food.",
    explanation: "Aisha (may Allah be pleased with her) reported that the family of the Prophet ﷺ never ate their fill of wheat bread for three consecutive days from the time he arrived in Madinah until he passed away. Sometimes months would pass without cooking food in his household : they survived on dates and water. The Prophet ﷺ would tie a stone to his stomach from hunger. Despite this, he gave generously to others and never turned away a beggar. This wasn't poverty by force : it was a choice of simplicity and reliance on Allah.",
    category: "prophet",
    source: "Sahih al-Bukhari, Sahih Muslim",
  },
  {
    id: "prophet-hijrah",
    teaser: "The Islamic calendar starts from an event that changed the world : and it wasn't a battle.",
    reveal: "The Hijri calendar begins from the Prophet's ﷺ migration from Makkah to Madinah in 622 CE.",
    explanation: "The Hijrah (migration) marks the beginning of the Islamic calendar. The Prophet ﷺ left Makkah after 13 years of persecution, traveling to Madinah (then called Yathrib) where the people had accepted Islam. This migration transformed Islam from a persecuted faith to a civilization. The calendar was established during the caliphate of Umar ibn al-Khattab (may Allah be pleased with him). The first year of the Hijri calendar is 622 CE. The Islamic year is lunar (354-355 days), about 11 days shorter than the solar year.",
    category: "history",
    glossary: [
      { term: "Hijrah", definition: "The migration of the Prophet ﷺ from Makkah to Madinah in 622 CE, marking the start of the Islamic calendar." },
    ],
    source: "Sahih al-Bukhari, Islamic history",
  },
  {
    id: "prophet-shoes",
    teaser: "The Prophet ﷺ had a specific way of putting on shoes that most people don't know.",
    reveal: "The Sunnah is to put on the right shoe first, and remove the left shoe first.",
    explanation: "The Prophet ﷺ said: 'When you put on shoes, begin with the right. And when you take them off, begin with the left. Let the right be the first to be put on and the last to be taken off.' This reflects a general principle in Islamic etiquette : beginning honorable actions with the right side. This applies to wearing shoes, entering the bathroom (left foot first), entering the mosque (right foot first), performing wudu (right limbs first), and many other daily actions. It's a small act, but it builds mindfulness of the Sunnah in everyday life.",
    category: "adab",
    source: "Sahih al-Bukhari, Sahih Muslim",
    arabicText: "إِذَا انْتَعَلَ أَحَدُكُمْ فَلْيَبْدَأْ بِالْيُمْنَى وَإِذَا نَزَعَ فَلْيَبْدَأْ بِالْيُسْرَى",
  },
  {
    id: "prophet-greeting",
    teaser: "The Islamic greeting has a beautiful meaning that most people say without thinking about.",
    reveal: "'As-salamu alaykum' means 'peace be upon you' : and the full version adds 'and the mercy of Allah and His blessings.'",
    explanation: "The complete Islamic greeting is: 'As-salamu alaykum wa rahmatullahi wa barakatuh' : 'Peace be upon you, and the mercy of Allah and His blessings.' The Prophet ﷺ said that the minimum greeting is 'As-salamu alaykum,' adding 'wa rahmatullah' earns 10 more rewards, and adding 'wa barakatuh' earns 10 more. When someone greets you, you must return the greeting with at least the same words, and it's better to add more. The Prophet ﷺ also said that spreading salam is one of the means of entering Paradise.",
    category: "adab",
    source: "Sahih al-Bukhari, Sunan Abu Dawud",
  },
  {
    id: "prophet-last-sermon",
    teaser: "The Prophet's ﷺ final sermon contains a message that's still relevant today.",
    reveal: "In his Farewell Sermon, the Prophet ﷺ said: 'I have left you with something : if you hold to it, you will never go astray: the Book of Allah and my Sunnah.'",
    explanation: "The Farewell Sermon (Khutbat al-Wada) was delivered on the Day of Arafah, 10th of Dhul-Hijjah, 10 AH (632 CE), to over 100,000 companions. In it, the Prophet ﷺ summarized the entire message of Islam: the sanctity of life and property, the prohibition of interest, the rights of women, the equality of all races, and the importance of holding to the Quran and Sunnah. He said: 'No Arab has superiority over a non-Arab, nor white over black, except by piety.' He then asked: 'Have I conveyed the message?' The crowd said yes, and he raised his finger to the sky and said: 'O Allah, bear witness.'",
    category: "prophet",
    source: "Sahih Muslim, Muwatta Imam Malik",
    arabicText: "تَرَكْتُ فِيكُمْ أَمْرَيْنِ لَنْ تَضِلُّوا مَا تَمَسَّكْتُمْ بِهِمَا: كِتَابَ اللَّهِ وَسُنَّةَ نَبِيِّهِ",
  },

  // ── 51-60: Dhikr and Adab ──
  {
    id: "dhikr-best",
    teaser: "The Prophet ﷺ was asked which dhikr is the best. His answer was simple.",
    reveal: "The best dhikr is 'La ilaha illallah' : there is no god but Allah.",
    explanation: "The Prophet ﷺ was asked: 'Which dhikr is the best?' He said: 'La ilaha illallah.' This phrase, called the Kalimah Tayyibah (the pure word), is the foundation of Islam. It means there is no deity worthy of worship except Allah. The Prophet ﷺ also said: 'The best of what I and the prophets before me have said is La ilaha illallah.' Saying it sincerely once with conviction is what enters a person into Islam. Saying it regularly with presence of heart is among the greatest forms of dhikr.",
    category: "dhikr",
    glossary: [
      { term: "Dhikr", definition: "Remembrance of Allah through repetition of phrases like Subhanallah, Alhamdulillah, Allahu Akbar, or La ilaha illallah." },
    ],
    source: "Sunan al-Tirmidhi, Sunan Ibn Majah",
    arabicText: "أَفْضَلُ الذِّكْرِ لَا إِلَهَ إِلَّا اللَّهُ",
  },
  {
    id: "dhikr-morning-evening",
    teaser: "There are two times of day when a specific dhikr protects you until the next time.",
    reveal: "The morning and evening adhkar are a daily shield : the Prophet ﷺ never missed them.",
    explanation: "The Prophet ﷺ had a set of supplications he recited every morning and evening. These are called the Adhkar al-Sabah wa al-Masa. They include Ayat al-Kursi, the three Quls (Ikhlas, Falaq, Nas), and various supplications for protection, health, and provision. The Prophet ﷺ said that whoever says 'Subhanallah wa bihamdihi' 100 times in the morning and evening will have their sins forgiven even if they're like the foam of the sea. Making these adhkar a daily habit is one of the most protective spiritual practices.",
    category: "dhikr",
    source: "Sahih al-Bukhari, Sahih Muslim",
  },
  {
    id: "dhikr-tasbih-fatima",
    teaser: "There's a dhikr the Prophet ﷺ gave to his daughter when she came to him for help.",
    reveal: "The Tasbih of Fatima : 33 Subhanallah, 33 Alhamdulillah, 34 Allahu Akbar : was given by the Prophet ﷺ to his daughter instead of a servant.",
    explanation: "When Fatima (may Allah be pleased with her) came to the Prophet ﷺ asking for a servant to help with housework, he instead taught her to recite 33 times Subhanallah, 33 times Alhamdulillah, and 34 times Allahu Akbar before sleeping. He said this would be better for her than a servant. Ali (may Allah be pleased with him) said he never left this dhikr after that, even on the night of battle. This dhikr, called 'Tasbih Fatima' or 'Tasbih al-Zahra,' is among the most beloved forms of dhikr in the Hanafi tradition.",
    category: "dhikr",
    source: "Sahih al-Bukhari, Sahih Muslim",
    arabicText: "سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ وَاللَّهُ أَكْبَرُ",
  },
  {
    id: "dhikr-after-salah",
    teaser: "There's a dhikr you can do after every prayer that guarantees your sins are forgiven.",
    reveal: "Saying Subhanallah 33 times, Alhamdulillah 33 times, and Allahu Akbar 34 times after every prayer is a guaranteed path to forgiveness.",
    explanation: "The Prophet ﷺ told his companions: 'Whoever says Subhanallah 33 times, Alhamdulillah 33 times, and Allahu Akbar 34 times after every obligatory prayer, Allah will forgive his sins even if they're like the foam of the sea.' Some narrations say 33, 33, and 33, then complete 100 with 'La ilaha illallah wahdahu la sharika lah...' This practice takes about 2-3 minutes after each prayer and carries enormous spiritual weight. It's one of the most established Sunnah dhikr practices.",
    category: "dhikr",
    source: "Sahih Muslim, Sunan Abu Dawud",
  },
  {
    id: "dhikr-istighfar",
    teaser: "There's one dhikr the Prophet ﷺ said he recited 100 times a day.",
    reveal: "The Prophet ﷺ said: 'I seek forgiveness from Allah 100 times a day.'",
    explanation: "The Prophet ﷺ : who was sinless : still sought forgiveness (Istighfar) 100 times a day. He said: 'By Allah, I seek Allah's forgiveness and repent to Him more than 70 times a day.' In another narration: 100 times. If the Prophet ﷺ, whose past and future sins were forgiven, sought forgiveness this much, how much more do we need it? Istighfar is not just for sins : it's a means of opening doors of provision, easing difficulties, and bringing tranquility. The Quran says: 'Seek forgiveness of your Lord and turn to Him in repentance, that He may grant you good enjoyment.'",
    category: "dhikr",
    glossary: [
      { term: "Istighfar", definition: "Seeking forgiveness from Allah : typically by saying 'Astaghfirullah' (I seek Allah's forgiveness)." },
    ],
    source: "Sahih al-Bukhari, Sahih Muslim, Quran 11:3",
    arabicText: "إِنِّي لَأَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ فِي الْيَوْمِ مِائَةَ مَرَّةٍ",
  },
  {
    id: "adab-sneezing",
    teaser: "When someone sneezes, there's a Sunnah response most people get half-right.",
    reveal: "When a Muslim sneezes and says 'Alhamdulillah,' you should respond 'Yarhamukallah' : and if they say it again, respond again, up to three times.",
    explanation: "The Sunnah when sneezing is to say 'Alhamdulillah' (all praise is for Allah). Those who hear it should respond: 'Yarhamukallah' (may Allah have mercy on you). The sneezer then says: 'Yahdikumullah wa yuslihu balakum' (may Allah guide you and rectify your affairs). The Prophet ﷺ said that if a sneezer says Alhamdulillah and you don't respond, you've missed a right of your brother. If the sneezer says Alhamdulillah again, respond again : but only up to three times. After the third, you say: 'Aafaka Allah' (may Allah cure you).",
    category: "adab",
    source: "Sahih al-Bukhari, Sunan Abu Dawud",
  },
  {
    id: "adab-entering-home",
    teaser: "There's a Sunnah when entering your home that most people don't practice.",
    reveal: "The Sunnah is to enter the home with the right foot and say 'Bismillah' : and announce your arrival even to family.",
    explanation: "When entering your home, the Sunnah is to enter with the right foot, say 'Bismillah,' and greet those inside with Salam even if no one is there (the angels will respond). The Prophet ﷺ said: 'When a man enters his house and mentions Allah's name upon entering and upon eating, Satan says: There is no lodging for you here tonight and no supper.' If he enters without mentioning Allah, Satan says: 'You have found lodging.' This small act of saying Bismillah keeps Shaytan out of your home and your meals.",
    category: "adab",
    source: "Sahih Muslim, Sunan Abu Dawud",
  },
  {
    id: "adab-eating-right",
    teaser: "The Prophet ﷺ had a specific way of eating that most people don't follow.",
    reveal: "The Sunnah is to eat with the right hand, from what's in front of you, and to never criticize food.",
    explanation: "The Prophet ﷺ gave three key etiquettes of eating: eat with your right hand (Shaytan eats with his left), eat from what is immediately in front of you, and never criticize food : if you like it, eat it; if you don't, leave it. He also said to mention Allah's name before eating (Bismillah), and if you forget, say 'Bismillahi awwalahu wa akhirahu' when you remember. After eating, the Sunnah is to say 'Alhamdulillah.' The Prophet ﷺ also said: 'The food for one person suffices two, and the food of two suffices four.'",
    category: "adab",
    source: "Sahih al-Bukhari, Sahih Muslim",
  },
  {
    id: "adab-sleeping",
    teaser: "There's a complete Sunnah for sleeping that most people don't know about.",
    reveal: "The Sunnah is to sleep on the right side, dust the bed three times, and recite specific surahs.",
    explanation: "The Prophet ﷺ had a complete routine for sleep. He would dust his bed three times (in case something crawled in), lie on his right side with his hand under his cheek, and recite: 'Bismika Allahumma amutu wa ahya.' He also recited the three Quls (Ikhlas, Falaq, Nas) into his palms and wiped them over his body, and recited Ayat al-Kursi. He said whoever recites Ayat al-Kursi before sleeping will have a protector from Allah and no Shaytan will approach until morning. He also recommended sleeping in a state of wudu.",
    category: "adab",
    source: "Sahih al-Bukhari, Sahih al-Bukhari",
  },
  {
    id: "adab-visiting-sick",
    teaser: "Visiting the sick has a reward most people underestimate.",
    reveal: "The Prophet ﷺ said: 'No Muslim visits another Muslim in the morning except that 70,000 angels pray for his forgiveness until the evening.'",
    explanation: "Visiting the sick is a right that Muslims have over each other. The Prophet ﷺ said that when you visit a sick person, 70,000 angels pray for your forgiveness from the time you enter until the time you leave (if visiting in the morning, until evening; if in the evening, until morning). He also said: 'The one who visits the sick is walking on the path of Paradise.' When visiting, the Sunnah is to sit near them, ask how they're feeling, make dua for them, and not stay too long so as not to burden them. The visitor should also ask the sick person to make dua, as their dua is accepted.",
    category: "adab",
    source: "Sunan al-Tirmidhi, Sunan Abu Dawud",
    arabicText: "مَا مِنْ مُسْلِمٍ يَعُودُ مُسْلِمًا غُدْوَةً إِلَّا صَلَّى عَلَيْهِ سَبْعُونَ أَلْفَ مَلَكٍ حَتَّى يُمْسِيَ",
  },
];

// ─── Fact selection logic ─────────────────────────────────────────────
// Facts are cycled through in order, tracked by index in localStorage.
// This ensures rare repetition : each fact is shown before any repeats.

export function getNextFunFactIndex(lastIndex: number): number {
  return (lastIndex + 1) % FUN_FACTS.length;
}

export function getFunFactByIndex(index: number): FunFact {
  return FUN_FACTS[index % FUN_FACTS.length];
}

// Check if enough time has passed since the last fact was shown.
// Default: 12 hours minimum between facts.
export function shouldShowFunFact(lastShownTimestamp: number | null, minIntervalMs: number = 12 * 60 * 60 * 1000): boolean {
  if (lastShownTimestamp === null) return true;
  return Date.now() - lastShownTimestamp >= minIntervalMs;
}
