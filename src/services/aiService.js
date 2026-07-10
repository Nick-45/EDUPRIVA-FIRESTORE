class AIService {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      this.initialized = true;
      console.log('AI Service initialized with fallback rules');
    } catch (error) {
      console.warn('AI init failed:', error);
      this.initialized = true;
    }
  }

  // Intent detection
  detectIntent(message, userRole) {
    const msg = message.toLowerCase();

    const patterns = {
      CHECK_FEES: ['fee', 'balance', 'deni', 'ngapi', 'bill'],
      PAY_FEES: ['pay', 'lipa', 'mpesa', 'stk', 'tuma'],
      VIEW_RESULTS: ['result', 'grade', 'score', 'matokeo', 'marks'],
      GET_REPORT_CARD: ['report', 'slip', 'ripoti'],
      VIEW_ATTENDANCE: ['attend', 'present', 'absent'],
      HELP: ['help', 'menu', 'saidia']
    };

    for (const [intent, keywords] of Object.entries(patterns)) {
      if (keywords.some(k => msg.includes(k))) {
        return intent;
      }
    }

    return 'GENERAL_QUERY';
  }

  // CBC remark
  generateRemark(studentName, subject, score, previousLevel) {
    const scoreNum = Number(score);

    let level = 'BE';
    if (scoreNum >= 80) level = 'EE';
    else if (scoreNum >= 60) level = 'ME';
    else if (scoreNum >= 40) level = 'AE';

    const feedbackMap = {
      EE: `excellent understanding of ${subject}. Outstanding performance!`,
      ME: `good grasp of ${subject}. Keep practicing to reach the next level.`,
      AE: `showing effort in ${subject}. Needs more practice and revision.`,
      BE: `requires additional support in ${subject}. Focus on fundamentals.`
    };

    let progressNote = '';
    const levelScore = { EE: 4, ME: 3, AE: 2, BE: 1 };

    const currentScore = levelScore[level];
    const previousScore = levelScore[previousLevel] || 2;

    if (currentScore > previousScore) {
      progressNote = ` Great improvement from ${previousLevel} to ${level}!`;
    } else if (currentScore < previousScore) {
      progressNote = ` Needs attention as performance dropped from ${previousLevel}.`;
    }

    return `${studentName} demonstrates ${feedbackMap[level]}${progressNote}`;
  }

  // Performance analysis
  analyzePerformance(assessments) {
    if (!assessments || assessments.length === 0) {
      return {
        insight: 'No assessment data available yet.',
        recommendation: 'Complete at least 3 assessments.'
      };
    }

    let totalScore = 0;
    const subjects = {};

    assessments.forEach(a => {
      const score = Number(a.score) || 0;

      if (!subjects[a.subject]) {
        subjects[a.subject] = [];
      }

      subjects[a.subject].push(score);
      totalScore += score;
    });

    const avgScore = Math.round(totalScore / assessments.length);

    let weakestSubject = null;
    let lowestAvg = 100;

    for (const subject in subjects) {
      const scores = subjects[subject];
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

      if (avg < lowestAvg) {
        lowestAvg = avg;
        weakestSubject = subject;
      }
    }

    let overallLevel = 'ME';
    if (avgScore >= 80) overallLevel = 'EE';
    else if (avgScore < 40) overallLevel = 'BE';
    else if (avgScore < 60) overallLevel = 'AE';

    return {
      insight: `Overall performance: ${overallLevel} with ${avgScore}% average.`,
      recommendation:
        lowestAvg < 60
          ? `Focus on ${weakestSubject} (${Math.round(lowestAvg)}%).`
          : avgScore >= 80
          ? `Excellent work! Aim higher.`
          : `Keep consistent effort.`,
      overallLevel,
      avgScore
    };
  }

  // Payment risk
  predictPaymentDefault(paymentHistory, currentBalance) {
    if (!paymentHistory?.length) {
      return { risk: 'Unknown', message: 'No payment history' };
    }

    const recent = paymentHistory.slice(-3);

    const avgPayment =
      recent.reduce((sum, p) => sum + Number(p.amount || 0), 0) /
      recent.length;

    const onTime = recent.filter(p => p.status === 'on_time').length;

    if (avgPayment < 5000 && currentBalance > 10000) {
      return { risk: 'High', message: 'High default risk. Follow up.' };
    }

    if (onTime < 2) {
      return { risk: 'Medium', message: 'Occasional delays. Send reminder.' };
    }

    return { risk: 'Low', message: 'Good payment record.' };
  }

  // WhatsApp responses
  generateParentResponse(parentName, studentName, intent, data) {
    if (intent === 'CHECK_FEES') {
      return `💰 Fee Status for ${studentName}\nBalance: KES ${(data.balance || 0).toLocaleString()}`;
    }

    if (intent === 'PAY_FEES') {
      return `💳 Payment Initiated\nTotal: KES ${(data.total || 0).toLocaleString()}`;
    }

    if (intent === 'VIEW_RESULTS') {
      if (!data.results?.length) {
        return `No results available yet for ${studentName}`;
      }

      const results = data.results
        .map(r => `${r.subject}: ${r.score}% (${r.level})`)
        .join('\n');

      return `Results for ${studentName}\n${results}`;
    }

    return `Hello ${parentName}, reply with:\nCHECK FEES\nPAY [amount]\nVIEW RESULTS`;
  }
}

export const aiService = new AIService();
export default aiService;
