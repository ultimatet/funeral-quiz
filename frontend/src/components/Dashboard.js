import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import axios from "axios";
import FileSaver from "file-saver";
import "./Dashboard.css";

const Dashboard = () => {
    const { user, isAuthenticated } = useAuth0();

    const [userRole, setUserRole] = useState(null); // role fetched from backend
    const [questions, setQuestions] = useState([]);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ question_text: "", category: "", choices: [] });
    const [error, setError] = useState("");
    const [view, setView] = useState("menu"); // "menu", "edit", "export"

    // Fetch user role from backend after authentication
    useEffect(() => {
        const fetchRole = async () => {
            if (isAuthenticated && user?.email) {
                try {
                    const encodedEmail = encodeURIComponent(user.email); // handle @
                    const response = await fetch(`http://localhost:5000/user/role/${encodedEmail}`);
                    const data = await response.json();

                    if (response.ok) {
                        setUserRole(data.role);
                    } else {
                        console.error("Error fetching role:", data.error);
                    }
                } catch (error) {
                    console.error("API error:", error);
                }
            }
        };

        fetchRole();
    }, [isAuthenticated, user]);

    // Role verification
    useEffect(() => {
        if (isAuthenticated && userRole !== "admin" && userRole !== "researcher") {
            setError("Access denied");
        } else {
            setError("");
        }
    }, [isAuthenticated, userRole]);

    //Fetch questions only if admin
    useEffect(() => {
        if (isAuthenticated && userRole === "admin") {
            axios.get("http://localhost:5000/question").then((res) => setQuestions(res.data));
        }
    }, [isAuthenticated, userRole]);

    const handleEdit = (q) => {
        setEditing(q.id);
        setForm({
            question_text: q.question_text,
            category: q.category,
            choices: q.choices ? q.choices.map((c) => ({ ...c })) : [],
        });
    };

    const handleDelete = (id) => {
        axios
            .delete(`http://localhost:5000/admin/questions/${id}`)
            .then(() => {
                setQuestions(questions.filter((q) => q.id !== id));
                setForm({ question_text: "", category: "", choices: [] });
                setEditing(null);
                console.log("Question deleted successfully");
            })
            .catch((err) => {
                console.error("Error deleting question:", err);
            });
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleChoiceChange = (idx, value) => {
        const newChoices = [...form.choices];
        newChoices[idx].choice_text = value;
        setForm({ ...form, choices: newChoices });
    };

    const addChoice = () => {
        setForm({ ...form, choices: [...form.choices, { choice_text: "" }] });
    };

    const removeChoice = (idx) => {
        const newChoices = form.choices.filter((_, i) => i !== idx);
        setForm({ ...form, choices: newChoices });
    };

    const handleSubmit = (e) => {};

    // Export quiz_results as CSV and trigger download
    const handleExport = async () => {
        try {
            const response = await fetch("http://localhost:5000/admin/export-quiz-results");
            if (!response.ok) throw new Error("Failed to fetch quiz results");
            const blob = await response.blob();
            FileSaver.saveAs(blob, "quiz_results.csv");
        } catch (err) {
            alert("Export failed: " + err.message);
        }
    };

    if (error) return <div className="dashboard-error">{error}</div>;
    if (!isAuthenticated || (userRole !== "admin" && userRole !== "researcher")) return null;

    return (
        <div className="outer-dashboard-container">
            <div className="dashboard-container">
                <h2>Admin/Researcher Dashboard</h2>

                {view === "menu" && (
                    <div className="dashboard-menu">
                        <button onClick={() => setView("edit")}>Edit Questions</button>
                        <button onClick={() => setView("export")}>Export Data</button>
                    </div>
                )}

                {view === "edit" && (
                    <>
                        <button id="back-btn" onClick={() => setView("menu")}>
                            ← Back to Menu
                        </button>

                        {userRole === "admin" ? (
                            <>
                                <form onSubmit={handleSubmit} className="dashboard-form">
                                    <input
                                        name="question_text"
                                        value={form.question_text}
                                        onChange={handleChange}
                                        placeholder="Question text"
                                        required
                                    />
                                    <input
                                        name="category"
                                        value={form.category}
                                        onChange={handleChange}
                                        placeholder="Category"
                                    />
                                    <div className="dashboard-choices">
                                        <b>Choices:</b>
                                        {form.choices.map((c, idx) => (
                                            <div key={idx} className="choice-container">
                                                <input
                                                    value={c.choice_text}
                                                    onChange={(e) =>
                                                        handleChoiceChange(idx, e.target.value)
                                                    }
                                                    placeholder={`Choice ${idx + 1}`}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    className="remove-btn"
                                                    onClick={() => removeChoice(idx)}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                        <button type="button" onClick={addChoice}>
                                            Add Choice
                                        </button>
                                    </div>
                                    <button type="submit">
                                        {editing ? "Update" : "Add"} Question
                                    </button>
                                    {editing && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditing(false);
                                                setForm({
                                                    question_text: "",
                                                    category: "",
                                                    choices: [],
                                                });
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </form>

                                <h3>All Questions</h3>
                                <ul className="dashboard-list">
                                    {questions.map((q) => (
                                        <li key={q.id}>
                                            <b>{q.question_text}</b> <i>({q.category})</i>
                                            <ul>
                                                {q.choices &&
                                                    q.choices.map((c, i) => (
                                                        <li key={i}>{c.choice_text}</li>
                                                    ))}
                                            </ul>
                                            <button onClick={() => handleEdit(q)}>Edit</button>
                                            <button onClick={() => handleDelete(q.id)}>
                                                Delete
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        ) : (
                            <p>
                                <br />
                                You do not have permission to edit questions.
                            </p>
                        )}
                    </>
                )}

                {view === "export" && (
                    <div className="export-placeholder">
                        <div className="table-summary">
                            <h2>Summary of Quiz Results Table</h2>
                            <p>
                                This table displays quiz submissions collected from all users across
                                the platform. Each row represents a unique quiz attempt and includes
                                the following information:
                            </p>
                            <ul>
                                <li>
                                    <strong>id</strong>: The unique identifier for each quiz result
                                    submission. Each quiz attempt receives its own sequential id.
                                </li>
                                <li>
                                    <strong>userId</strong>: The unique identifier of the user who
                                    submitted the quiz. This links the result to the user's account
                                    in the database.
                                </li>
                                <li>
                                    <strong>answers</strong>: A JSON array containing each{" "}
                                    <code>questionId</code> and its corresponding{" "}
                                    <code>selectedValue</code> (rated from 1 to 5).
                                </li>
                                <li>
                                    <strong>categoryScores</strong>: A JSON object with the average
                                    score per domain (e.g.,
                                    <em> Talking Support</em>, <em> Knowledge</em>,{" "}
                                    <em> Experience</em>, etc.), calculated based on the answers
                                    submitted.
                                </li>
                                <li>
                                    <strong>createdAt / updatedAt</strong>: Timestamps indicating
                                    when each quiz result was recorded or last modified.
                                </li>
                                <li>
                                    <strong>user_email</strong>: The email of the user who submitted
                                    the quiz, used to associate results with individual users.
                                </li>
                            </ul>
                            <p>
                                This dataset enables researchers and administrators to analyze
                                trends in death literacy, monitor learning progress across
                                demographics, and evaluate the effectiveness of interventions or
                                educational resources offered on the platform.
                            </p>
                        </div>

                        <button onClick={handleExport}>Download Quiz Results</button>
                        <button onClick={() => setView("menu")}>← Back to Menu</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
