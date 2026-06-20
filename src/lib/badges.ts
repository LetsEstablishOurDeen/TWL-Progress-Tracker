import { Learner } from '../types';
import { getDomainValue } from '../utils';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement?: string;
  category?: string;
}

export const ALL_BADGES: Badge[] = [
  // BOOKS
  { id: 'first_page', name: 'First Page', description: 'Began the journey of sacred and beneficial learning', icon: '📖', requirement: 'Read 1 book', category: 'Books' },
  { id: 'seeker_of_knowledge', name: 'Seeker of Knowledge', description: 'Completed 3 books with consistency', icon: '🕯️', requirement: 'Read 3 books', category: 'Books' },
  { id: 'keeper_of_scrolls', name: 'Keeper of Scrolls', description: 'Completed 5 books and continued the pursuit of understanding', icon: '📚', requirement: 'Read 5 books', category: 'Books' },
  { id: 'library_dweller', name: 'Library Dweller', description: 'Completed 10 books within the halls of reflection', icon: '🏛️', requirement: 'Read 10 books', category: 'Books' },
  { id: 'scribe_of_wisdom', name: 'Scribe of Wisdom', description: 'Cultivated a disciplined intellectual path through extensive reading', icon: '🪶', requirement: 'Read 25 books', category: 'Books' },
  
  // TAFSIR (Progressive Journeys of Understanding)
  { id: 'student_of_tafsir', name: '1st Tafsir: Student of Tafsir', description: 'Successfully completed a full journey through your first Tafsir module', icon: '📜', requirement: 'Complete 1 Tafsir module', category: 'Modules' },
  { id: 'reflection_upon_revelation', name: '2nd Tafsir: Reflection Upon Revelation', description: 'Dedicated oneself to understanding the meanings of the Noble Qur’an in your second Tafsir module', icon: '🌙', requirement: 'Complete 2 Tafsir modules', category: 'Modules' },
  { id: 'bearer_of_quranic_insight', name: '3rd Tafsir: Bearer of Qur’anic Insight', description: 'Completed a third full evaluative journey through Tafsir studies', icon: '✨', requirement: 'Complete 3 Tafsir modules', category: 'Modules' },
  { id: 'sage_of_quranic_wisdom', name: '4th Tafsir: Sage of Qur’anic Wisdom', description: 'Reached an exceptional depth of understanding across four completed Tafsir modules', icon: '🌌', requirement: 'Complete 4 Tafsir modules', category: 'Modules' },

  // SEERAH
  { id: 'walker_of_the_seerah', name: 'Walker of the Seerah', description: 'Successfully completed the Seerah module', icon: '🕋', requirement: 'Complete Seerah module', category: 'Modules' },
  { id: 'lover_of_the_beloved', name: 'Lover of the Beloved ﷺ', description: 'Dedicated oneself to studying the life and legacy of Rasulullah ﷺ', icon: '🌹', requirement: 'Complete Seerah module', category: 'Modules' },
  { id: 'guardian_of_the_prophetic_legacy', name: 'Guardian of the Prophetic Legacy', description: 'Completed a full evaluative journey through Seerah studies', icon: '🕌', requirement: 'Complete Seerah module', category: 'Modules' },

  // DAWRA-E-QURAN (Progressive Journeys of Devotion)
  { id: 'people_of_the_quran', name: '1st Dowra: Among the People of the Qur’an', description: 'Completed first Dowra-e-Qur’an — a journey of deep reflection and guidance', icon: '📖', requirement: 'Complete 1 Dowra-e-Quran', category: 'Modules' },
  { id: 'heart_illumined', name: '2nd Dowra: Heart Illumined', description: 'Journeyed through the Qur’an a second time with reverence, contemplation, and consistency', icon: '🕯️', requirement: 'Complete 2 Dowra-e-Qurans', category: 'Modules' },
  { id: 'companion_of_revelation', name: '3rd Dowra: Companion of Revelation', description: 'Completed a third honored and demanding Dowra-e-Quran journey within the lounge', icon: '✨', requirement: 'Complete 3 Dowra-e-Qurans', category: 'Modules' },
  { id: 'ahl_al_quran', name: '4th Dowra: Ahl al-Qur’an', description: 'Distinguished through exceptional devotion to the Book of Allah and its meanings across four Dowra-e-Qurans', icon: '🌌', requirement: 'Complete 4 Dowra-e-Qurans', category: 'Modules' },

  // ARTICLES (Progressive Journeys of Intellectual Contribution)
  { id: 'scribe_in_training', name: '1st Article: Scribe in Training', description: 'Formulated your first critical research article.', icon: '✍️', requirement: 'Complete 1 Article', category: 'Articles' },
  { id: 'voice_of_the_pen', name: '2nd Article: Voice of the Pen', description: 'Contributed meaningful prose and structured analysis across two articles', icon: '✒️', requirement: 'Complete 2 Articles', category: 'Articles' },
  { id: 'scholar_of_the_scroll', name: '3rd Article: Scholar of the Scroll', description: 'Synthesized historical and theological concepts in three completed articles', icon: '📜', requirement: 'Complete 3 Articles', category: 'Articles' },
  { id: 'guardian_of_narratives', name: '4th Article: Guardian of Narratives', description: 'Attained exceptional scholarly clarity and research depth across four completed articles', icon: '📚', requirement: 'Complete 4 Articles', category: 'Articles' },

  // RESEARCH PAPERS (Aesthetic academic accomplishments of structural depth)
  { id: 'scholars_1st_step', name: '1st Paper: Stepping into Scholarship', description: 'Formulated your first critical research paper.', icon: '✒️', requirement: 'Write 1 Research Paper', category: 'Research Papers' },
  { id: 'master_of_treatise', name: '2nd Paper: Master of Treatise', description: 'Synthesized complex theological or historical narratives in a second research paper.', icon: '📜', requirement: 'Write 2 Research Papers', category: 'Research Papers' },
  { id: 'authority_of_archive', name: '3rd Paper: Authority of the Archive', description: 'Demonstrated profound academic depth and investigative rigor across three research papers.', icon: '🏛️', requirement: 'Write 3 Research Papers', category: 'Research Papers' },
  { id: 'luminary_of_pen', name: '4th Research Paper: Luminary of the Pen', description: 'Attained elite academic standing with four peer-reviewed research papers in the Lounge repository.', icon: '👑', requirement: 'Write 4 Research Papers', category: 'Research Papers' },
  { id: 'scholarly_explorer', name: '5th Paper: Scholarly Explorer', description: 'Maintained profound intellectual rigor across five complex research treatises.', icon: '🧪', requirement: 'Write 5 Research Papers', category: 'Research Papers' },
  { id: 'grand_mujtahid', name: '6th Paper: Pinnacle of Scholarship', description: 'Acquired master-level theological and analytical clarity with six research papers.', icon: '🎓', requirement: 'Write 6 Research Papers', category: 'Research Papers' },

  // PRESENTATIONS
  { id: 'voice_of_reflection', name: 'Voice of Reflection', description: 'Shared beneficial thoughts before others', icon: '🗣️', requirement: 'Give 1 presentation', category: 'Presentations' },
  { id: 'majlis_speaker', name: 'Majlis Speaker', description: 'Presented in gatherings of learning multiple times', icon: '🎙️', requirement: 'Give 3 presentations', category: 'Presentations' },
  { id: 'bearer_of_insight_pres', name: 'Bearer of Insight', description: 'Contributed thoughtful reflections and presentations consistently', icon: '🌌', requirement: 'Give 5 presentations', category: 'Presentations' },
  { id: 'voice_of_the_lounge', name: 'Voice of the Lounge', description: 'Became a recognized voice within circles of reflection and discourse', icon: '🕯️', requirement: 'Give 10 presentations', category: 'Presentations' },

  // TASKS
  { id: 'steadfast', name: 'Steadfast', description: 'Completed 5 tasks with discipline', icon: '✅', requirement: 'Complete 5 tasks', category: 'Tasks' },
  { id: 'consistent_heart', name: 'Consistent Heart', description: 'Maintained consistency in responsibilities and learning', icon: '🕰️', requirement: 'Complete 20 tasks', category: 'Tasks' },
  { id: 'pillar_of_commitment', name: 'Pillar of Commitment', description: 'Completed 50 tasks with exceptional dedication', icon: '🧱', requirement: 'Complete 50 tasks', category: 'Tasks' },
  { id: 'legacy_builder', name: 'Legacy Builder', description: 'Built a lasting legacy through discipline and contribution', icon: '👑', requirement: 'Complete 100 tasks', category: 'Tasks' },

  // GUIDED STUDIES
  { id: 'seeker_of_the_circle', name: 'Seeker of the Circle', description: 'Joined the circles of knowledge and completed a guided study', icon: '👥', requirement: 'Complete 1 Guided Study', category: 'Guided Studies' },
  { id: 'student_of_the_chain', name: 'Student of the Chain', description: 'Continued the noble tradition of studying at the feet of scholars', icon: '🔗', requirement: 'Complete 3 Guided Studies', category: 'Guided Studies' },
  { id: 'companion_of_scholars', name: 'Companion of Scholars', description: 'Journeyed deeply within the traditional circles of sacred knowledge', icon: '🕌', requirement: 'Complete 5 Guided Studies', category: 'Guided Studies' },
  { id: 'guardian_of_tradition', name: 'Guardian of Tradition', description: 'Demonstrated extensive dedication to guided study and transmission of knowledge', icon: '👑', requirement: 'Complete 10 Guided Studies', category: 'Guided Studies' },

  // ELITE
  { id: 'student_of_revelation_and_legacy', name: 'Student of Revelation & Legacy', description: 'Completed both the Tafsir and Seerah modules', icon: '🌙', requirement: 'Complete Tafsir & Seerah', category: 'Elite' },
  { id: 'path_of_prophetic_guidance', name: 'Path of Prophetic Guidance', description: 'Combined the study of the Qur’an with the Prophetic example', icon: '🕌', requirement: 'Complete Dawra-e-Quran & Seerah', category: 'Elite' },
  { id: 'wisdom_lounge_elder', name: 'Wisdom Lounge Elder', description: 'Reached an exceptional rank of learning, discipline, and contribution', icon: '🕯️', requirement: 'Complete all 4 major modules, 5+ presentations, 50+ tasks', category: 'Elite' }
];

