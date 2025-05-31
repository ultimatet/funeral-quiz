import React, { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Radar } from "react-chartjs-2";

import "./Report.css";

// Report component displays the user's quiz results, including a radar chart and detailed analysis
const Report = ({ report, onRetake }) => {
    const { user } = useAuth0();
    const [scores, setScores] = useState(null);

    // Fetch the user's latest quiz report (with benchmark) from the backend
    useEffect(() => {
        const fetchResults = async () => {
            try {
                // Step 1: Get user ID by email
                const encodedEmail = encodeURIComponent(user.email);
                const userResponse = await fetch(`http://localhost:5000/user/id/${encodedEmail}`);
                const userData = await userResponse.json();

                if (!userData.id) {
                    console.warn("No user ID found for email.");
                    return;
                }

                // Step 2: Get quiz results using the user ID (with benchmark report)
                const resultsResponse = await fetch(
                    `http://localhost:5000/question/results/${userData.id}`
                );
                const resultsData = await resultsResponse.json();

                if (resultsData.results && resultsData.results.length > 0) {
                    // Get the most recent result (first in array since ordered by createdAt DESC)
                    const latestResult = resultsData.results[0];
                    setScores(latestResult.report || latestResult.scores); // Use report if present
                } else {
                    console.warn("No quiz results found for user.");
                }
            } catch (error) {
                console.error("Error fetching user results:", error);
            }
        };

        if (user?.email) fetchResults();
    }, [user]);

    // Define color palettes for each domain in the radar chart
    const domainColors = [
        "rgba(255, 99, 132, 0.5)", // red
        "rgba(54, 162, 235, 0.5)", // blue
        "rgba(255, 205, 86, 0.5)", // yellow
        "rgba(75, 192, 192, 0.5)", // teal
        "rgba(153, 102, 255, 0.5)", // purple
        "rgba(255, 159, 64, 0.5)", // orange
        "rgba(83, 102, 255, 0.5)", // indigo
        "rgba(199, 199, 199, 0.5)", // grey
    ];

    const borderColors = [
        "rgba(255, 99, 132, 1)",
        "rgba(54, 162, 235, 1)",
        "rgba(255, 205, 86, 1)",
        "rgba(75, 192, 192, 1)",
        "rgba(153, 102, 255, 1)",
        "rgba(255, 159, 64, 1)",
        "rgba(83, 102, 255, 1)",
        "rgba(199, 199, 199, 1)",
    ];

    // Prepare radar chart data, assigning a unique color to each domain
    const radarData = scores
        ? {
              labels: Object.keys(scores),
              datasets: [
                  {
                      label: "Death Literacy Score",
                      data: Object.values(scores).map((v) =>
                          typeof v.score === "number" && !isNaN(v.score)
                              ? Number(v.score.toFixed(2))
                              : typeof v === "number" && !isNaN(v)
                              ? Number(v.toFixed(2))
                              : 0
                      ),
                      backgroundColor: Object.keys(scores).map(
                          (_, i) => domainColors[i % domainColors.length]
                      ),
                      borderColor: Object.keys(scores).map(
                          (_, i) => borderColors[i % borderColors.length]
                      ),
                      borderWidth: 3,
                      pointBackgroundColor: Object.keys(scores).map(
                          (_, i) => borderColors[i % borderColors.length]
                      ),
                      pointBorderColor: "#fff",
                  },
              ],
          }
        : null;

    // Radar chart options, including custom legend to show all domains
    const radarOptions = {
        responsive: true,
        plugins: {
            legend: {
                display: true,
                position: "bottom",
                labels: {
                    usePointStyle: true,
                    padding: 30,
                    font: {
                        size: 16,
                    },
                    // Show all domains in the legend with their color
                    generateLabels: (chart) => {
                        const labels = chart.data.labels || [];
                        return labels.map((label, i) => ({
                            text: label,
                            fillStyle: chart.data.datasets[0].backgroundColor[i],
                            strokeStyle: chart.data.datasets[0].borderColor[i],
                            lineWidth: 5,
                            hidden: false,
                            index: i,
                        }));
                    },
                },
            },
        },
        scales: {
            r: {
                suggestedMin: 0,
                suggestedMax: 10, // max score per domain is 10
                ticks: {
                    beginAtZero: true,
                },
            },
        },
    };

    return (
        <div className="report">
            <h2>Your Assessment Report</h2>
            <div className="report-view">
                {/* Radar Chart (shows scores for each domain, colored per domain) */}
                {radarData && (
                    <div className="chart-container">
                        <h3>Score Visualization</h3>
                        <div className="responsive-radar">
                            <Radar data={radarData} options={radarOptions} />
                        </div>
                    </div>
                )}

                {/* Detailed Report (collapsible per domain) */}
                <div className="detailed-report">
                    <h3>Detailed Analysis</h3>
                    {scores &&
                        Object.entries(scores).map(([domain, value]) => {
                            // If backend returns a report object, use its fields
                            const score =
                                value && typeof value === "object" && value.score !== undefined
                                    ? value.score
                                    : value;
                            const againstBenchmark =
                                value && typeof value === "object"
                                    ? value.againstBenchmark
                                    : undefined;
                            const meaning =
                                value && typeof value === "object" ? value.meaning : undefined;
                            const action =
                                value && typeof value === "object" ? value.action : undefined;
                            return (
                                <details key={domain} className="report-domain">
                                    <summary className="domain-summary">
                                        <h4>{domain}</h4>
                                        <span className="score-badge">
                                            {typeof score === "number" && !isNaN(score)
                                                ? score.toFixed(1)
                                                : "-"}
                                            /10
                                        </span>
                                    </summary>
                                    <div className="domain-content">
                                        <p>
                                            <strong>How you scored:</strong>{" "}
                                            {againstBenchmark || "-"}
                                        </p>
                                        <p>
                                            <strong>What this means:</strong> {meaning || "-"}
                                        </p>
                                        <p>
                                            <strong>What you can do:</strong> {action || "-"}
                                        </p>
                                    </div>
                                </details>
                            );
                        })}
                </div>
            </div>

            {/* Retake Quiz button */}
            <div className="report-actions">
                <button onClick={onRetake}>Retake Quiz</button>
            </div>
        </div>
    );
};

export default Report;
