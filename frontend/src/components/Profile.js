import React, { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Radar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
} from "chart.js";
import "./Profile.css";

// Register Chart.js components
ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const Profile = () => {
    const { user, isAuthenticated } = useAuth0();
    const [userRole, setUserRole] = useState(null);
    const [reports, setReports] = useState([]); // Store up to 3 most recent reports
    const [selectedReportIdx, setSelectedReportIdx] = useState(0); // Index of report to display

    useEffect(() => {
        const fetchRole = async () => {
            if (isAuthenticated && user?.email) {
                try {
                    const encodedEmail = encodeURIComponent(user.email);
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

    //Fetch up to 3 most recent reports for the user
    useEffect(() => {
        const fetchReports = async () => {
            if (isAuthenticated && user?.email) {
                try {
                    const encodedEmail = encodeURIComponent(user.email);
                    // Get user ID
                    const userResponse = await fetch(
                        `http://localhost:5000/user/id/${encodedEmail}`
                    );
                    const userData = await userResponse.json();
                    if (!userData.id) return;
                    // Get up to 3 most recent quiz results
                    const resultsResponse = await fetch(
                        `http://localhost:5000/question/results/${userData.id}`
                    );
                    const resultsData = await resultsResponse.json();
                    if (resultsData.results && resultsData.results.length > 0) {
                        setReports(resultsData.results.slice(0, 3));
                    }
                } catch (err) {
                    console.error("Error fetching reports:", err);
                }
            }
        };
        fetchReports();
    }, [isAuthenticated, user]);

    // Color palettes for each domain (to match Report.js)
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

    // Prepare radar chart data for the selected report, with per-domain colors
    const selectedReport = reports[selectedReportIdx];
    const radarData = selectedReport
        ? {
              labels: Object.keys(selectedReport.scores),
              datasets: [
                  {
                      label: "Death Literacy Score",
                      data: Object.values(selectedReport.scores),
                      backgroundColor: Object.keys(selectedReport.scores).map(
                          (_, i) => domainColors[i % domainColors.length]
                      ),
                      borderColor: Object.keys(selectedReport.scores).map(
                          (_, i) => borderColors[i % borderColors.length]
                      ),
                      borderWidth: 3,
                      pointBackgroundColor: Object.keys(selectedReport.scores).map(
                          (_, i) => borderColors[i % borderColors.length]
                      ),
                      pointBorderColor: "#fff",
                  },
              ],
          }
        : null;

    // Radar chart options, including custom legend to show all domains, and smaller size
    const radarOptions = {
        responsive: true,
        plugins: {
            legend: {
                display: false, // Hide the legend
            },
        },
        scales: {
            r: {
                suggestedMin: 0,
                suggestedMax: 5,
                ticks: {
                    beginAtZero: true,
                    stepSize: 1,
                    font: { size: 12 },
                },
                pointLabels: {
                    font: { size: 13 },
                },
            },
        },
    };

    return (
        isAuthenticated && (
            <div className="profile-container">
                {/* Profile info stays on top */}
                <div className="profile-top">
                    <div className="profile">
                        <h2>{user.name}</h2>
                        <p>{user.email}</p>
                        <p>Role: {userRole}</p>
                    </div>
                </div>
                {/* Centered report card with selector, chart, and benchmark */}
                <div className="profile-report-card">
                    <h2>Reports</h2>
                    {/* Report selector */}
                    {reports.length > 1 && (
                        <div className="profile-report-selector">
                            <label htmlFor="report-select">
                                <b>Select Report:</b>{" "}
                            </label>
                            <select
                                id="report-select"
                                value={selectedReportIdx}
                                onChange={(e) => setSelectedReportIdx(Number(e.target.value))}
                            >
                                {reports.map((r, idx) => (
                                    <option key={r.id} value={idx}>
                                        {`Report on (${new Date(r.createdAt).toLocaleString()})`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    {selectedReport ? (
                        <div className="profile-report-view">
                            <div className="chart-container">
                                <h3>Score Visualization</h3>
                                <div className="responsive-radar">
                                    <Radar data={radarData} options={radarOptions} />
                                </div>
                            </div>
                            <div className="detailed-report">
                                <h3>Detailed Analysis</h3>
                                {selectedReport.report &&
                                    Object.entries(selectedReport.report).map(([domain, value]) => {
                                        const score =
                                            value &&
                                            typeof value === "object" &&
                                            value.score !== undefined
                                                ? value.score
                                                : value;
                                        const againstBenchmark =
                                            value && typeof value === "object"
                                                ? value.againstBenchmark
                                                : undefined;
                                        const meaning =
                                            value && typeof value === "object"
                                                ? value.meaning
                                                : undefined;
                                        const action =
                                            value && typeof value === "object"
                                                ? value.action
                                                : undefined;
                                        return (
                                            <details key={domain} className="report-domain">
                                                <summary className="domain-summary">
                                                    <h4>{domain}</h4>
                                                    <span className="score-badge">
                                                        {typeof score === "number" && !isNaN(score)
                                                            ? score.toFixed(1)
                                                            : "-"}
                                                        /5.0
                                                    </span>
                                                </summary>
                                                <div className="domain-content">
                                                    <p>
                                                        <strong>How you scored:</strong>{" "}
                                                        {againstBenchmark || "-"}
                                                    </p>
                                                    <p>
                                                        <strong>What this means:</strong>{" "}
                                                        {meaning || "-"}
                                                    </p>
                                                    <p>
                                                        <strong>What you can do:</strong>{" "}
                                                        {action || "-"}
                                                    </p>
                                                </div>
                                            </details>
                                        );
                                    })}
                            </div>
                        </div>
                    ) : (
                        <p>No reports found.</p>
                    )}
                </div>
            </div>
        )
    );
};

export default Profile;
