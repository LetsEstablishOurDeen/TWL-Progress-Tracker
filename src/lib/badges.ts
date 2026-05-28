import { Learner } from '../types';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export function getLearnerBadges(learner: Learner): Badge[] {
  const badges: Badge[] = [];

  const books = learner.booksCompleted.length;
  const presentations = learner.presentationsGiven.length;
  const tasks = learner.tasksCompleted;

  /*
    ─────────────────────────────────────
    MODULE COMPLETIONS
    ─────────────────────────────────────
  */

  // Full-module evaluations
  const completedTafsir = learner.completedTafsirModule || false;
  const completedSeerah = learner.completedSeerahModule || false;
  const completedDawraEQuran = learner.completedDawraEQuran || false;

  /*
    ─────────────────────────────────────
    BOOKS / READING JOURNEY
    ─────────────────────────────────────
  */

  if (books >= 1) {
    badges.push({
      id: 'first_page',
      name: 'First Page',
      description: 'Began the journey of sacred and beneficial learning',
      icon: '📖',
    });
  }

  if (books >= 3) {
    badges.push({
      id: 'seeker_of_knowledge',
      name: 'Seeker of Knowledge',
      description: 'Completed 3 books with consistency',
      icon: '🕯️',
    });
  }

  if (books >= 5) {
    badges.push({
      id: 'keeper_of_scrolls',
      name: 'Keeper of Scrolls',
      description: 'Completed 5 books and continued the pursuit of understanding',
      icon: '📚',
    });
  }

  if (books >= 10) {
    badges.push({
      id: 'library_dweller',
      name: 'Library Dweller',
      description: 'Completed 10 books within the halls of reflection',
      icon: '🏛️',
    });
  }

  if (books >= 25) {
    badges.push({
      id: 'scribe_of_wisdom',
      name: 'Scribe of Wisdom',
      description: 'Cultivated a disciplined intellectual path through extensive reading',
      icon: '🪶',
    });
  }

  /*
    ─────────────────────────────────────
    TAFSIR MODULE
    ─────────────────────────────────────
  */

  if (completedTafsir) {
    badges.push({
      id: 'student_of_tafsir',
      name: 'Student of Tafsir',
      description: 'Successfully completed the Tafsir module',
      icon: '📜',
    });

    badges.push({
      id: 'reflection_upon_revelation',
      name: 'Reflection Upon Revelation',
      description: 'Dedicated oneself to understanding the meanings of the Noble Qur’an',
      icon: '🌙',
    });

    badges.push({
      id: 'bearer_of_quranic_insight',
      name: 'Bearer of Qur’anic Insight',
      description: 'Completed a full evaluative journey through Tafsir studies',
      icon: '✨',
    });
  }

  /*
    ─────────────────────────────────────
    SEERAH MODULE
    ─────────────────────────────────────
  */

  if (completedSeerah) {
    badges.push({
      id: 'walker_of_the_seerah',
      name: 'Walker of the Seerah',
      description: 'Successfully completed the Seerah module',
      icon: '🕋',
    });

    badges.push({
      id: 'lover_of_the_beloved',
      name: 'Lover of the Beloved ﷺ',
      description: 'Dedicated oneself to studying the life and legacy of Rasulullah ﷺ',
      icon: '🌹',
    });

    badges.push({
      id: 'guardian_of_the_prophetic_legacy',
      name: 'Guardian of the Prophetic Legacy',
      description: 'Completed a full evaluative journey through Seerah studies',
      icon: '🕌',
    });
  }

  /*
    ─────────────────────────────────────
    DOWRA-E-QURAN
    HIGHEST HONOR CATEGORY
    ─────────────────────────────────────
  */

  if (completedDawraEQuran) {
    badges.push({
      id: 'people_of_the_quran',
      name: 'Among the People of the Qur’an',
      description: 'Completed Dowra-e-Qur’an — one of the highest journeys of reflection and guidance',
      icon: '📖',
    });

    badges.push({
      id: 'heart_illumined',
      name: 'Heart Illumined',
      description: 'Journeyed through the Qur’an with reverence, contemplation, and consistency',
      icon: '🕯️',
    });

    badges.push({
      id: 'companion_of_revelation',
      name: 'Companion of Revelation',
      description: 'Completed one of the most honored and demanding modules within the lounge',
      icon: '✨',
    });

    badges.push({
      id: 'ahl_al_quran',
      name: 'Ahl al-Qur’an',
      description: 'Distinguished through devotion to the Book of Allah and its meanings',
      icon: '🌌',
    });
  }

  /*
    ─────────────────────────────────────
    PRESENTATIONS / CONTRIBUTION
    ─────────────────────────────────────
  */

  if (presentations >= 1) {
    badges.push({
      id: 'voice_of_reflection',
      name: 'Voice of Reflection',
      description: 'Shared beneficial thoughts before others',
      icon: '🗣️',
    });
  }

  if (presentations >= 3) {
    badges.push({
      id: 'majlis_speaker',
      name: 'Majlis Speaker',
      description: 'Presented in gatherings of learning multiple times',
      icon: '🎙️',
    });
  }

  if (presentations >= 5) {
    badges.push({
      id: 'bearer_of_insight',
      name: 'Bearer of Insight',
      description: 'Contributed thoughtful reflections and presentations consistently',
      icon: '🌌',
    });
  }

  if (presentations >= 10) {
    badges.push({
      id: 'voice_of_the_lounge',
      name: 'Voice of the Lounge',
      description: 'Became a recognized voice within circles of reflection and discourse',
      icon: '🕯️',
    });
  }

  /*
    ─────────────────────────────────────
    TASKS / CONSISTENCY
    ─────────────────────────────────────
  */

  if (tasks >= 5) {
    badges.push({
      id: 'steadfast',
      name: 'Steadfast',
      description: 'Completed 5 tasks with discipline',
      icon: '✅',
    });
  }

  if (tasks >= 20) {
    badges.push({
      id: 'consistent_heart',
      name: 'Consistent Heart',
      description: 'Maintained consistency in responsibilities and learning',
      icon: '🕰️',
    });
  }

  if (tasks >= 50) {
    badges.push({
      id: 'pillar_of_commitment',
      name: 'Pillar of Commitment',
      description: 'Completed 50 tasks with exceptional dedication',
      icon: '🧱',
    });
  }

  if (tasks >= 100) {
    badges.push({
      id: 'legacy_builder',
      name: 'Legacy Builder',
      description: 'Built a lasting legacy through discipline and contribution',
      icon: '👑',
    });
  }

  /*
    ─────────────────────────────────────
    ELITE COMBINED BADGES
    ─────────────────────────────────────
  */

  if (completedTafsir && completedSeerah) {
    badges.push({
      id: 'student_of_revelation_and_legacy',
      name: 'Student of Revelation & Legacy',
      description: 'Completed both the Tafsir and Seerah modules',
      icon: '🌙',
    });
  }

  if (completedDawraEQuran && completedSeerah) {
    badges.push({
      id: 'path_of_prophetic_guidance',
      name: 'Path of Prophetic Guidance',
      description: 'Combined the study of the Qur’an with the Prophetic example',
      icon: '🕌',
    });
  }

  if (
    completedDawraEQuran &&
    completedTafsir &&
    completedSeerah &&
    presentations >= 5 &&
    tasks >= 50
  ) {
    badges.push({
      id: 'wisdom_lounge_elder',
      name: 'Wisdom Lounge Elder',
      description: 'Reached an exceptional rank of learning, discipline, and contribution',
      icon: '🕯️',
    });
  }

  return badges;
}