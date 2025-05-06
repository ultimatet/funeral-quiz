const express         = require('express');
const { Question, QuizResult } = require('../models');
const questions       = require('../data/questions.json');

const router = express.Router();

// GET /quiz/questions
router.get('/questions', (req, res) => {
  res.json(questions);
});

// POST /quiz/submit
router.post('/submit', async (req, res) => {
  try {
    const { userId, answers } = req.body;

    // 1) Sum & count per domain
    const sums = {}, counts = {};
    questions.forEach(q => {
      const score = answers[q.id];
      if (score == null) return;
      sums[q.domain]   = (sums[q.domain]   || 0) + score;
      counts[q.domain] = (counts[q.domain] || 0) + 1;
    });

    // 2) Scale averages to 0–10
    const scores = {};
    Object.keys(sums).forEach(domain => {
      const avg = sums[domain] / counts[domain];
      scores[domain] = Number(((avg - 1) / 4 * 10).toFixed(2));
    });

    // 3) Save to DB
    await QuizResult.create({ userId, answers, scores });

    // 4) Simple feedback
    const feedback = {};
    Object.entries(scores).forEach(([domain, val]) => {
      feedback[domain] = 
        val < 4   ? 'Below benchmark' :
        val < 7   ? 'At benchmark'    :
                    'Above benchmark';
    });

    res.json({ scores, feedback });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
