const { Question, QuizResult, User } = require("../models");
const loadOutputLookup = require("../utils/loadOutputLookup");
const { sequelize } = require("../models");

let outputLookup = {};

// Initialize output lookup once
const initializeOutputLookup = async () => {
    try {
        outputLookup = await loadOutputLookup();
    } catch (err) {
        console.error("Could not load output lookup:", err);
    }
};
initializeOutputLookup();

const questionController = {
    // --- Question CRUD ---
    async getAllQuestions(req, res) {
        try {
            const questions = await Question.findAll();
            if (questions.length === 0) {
                return res.status(200).json([]);
            }
            res.status(200).json(questions);
        } catch (error) {
            console.error("Error fetching questions:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    },

    async getQuestionById(req, res) {
        const { id } = req.params;
        try {
            const question = await Question.findByPk(id);
            if (!question) {
                return res.status(404).json({ error: "Question not found" });
            }
            res.status(200).json(question);
        } catch (error) {
            console.error("Error fetching question:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    },

    // --- Quiz logic ---
    async submitQuiz(req, res) {
        const transaction = await sequelize.transaction();
        try {
            const { email, answers } = req.body;
            // Find user by email
            const user = await User.findOne({ where: { auth0_email: email }, transaction });
            if (!user) {
                await transaction.rollback();
                return res.status(404).json({ error: "User not found" });
            }
            const userId = user.id;
            // Fetch questions from the database
            const dbQuestions = await Question.findAll({ transaction });
            const questions = dbQuestions.map((q) => q.get({ plain: true }));
            // Format answers and calculate scores
            const { scores, formattedAnswers } = questionController.processAnswers(
                answers,
                questions
            );
            if (formattedAnswers.length === 0) {
                await transaction.rollback();
                return res.status(400).json({ error: "No valid quiz answers provided" });
            }
            // Create a single quiz result record
            const quizResult = await QuizResult.create(
                {
                    userId: userId,
                    answers: formattedAnswers,
                    categoryScores: scores,
                },
                { transaction }
            );
            // Update user with latest result
            await User.update(
                { result: quizResult.id },
                {
                    where: { id: userId },
                    transaction,
                }
            );
            // Build the personalized report
            const report = questionController.buildReport(scores);
            // Commit transaction before sending response
            await transaction.commit();
            return res.json({ report, quizResultId: quizResult.id });
        } catch (err) {
            if (transaction && !transaction.finished) {
                await transaction.rollback();
            }
            console.error("Quiz submission error:", err);
            return res.status(500).json({ error: "Server error", details: err.message });
        }
    },

    processAnswers(answers, questions) {
        const scores = {};
        const formattedAnswers = [];
        for (let [questionId, selectedValue] of Object.entries(answers)) {
            if (selectedValue != null) {
                // Find the question from DB to get its category (was domain)
                // Ensure questionId is compared as string or number as needed
                const question = questions.find((q) => {
                    // Accept both 'Q1' and 1 as possible ids
                    return (
                        q.id === questionId ||
                        `Q${q.id}` === questionId ||
                        String(q.id) === questionId
                    );
                });
                if (question) {
                    // Use the category field from the DB
                    const category = question.category || question.domain || "";
                    // Initialize domain/category score if not exists
                    if (!scores[category]) {
                        scores[category] = 0;
                    }
                    // Accumulate score for the category
                    scores[category] += selectedValue;
                    // Add to formatted answers array
                    formattedAnswers.push({
                        questionId: question.id, // Use DB id (integer)
                        selectedValue: selectedValue,
                    });
                }
            }
        }
        // Normalize scores
        for (let category in scores) {
            const categoryQuestions = questions.filter(
                (q) => (q.category || q.domain) === category
            );
            scores[category] = scores[category] / categoryQuestions.length;
        }
        return { scores, formattedAnswers };
    },

    buildReport(scores) {
        const report = {};
        for (let [domain, score] of Object.entries(scores)) {
            const buckets = outputLookup[domain] || [];
            const bucket =
                buckets.find((b) => {
                    if (b.min != null && score < b.min) return false;
                    if (b.max != null && score > b.max) return false;
                    return true;
                }) || {};
            report[domain] = {
                score, // 0–5
                againstBenchmark: bucket.label || "", // "Lower"/"Similar"/"Higher"
                meaning: bucket.meaning || "", // "What This Means" text
                action: bucket.action || "", // "What You Can Do" text
            };
        }
        return report;
    },

    async getUserResults(req, res) {
        try {
            const { userId } = req.params;
            const results = await QuizResult.findAll({
                where: { userId },
                attributes: ["id", "answers", "categoryScores", "createdAt"],
                order: [["createdAt", "DESC"]],
            });
            if (!results || results.length === 0) {
                return res.status(404).json({ error: "No results found for this user" });
            }
            return res.json({
                userId,
                results: results.map((result) => ({
                    id: result.id,
                    answers: result.answers,
                    scores: result.categoryScores,
                    report: questionController.buildReport(result.categoryScores),
                    createdAt: result.createdAt,
                })),
            });
        } catch (err) {
            console.error("Get results error:", err);
            return res.status(500).json({ error: "Server error" });
        }
    },
};

module.exports = questionController;