export function getLearnerBadges(learner: Learner): Badge[] {
  const badges: Badge[] = [];
  const getBadge = (id: string) => ALL_BADGES.find(b => b.id === id)!;

  const books = (learner.booksCompleted || []).length;
  const presentations = (learner.presentationsGiven || []).length;
  const tasks = learner.tasksCompleted;

  const completedSeerah = learner.completedSeerahModule || false;

  const tafsirCount = getDomainValue(learner, 'tafsir');
  const dowraCount = getDomainValue(learner, 'dowra');
  const talaqqiCount = getDomainValue(learner, 'talaqqi');

  const articlesList = learner.moduleItems?.['articles'] || learner.moduleItems?.['research papers/article'] || [];
  let papersCount = 0;
  let articlesCount = 0;

  if (articlesList.length > 0) {
    papersCount = articlesList.filter(item => item.includes('[Research Paper]')).length;
    articlesCount = articlesList.filter(item => !item.includes('[Research Paper]')).length;
  } else {
    // Fallback if list is empty but stats are populated
    const totalCount = getDomainValue(learner, 'research papers/article');
    articlesCount = totalCount;
  }

  if (books >= 1) badges.push(getBadge('first_page'));
  if (books >= 3) badges.push(getBadge('seeker_of_knowledge'));
  if (books >= 5) badges.push(getBadge('keeper_of_scrolls'));
  if (books >= 10) badges.push(getBadge('library_dweller'));
  if (books >= 25) badges.push(getBadge('scribe_of_wisdom'));

  if (tafsirCount >= 1) badges.push(getBadge('student_of_tafsir'));
  if (tafsirCount >= 2) badges.push(getBadge('reflection_upon_revelation'));
  if (tafsirCount >= 3) badges.push(getBadge('bearer_of_quranic_insight'));
  if (tafsirCount >= 4) badges.push(getBadge('sage_of_quranic_wisdom'));

  if (completedSeerah) {
    badges.push(getBadge('walker_of_the_seerah'));
    badges.push(getBadge('lover_of_the_beloved'));
    badges.push(getBadge('guardian_of_the_prophetic_legacy'));
  }

  if (dowraCount >= 1) badges.push(getBadge('people_of_the_quran'));
  if (dowraCount >= 2) badges.push(getBadge('heart_illumined'));
  if (dowraCount >= 3) badges.push(getBadge('companion_of_revelation'));
  if (dowraCount >= 4) badges.push(getBadge('ahl_al_quran'));

  if (articlesCount >= 1) badges.push(getBadge('scribe_in_training'));
  if (articlesCount >= 2) badges.push(getBadge('voice_of_the_pen'));
  if (articlesCount >= 3) badges.push(getBadge('scholar_of_the_scroll'));
  if (articlesCount >= 4) badges.push(getBadge('guardian_of_narratives'));

  if (papersCount >= 1) badges.push(getBadge('scholars_1st_step'));
  if (papersCount >= 2) badges.push(getBadge('master_of_treatise'));
  if (papersCount >= 3) badges.push(getBadge('authority_of_archive'));
  if (papersCount >= 4) badges.push(getBadge('luminary_of_pen'));
  if (papersCount >= 5) badges.push(getBadge('scholarly_explorer'));
  if (papersCount >= 6) badges.push(getBadge('grand_mujtahid'));

  if (presentations >= 1) badges.push(getBadge('voice_of_reflection'));
  if (presentations >= 3) badges.push(getBadge('majlis_speaker'));
  if (presentations >= 5) badges.push(getBadge('bearer_of_insight_pres'));
  if (presentations >= 10) badges.push(getBadge('voice_of_the_lounge'));

  if (tasks >= 5) badges.push(getBadge('steadfast'));
  if (tasks >= 20) badges.push(getBadge('consistent_heart'));
  if (tasks >= 50) badges.push(getBadge('pillar_of_commitment'));
  if (tasks >= 100) badges.push(getBadge('legacy_builder'));

  if (talaqqiCount >= 1) badges.push(getBadge('seeker_of_the_circle'));
  if (talaqqiCount >= 3) badges.push(getBadge('student_of_the_chain'));
  if (talaqqiCount >= 5) badges.push(getBadge('companion_of_scholars'));
  if (talaqqiCount >= 10) badges.push(getBadge('guardian_of_tradition'));

  const hasTafsir = tafsirCount >= 1;
  const hasDawra = dowraCount >= 1;
  const hasArticlesOrPapers = articlesCount >= 1 || papersCount >= 1;

  if (hasTafsir && completedSeerah) badges.push(getBadge('student_of_revelation_and_legacy'));
  if (hasDawra && completedSeerah) badges.push(getBadge('path_of_prophetic_guidance'));
  if (hasDawra && hasTafsir && completedSeerah && hasArticlesOrPapers && presentations >= 5 && tasks >= 50) {
    badges.push(getBadge('wisdom_lounge_elder'));
  }

  return badges;
}
