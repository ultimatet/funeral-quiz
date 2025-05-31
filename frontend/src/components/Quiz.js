import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import Report from "./Report";
import "./Quiz.css";

const Quiz = () => {
    const { user } = useAuth0();
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [step, setStep] = useState(0);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // 1) Fetch questions on mount
    useEffect(() => {
        fetch("/question/")
            .then((res) => res.json())
            .then((data) => {
                // Normalize to always use q.id as a string and q.category, and set q.question_text for frontend compatibility
                const normalized = data.map((q) => ({
                    ...q,
                    id: typeof q.id === "number" ? String(q.id) : q.id, // ensure id is string (matches DB integer)
                    question_text: q.question_text || q.text || q.questionText || q.prompt || "",
                    category: q.category || q.domain || "",
                }));
                setQuestions(normalized);
            })
            .catch((err) => console.error("Failed to fetch quiz questions:", err));
    }, []);

    // 2) Record an answer (1–5)
    const handleSelect = (value) => {
        const q = questions[step];
        setAnswers((a) => ({ ...a, [q.id]: value }));
    };

    // 3) Move next or submit
    const handleNext = () => {
        if (step < questions.length - 1) {
            setStep((s) => s + 1);
        } else {
            submitQuiz();
        }
    };
    // 4) Submit answers to backend
    const submitQuiz = async () => {
        if (!user?.email) {
            console.error("No authenticated user found");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                email: user.email, // Using email from Auth0 user
                answers,
            };
            const res = await fetch("question/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const { report } = await res.json();
            setReport(report);
        } catch (err) {
            console.error("Quiz submission failed:", err);
        } finally {
            setLoading(false);
        }
    };
    //     // 1. Fetch userId from Supabase using the email
    //     const { data: userData, error: userError } = await supabase
    //         .from("users")
    //         .select("id")
    //         .eq("auth0_email", user.email)
    //         .single();

    //     if (userError || !userData?.id) {
    //         throw new Error("User not found in Supabase: " + userError?.message);
    //     }

    //     const userId = userData.id;

    //     // 2. Transform answers from { qid: value } to array of { questionId, selectedValue }
    //     const transformedAnswers = Object.entries(answers).map(
    //         ([questionId, selectedValue]) => ({
    //             questionId,
    //             selectedValue,
    //         })
    //     );

    //     // 3. Compute category scores (simple average per category for now)
    //     const categoryScores = {};
    //     questions.forEach((q) => {
    //         const val = answers[q.id];
    //         if (val) {
    //             categoryScores[q.category] = categoryScores[q.category] || [];
    //             categoryScores[q.category].push(val);
    //         }
    //     });

    //     Object.keys(categoryScores).forEach((cat) => {
    //         const values = categoryScores[cat];
    //         const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    //         categoryScores[cat] = Number(average.toFixed(2));
    //     });

    //     // 4. Submit to Supabase `quiz_results` table
    //     const { data: resultData, error: resultError } = await supabase
    //         .from("quiz_results")
    //         .insert([
    //             {
    //                 userId,
    //                 answers: transformedAnswers,
    //                 categoryScores,
    //             },
    //         ])
    //         .select();

    //     if (resultError) {
    //         throw new Error("Failed to insert quiz result: " + resultError.message);
    //     }

    //     console.log("Quiz result submitted:", resultData);
    //     setReport({ categoryScores }); // or use resultData[0] if you want full result
    // } catch (err) {
    //     console.error("Quiz submission failed:", err);
    // } finally {
    //     setLoading(false);
    // }

    // 5) Render states
    if (!questions.length) return <div>Loading questions…</div>;
    if (report)
        return (
            <Report
                report={report}
                onRetake={() => {
                    setReport(null);
                    setAnswers({});
                    setStep(0);
                }}
            />
        );

    const q = questions[step];
    const selected = answers[q.id] || 0;

    return (
        <div className="quiz-container">
            <div className="quiz">
                <h2>
                    Question {step + 1} of {questions.length}
                </h2>
                <p className="question-text">{q.question_text}</p>

                <div className="likert-scale">
                    {[1, 2, 3, 4, 5].map((n) => (
                        <label key={n} className="likert-option">
                            <input
                                type="radio"
                                name={q.id}
                                value={n}
                                checked={selected === n}
                                onChange={() => handleSelect(n)}
                            />
                            {n}
                        </label>
                    ))}
                </div>

                <div className="quiz-nav">
                    {step > 0 && (
                        <button onClick={() => setStep((s) => s - 1)} disabled={loading}>
                            Back
                        </button>
                    )}
                    {step === 0 && <button onClick={() => navigate("/")}>Back</button>}
                    <button
                        onClick={handleNext}
                        disabled={!selected || loading}
                        className="next-button"
                    >
                        {step < questions.length - 1
                            ? "Next"
                            : loading
                            ? "Submitting…"
                            : "Submit Quiz"}
                    </button>
                </div>

                <button className="cancel-button" onClick={() => navigate("/")}>
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default Quiz;
