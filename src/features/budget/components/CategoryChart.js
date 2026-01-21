import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { fetchCategoryExpenseData } from "../../../api/budgetApi"
import "./CategoryChart.css";

const CategoryChart = ({
  month,
  userId,
  groupId,
  userColor = "#f4a8a8",
  onCategoryClick,
}) => {
  const [chartData, setChartData] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadChartData = async () => {
      if (!month || (!userId && !groupId)) return;

      try {
        setLoading(true);
        const data = await fetchCategoryExpenseData(month, userId, groupId);
        setChartData(data);
      } catch (err) {
        console.error("카테 고리 차트 데이터 로딩 실패:", err);
      } finally {
        setLoading(false);
      }
    };

    loadChartData();
  }, [month, userId, groupId]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="category-chart-tooltip">
          <p className="tooltip-label">{label}</p>
          <p className="tooltip-value">{payload[0].value.toLocaleString()}원</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="category-chart-container">
        <h3 className="chart-title">카테고리별 지출</h3>
        <div className="chart-loading">불러오는 중...</div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="category-chart-container">
        <h3 className="chart-title">카테고리별 지출</h3>
        <div className="chart-empty">지출 내역이 없습니다.</div>
      </div>
    );
  }

  // 카테고리명이 너무 길면 줄이기
  const formatCategoryName = (name) => {
    if (name.length > 8) {
      return name.substring(0, 8) + "...";
    }
    return name;
  };

  return (
    <div className="category-chart-container">
      <h3 className="chart-title">카테고리별 지출</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 20, left: 10, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="name"
            stroke="#666"
            fontSize={11}
            fontFamily="'S-CoreDream-3Light'"
            angle={-45}
            textAnchor="end"
            height={60}
            tickFormatter={formatCategoryName}
          />
          <YAxis
            stroke="#666"
            fontSize={11}
            fontFamily="'S-CoreDream-3Light'"
            tickFormatter={(value) => `${(value / 10000).toFixed(0)}만`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="amount"
            fill={userColor}
            onClick={(data) => onCategoryClick?.(data.category)}
            style={{ cursor: "pointer" }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CategoryChart;
