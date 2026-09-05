-- Seed dhikr_sequences with the canonical post-prayer adhkar
-- These are universally authenticated from Sahih al-Bukhari, Sahih Muslim,
-- Sunan al-Tirmidhi, and Sunan Abu Dawud. Not AI-generated — these are the
-- standard adhkar every Muslim recites after Salah.

INSERT INTO "dhikr_sequences" ("id", "phrase_arabic", "phrase_transliteration", "target_count", "sequence_order", "source_citation")
VALUES
  (
    gen_random_uuid(),
    'سُبْحَانَ اللَّهِ',
    'SubhanAllah',
    33,
    0,
    'Sahih Muslim 597 — reported by Abu Hurayrah (RA)'
  ),
  (
    gen_random_uuid(),
    'الْحَمْدُ لِلَّهِ',
    'Alhamdulillah',
    33,
    1,
    'Sahih Muslim 597 — reported by Abu Hurayrah (RA)'
  ),
  (
    gen_random_uuid(),
    'اللَّهُ أَكْبَرُ',
    'Allahu Akbar',
    34,
    2,
    'Sahih Muslim 597 — reported by Abu Hurayrah (RA)'
  ),
  (
    gen_random_uuid(),
    'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    'La ilaha illa Allah, wahdahu la sharika lah, lahul-mulku wa lahul-hamdu, wa Huwa ala kulli shayin qadeer',
    1,
    3,
    'Sahih al-Bukhari 844 / Sahih Muslim 597 — reported by Abu Hurayrah (RA)'
  )
ON CONFLICT DO NOTHING;
