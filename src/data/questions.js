// Passover questions for religious conservative (תורני שמרני) audience
export const questions = [
  {
    id: 1,
    text: "האם אוכלים מצה בליל הסדר?",
    answer: true,
    explanation: "נכון! אכילת מצה היא מצווה מהתורה בליל פסח 🫓",
    difficulty: "easy"
  },
  {
    id: 2,
    text: "האם מותר לאכול חמץ בפסח?",
    answer: false,
    explanation: "לא נכון! אסור לאכול חמץ כל ימי הפסח 🚫🍞",
    difficulty: "easy"
  },
  {
    id: 3,
    text: "האם יש ארבע כוסות יין בליל הסדר?",
    answer: true,
    explanation: "נכון! שותים ארבע כוסות יין כנגד ארבע לשונות של גאולה 🍷",
    difficulty: "easy"
  },
  {
    id: 4,
    text: "האם משה רבנו הוציא את בני ישראל ממצרים?",
    answer: true,
    explanation: "נכון! משה רבנו הוביל את עם ישראל ביציאת מצרים 🌊",
    difficulty: "easy"
  },
  {
    id: 5,
    text: "האם היו שבע מכות במצרים?",
    answer: false,
    explanation: "לא נכון! היו עשר מכות במצרים 🔟",
    difficulty: "medium"
  },
  {
    id: 6,
    text: "האם המרור מזכיר לנו את המרירות של השעבוד?",
    answer: true,
    explanation: "נכון! המרור מסמל את חיי השעבוד המרים במצרים 🥬",
    difficulty: "easy"
  },
  {
    id: 7,
    text: 'האם אומרים "מה נשתנה" בליל הסדר?',
    answer: true,
    explanation: "נכון! הבן הקטן שואל את ארבע הקושיות 👦",
    difficulty: "easy"
  },
  {
    id: 8,
    text: "האם החרוסת מזכירה את הלבנים שבנו במצרים?",
    answer: true,
    explanation: "נכון! החרוסת דומה לטיט שממנו עשו לבנים 🧱",
    difficulty: "medium"
  },
  {
    id: 9,
    text: "האם פסח נמשך יום אחד בלבד?",
    answer: false,
    explanation: "לא נכון! פסח נמשך שבעה ימים (ובחו״ל שמונה) 📅",
    difficulty: "medium"
  },
  {
    id: 10,
    text: "האם אליהו הנביא מגיע לכל סדר פסח?",
    answer: true,
    explanation: "נכון! פותחים את הדלת ומוזגים כוס לאליהו הנביא 🚪",
    difficulty: "medium"
  },
  {
    id: 11,
    text: "האם הכוס החמישית בסדר נקראת כוס אליהו?",
    answer: true,
    explanation: "נכון! כוס אליהו היא הכוס החמישית שמוזגים לכבוד אליהו הנביא 🏆",
    difficulty: "medium"
  },
  {
    id: 12,
    text: "האם קריעת ים סוף היתה לפני יציאת מצרים?",
    answer: false,
    explanation: "לא נכון! קריעת ים סוף היתה אחרי יציאת מצרים, ביום השביעי 🌊",
    difficulty: "hard"
  },
  {
    id: 13,
    text: "האם בודקים חמץ בליל י״ד בניסן?",
    answer: true,
    explanation: "נכון! בודקים חמץ לאור הנר בליל י״ד בניסן 🕯️",
    difficulty: "hard"
  },
  {
    id: 14,
    text: "האם מצה שמורה נאפית תוך 18 דקות?",
    answer: true,
    explanation: "נכון! מצה חייבת להיאפות תוך 18 דקות כדי שלא תחמיץ ⏱️",
    difficulty: "medium"
  },
  {
    id: 15,
    text: "האם הזרוע בקערת הסדר מסמלת את קרבן פסח?",
    answer: true,
    explanation: "נכון! הזרוע זכר לקרבן הפסח שהקריבו בבית המקדש 🦴",
    difficulty: "hard"
  }
];

export function getRandomQuestions(count = 5) {
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
