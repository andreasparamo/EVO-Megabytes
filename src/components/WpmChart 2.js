"use client";
import { useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import useThemeColors from "@/src/hooks/useThemeColors";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function WpmChart({ data, finalWpm, finalAcc }) {
  const chartRef = useRef(null);

  const colors = useThemeColors();

  // Prepare chart data
  const chartData = {
    labels: data.map((d) => `${d.time.toFixed(1)}s`),
    datasets: [
      {
        label: "WPM",
        data: data.map((d) => d.wpm),
        borderColor: colors.accent1,
        backgroundColor: `${colors.accent1}33`,
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: colors.accent1,
        pointBorderColor: colors.bg,
        pointBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: colors.text,
          font: { size: 12 },
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: colors.bg,
        titleColor: colors.text,
        bodyColor: colors.text,
        borderColor: colors.muted,
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            return `WPM: ${Math.round(value)}`;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Time",
          color: colors.muted,
        },
        ticks: {
          color: colors.muted,
          maxTicksLimit: 10,
        },
        grid: {
          color: `${colors.muted}22`,
        },
      },
      y: {
        type: "linear",
        display: true,
        position: "left",
        title: {
          display: true,
          text: "WPM",
          color: colors.muted,
        },
        ticks: {
          color: colors.muted,
        },
        grid: {
          color: `${colors.muted}22`,
        },
        min: 0,
      },
    },
  };

  // Handle empty data gracefully
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--muted)",
        }}
      >
        No data to display
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <Line ref={chartRef} data={chartData} options={options} />
    </div>
  );
}
