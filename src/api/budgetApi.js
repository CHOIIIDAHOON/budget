import supabase from "./supabase";

export const fetchUsers = async () => {
  const { data, error } = await supabase.from("users").select("id, username");

  if (error) throw error;
  return data;
};

export const fetchSharedTotalSummary = async (groupId) => {
  if (!groupId) throw new Error("groupId가 필요합니다.");

  const { data, error } = await supabase
    .from("transactions")
    .select(
      `
      id,
      category,
      amount,
      memo,
      date,
      categories (
        code,
        description,
        is_shared_total,
        is_deleted
      )
    `
    )
    .eq("shared_group_id", groupId);

  if (error) throw error;

  const filtered = data.filter(
    (row) =>
      row.categories &&
      row.categories.is_shared_total === true &&
      row.categories.is_deleted === false
  );

  // 🧮 카테고리별로 묶기
  const grouped = {};
  for (const row of filtered) {
    const code = row.category;
    const name = row.categories.description;
    const amt = Number(row.amount);

    if (!grouped[code]) {
      grouped[code] = { code, name, total: 0, transactions: [] };
    }

    grouped[code].total += amt;
    grouped[code].transactions.push({
      id: row.id,
      amount: amt,
      memo: row.memo,
      date: row.date,
    });
  }

  for (const key in grouped) {
    grouped[key].transactions.sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
  }

  return Object.values(grouped).sort((a, b) => b.total - a.total);
};

export const fetchBudgetData = async ({ userId = null, groupId = null }) => {
  const matchObj = {
    ...(userId && { user_id: userId }),
    ...(groupId && { shared_group_id: groupId }),
  };

  const { data, error } = await supabase
    .from("transactions")
    .select(
      `
      id,
      date,
      amount,
      category,
      memo,
      created_at,
      categories (
        description,
        is_deleted
      )
    `
    )
    .match(matchObj)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    date: row.date,
    amount: row.amount,
    category: row.category,
    category_name: row.categories?.description || "삭제된 카테고리",
    is_deleted: row.categories?.is_deleted === true,
    memo: row.memo,
  }));
};

export const fetchPersonalExpensesForGroupMembers = async (
  month,
  memberIds = []
) => {
  if (memberIds.length === 0) return {};

  const { data, error } = await supabase
    .from("transactions")
    .select("amount, date, user_id")
    .gte("date", `${month}-01`)
    .lt("date", `${getNextMonth(month)}-01`)
    .in("user_id", memberIds)
    .is("shared_group_id", null); // ✅ 개인 지출만

  if (error) {
    throw error;
  }

  const summary = {};
  for (const row of data) {
    const amt = Number(row.amount);
    if (amt < 0) {
      summary[row.user_id] = (summary[row.user_id] || 0) + -amt;
    }
  }

  return summary;
};

export const fetchGroupMembers = async (groupId) => {
  const { data, error } = await supabase
    .from("shared_group_members")
    .select("user_id, users(username)")
    .eq("shared_group_id", groupId);

  if (error) {
    throw error;
  }

  return data.map((m) => ({
    id: m.user_id,
    username: m.users.username,
  }));
};

// 월별 예산 및 지출 요약
export const fetchMonthlySummary = async (
  month,
  userId = null,
  groupId = null
) => {
  const { data: budgetData, error: budgetError } = await supabase
    .from("monthly_budget")
    .select("budget")
    .eq("month", month)
    .match(
      groupId ? { shared_group_id: groupId } : { user_id: userId }
    )
    .maybeSingle();

  if (budgetError) throw new Error("예산 정보 불러오기 실패");

  const budget = budgetData?.budget || 0;

  const { data: txData, error: txError } = await supabase
    .from("transactions")
    .select("amount, date")
    .gte("date", `${month}-01`)
    .lt("date", `${getNextMonth(month)}-01`)
    .match(
      groupId ? { shared_group_id: groupId } : { user_id: userId }
    );

  if (txError) throw new Error("지출 내역 불러오기 실패");

  const spent = txData.reduce((sum, row) => {
    const amt = Number(row.amount);
    return sum + (amt < 0 ? -amt : 0);
  }, 0);

  return {
    status: "success",
    month,
    budget,
    spent,
  };
};

// 거래 추가
export const addTransaction = async (
  { category, amount, memo, date },
  userId = null,
  groupId = null
) => {
  const { data, error } = await supabase.from("transactions").insert([
    {
      category,
      amount,
      memo,
      date,
      user_id: userId,
      shared_group_id: groupId,
    },
  ]);

  if (error) throw error;
  return { status: "success" };
};

export const addTransactions = async (transactions, userId = null, groupId = null) => {
  const records = transactions.map(({ category, amount, memo, date }) => ({
    category,
    amount,
    memo,
    date,
    user_id: userId,
    shared_group_id: groupId,
  }));
  const { error } = await supabase.from("transactions").insert(records);
  if (error) throw error;
  return { status: "success" };
};

export const updateTransaction = async (original, updated) => {
  const newUserId = updated.userId || null;
  const newGroupId = updated.groupId || null;

  const { error } = await supabase
    .from("transactions")
    .update({
      amount: updated.amount,
      memo: updated.memo,
      category: updated.category,
      date: updated.date,
      user_id: newUserId,
      shared_group_id: newGroupId,
    })
    .eq("id", original.id);

  if (error) throw error;
  return { status: "success" };
};

// 거래 삭제 (id 기준)
export const deleteTransaction = async (id) => {
  const { error } = await supabase.from("transactions").delete().eq("id", id); // 고유 id로 삭제

  if (error) throw error;
  return { status: "success" };
};

// 예산 저장
export const saveMonthlyBudget = async (
  month,
  budget,
  userId = null,
  groupId = null
) => {
  const matchFilter = groupId
    ? { month, shared_group_id: groupId }
    : { month, user_id: userId };

  const { data: existing } = await supabase
    .from("monthly_budget")
    .select("id")
    .match(matchFilter)
    .maybeSingle();

  let error;
  if (existing) {
    ({ error } = await supabase
      .from("monthly_budget")
      .update({ budget })
      .eq("id", existing.id));
  } else {
    const insertPayload = groupId
      ? { month, budget, user_id: null, shared_group_id: groupId }
      : { month, budget, user_id: userId, shared_group_id: null };
    ({ error } = await supabase.from("monthly_budget").insert([insertPayload]));
  }

  if (error) throw error;
  return { status: "success" };
};

// 월 이름 계산 유틸
function getNextMonth(month) {
  const [year, m] = month.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, m, 1)); // 다음 달 1일의 UTC 날짜
  const kstOffsetMs = 9 * 60 * 60 * 1000; // KST는 UTC+9시간

  const kstDate = new Date(utcDate.getTime() + kstOffsetMs); // KST 기준으로 보정

  const nextYear = kstDate.getFullYear();
  const nextMonth = String(kstDate.getMonth() + 1).padStart(2, "0");

  return `${nextYear}-${nextMonth}`;
}

// 카테고리 전체 불러오기
export const fetchCategories = async ({ userId = null, groupId = null }) => {
  const query = supabase
    .from("categories")
    .select("*")
    .eq("is_deleted", false)
    .order("sort", { ascending: true });

  if (userId) {
    query.eq("user_id", userId);
  } else if (groupId) {
    query.eq("shared_group_id", groupId);
  } else {
    throw new Error("userId 또는 groupId 중 하나는 반드시 필요합니다.");
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

// 카테고리 추가
export const addCategory = async (
  { code, description, sort, is_shared_total = false },
  userId = null,
  groupId = null
) => {
  const targetColumn = userId ? "user_id" : "shared_group_id";
  const targetValue = userId ?? groupId;

  const { data, error } = await supabase.from("categories").insert([
    {
      code,
      description,
      sort,
      [targetColumn]: targetValue,
      is_shared_total, // ✅ 누적보기 상태 저장
    },
  ]);

  if (error) throw error;
  return { status: "success", data };
};

// 카테고리 이름 수정
// 기존 updateCategoryName 함수 대신:
export const updateCategory = async (
  code,
  { description, is_shared_total },
  userId,
  groupId
) => {
  const { error } = await supabase
    .from("categories")
    .update({ description, is_shared_total })
    .eq("code", code)
    .match({
      ...(userId && { user_id: userId }),
      ...(groupId && { shared_group_id: groupId }),
    });

  if (error) throw error;
  return { status: "success" };
};

export const softDeleteCategory = async (
  code,
  userId = null,
  groupId = null
) => {
  const { error } = await supabase
    .from("categories")
    .update({ is_deleted: true })
    .eq("code", code)
    .match({
      ...(userId && { user_id: userId }),
      ...(groupId && { shared_group_id: groupId }),
    });

  if (error) throw error;
  return { status: "success" };
};

// 카테고리 정렬 순서 일괄 업데이트
export const updateCategoriesSort = async (
  categories,
  userId = null,
  groupId = null
) => {
  const updates = categories.map(({ code, sort }) =>
    supabase
      .from("categories")
      .update({ sort })
      .eq("code", code)
      .match({
        ...(userId && { user_id: userId }),
        ...(groupId && { shared_group_id: groupId }),
      })
  );

  const results = await Promise.all(updates);
  const errors = results.filter((r) => r.error);
  if (errors.length > 0) throw new Error("정렬 순서 저장 중 오류 발생");

  return { status: "success" };
};

export const deleteCategory = async (code, userId = null, groupId = null) => {
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("code", code)
    .match({
      ...(userId && { user_id: userId }),
      ...(groupId && { shared_group_id: groupId }),
    });

  if (error) throw error;
  return { status: "success" };
};

// category별 지출 요약
export const fetchCategorySummary = async (
  month,
  userId = null,
  groupId = null
) => {
  const query = supabase
    .from("transactions")
    .select(
      `
      category,
      amount,
      categories:category ( description )
    `
    )
    .gte("date", `${month}-01`)
    .lt("date", `${getNextMonth(month)}-01`);

  if (userId) {
    query.eq("user_id", userId);
  } else if (groupId) {
    query.eq("shared_group_id", groupId);
  } else {
    throw new Error("userId 또는 groupId가 필요합니다.");
  }

  const { data, error } = await query;
  if (error) throw error;

  const summaryMap = {};
  data.forEach((tx) => {
    const amt = Number(tx.amount);
    if (amt < 0) {
      const key = tx.category;
      if (!summaryMap[key]) {
        summaryMap[key] = {
          category: key,
          name: tx.categories?.description || "삭제된 카테고리",
          total: 0,
        };
      }
      summaryMap[key].total += -amt;
    }
  });

  return Object.values(summaryMap);
};

export const fetchSharedGroups = async (userId) => {
  const { data, error } = await supabase
    .from("shared_group_members")
    .select(
      `
      shared_groups (
        id,
        name
      )
    `
    )
    .eq("user_id", userId);

  if (error) throw error;

  return data.map((d) => d.shared_groups); // group 목록만 추출
};

export const createSharedGroup = async (groupName = "우리집") => {
  const { data, error } = await supabase
    .from("shared_groups")
    .insert([{ name: groupName }])
    .select()
    .single(); // 생성된 그룹 ID를 받기 위해

  if (error) throw error;
  return data; // { id, name, created_at }
};

export const addUsersToSharedGroup = async (groupId, userIds = []) => {
  const inserts = userIds.map((uid) => ({
    user_id: uid,
    shared_group_id: groupId,
  }));

  const { error } = await supabase.from("shared_group_members").insert(inserts);

  if (error) throw error;
  return { status: "success" };
};

// 월별 지출 데이터 가져오기 (차트용)
export const fetchMonthlyExpenseData = async (
  userId = null,
  groupId = null,
  months = 6
) => {
  // 최근 N개월 데이터 가져오기
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(endDate.getMonth() - months + 1);
  startDate.setDate(1); // 월 첫째 날

  const startMonth = startDate.toISOString().slice(0, 7); // YYYY-MM 형식
  const endMonth = endDate.toISOString().slice(0, 7);

  const { data, error } = await supabase
    .from("transactions")
    .select("amount, date")
    .gte("date", `${startMonth}-01`)
    .lte("date", `${endMonth}-31`)
    .match({
      ...(userId && { user_id: userId }),
      ...(groupId && { shared_group_id: groupId }),
    })
    .order("date", { ascending: true });

  if (error) throw error;

  // 월별로 그룹화
  const monthlyData = {};
  for (let i = 0; i < months; i++) {
    const date = new Date(startDate);
    date.setMonth(startDate.getMonth() + i);
    const monthKey = date.toISOString().slice(0, 7);
    monthlyData[monthKey] = 0;
  }

  // 실제 데이터로 채우기
  data.forEach((tx) => {
    const amt = Number(tx.amount);
    if (amt < 0) {
      // 지출만
      const month = tx.date.slice(0, 7);
      if (monthlyData[month] !== undefined) {
        monthlyData[month] += -amt;
      }
    }
  });

  // 차트용 데이터 형식으로 변환
  return Object.entries(monthlyData).map(([month, amount]) => ({
    month: month.slice(2).replace("-", "/"), // MM/YY 형식
    amount: Math.round(amount),
    fullMonth: month,
  }));
};

// 카테고리별 지출 데이터 가져오기 (차트용)
export const fetchCategoryExpenseData = async (
  month,
  userId = null,
  groupId = null
) => {
  const { data, error } = await supabase
    .from("transactions")
    .select(
      `
      category,
      amount,
      categories:category ( description )
    `
    )
    .gte("date", `${month}-01`)
    .lt("date", `${getNextMonth(month)}-01`)
    .match({
      ...(userId && { user_id: userId }),
      ...(groupId && { shared_group_id: groupId }),
    });

  if (error) throw error;

  // 카테고리별로 그룹화
  const categoryData = {};
  data.forEach((tx) => {
    const amt = Number(tx.amount);
    if (amt < 0) {
      // 지출만
      const category = tx.category;
      const name = tx.categories?.description || "삭제된 카테고리";

      if (!categoryData[category]) {
        categoryData[category] = {
          category,
          name,
          amount: 0,
        };
      }
      categoryData[category].amount += -amt;
    }
  });

  // 차트용 데이터 형식으로 변환 (금액 순으로 정렬)
  return Object.values(categoryData)
    .map((item) => ({
      ...item,
      amount: Math.round(item.amount),
    }))
    .sort((a, b) => b.amount - a.amount);
};

// 카테고리별 월별 지출 데이터 가져오기 (차트용)
export const fetchCategoryMonthlyData = async (
  userId = null,
  groupId = null,
  months = 6
) => {
  // 최근 N개월 데이터 가져오기
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(endDate.getMonth() - months + 1);
  startDate.setDate(1); // 월 첫째 날

  const startMonth = startDate.toISOString().slice(0, 7); // YYYY-MM 형식
  const endMonth = endDate.toISOString().slice(0, 7);

  const { data, error } = await supabase
    .from("transactions")
    .select(
      `
      amount, 
      date,
      category,
      categories:category ( description )
    `
    )
    .gte("date", `${startMonth}-01`)
    .lte("date", `${endMonth}-31`)
    .match({
      ...(userId && { user_id: userId }),
      ...(groupId && { shared_group_id: groupId }),
    })
    .order("date", { ascending: true });

  if (error) throw error;

  // 월별로 그룹화
  const monthlyData = {};
  for (let i = 0; i < months; i++) {
    const date = new Date(startDate);
    date.setMonth(startDate.getMonth() + i);
    const monthKey = date.toISOString().slice(0, 7);
    monthlyData[monthKey] = {};
  }

  // 실제 데이터로 채우기
  data.forEach((tx) => {
    const amt = Number(tx.amount);
    if (amt < 0) {
      // 지출만
      const month = tx.date.slice(0, 7);
      const category = tx.category;
      const categoryName = tx.categories?.description || "삭제된 카테고리";

      if (monthlyData[month]) {
        if (!monthlyData[month][category]) {
          monthlyData[month][category] = {
            category,
            name: categoryName,
            amount: 0,
          };
        }
        monthlyData[month][category].amount += -amt;
      }
    }
  });

  // 차트용 데이터 형식으로 변환
  const monthsList = Object.keys(monthlyData).sort();
  const result = monthsList.map((month) => {
    const monthData = {
      month: month.slice(2).replace("-", "/"), // MM/YY 형식
      fullMonth: month,
    };

    // 각 카테고리별 금액 추가
    Object.values(monthlyData[month]).forEach((cat) => {
      monthData[cat.category] = Math.round(cat.amount);
    });

    return monthData;
  });

  // 카테고리 정보도 함께 반환
  const categoryInfo = {};
  Object.values(monthlyData).forEach((month) => {
    Object.values(month).forEach((cat) => {
      if (!categoryInfo[cat.category]) {
        categoryInfo[cat.category] = cat.name;
      }
    });
  });

  return { data: result, categoryInfo };
};

// 기존 거래 내역에서 memo 값들을 가져와서 자동완성용으로 사용
export const fetchMemoSuggestions = async (userId = null, groupId = null) => {
  const matchObj = {
    ...(userId && { user_id: userId }),
    ...(groupId && { shared_group_id: groupId }),
  };

  const { data, error } = await supabase
    .from("transactions")
    .select("memo")
    .match(matchObj)
    .not("memo", "is", null)
    .not("memo", "eq", "")
    .order("created_at", { ascending: false });

  if (error) throw error;

  // 중복 제거하고 빈 값 필터링
  const uniqueMemos = [
    ...new Set(
      data.map((row) => row.memo).filter((memo) => memo && memo.trim())
    ),
  ];

  // 최근 사용된 순서로 정렬 (이미 created_at desc로 정렬되어 있음)
  return uniqueMemos.slice(0, 20); // 최대 20개까지만 반환
};

// 고정비용 목록 불러오기
export const fetchFixedCosts = async (userId = null, groupId = null) => {
  const query = supabase
    .from("fixed_costs")
    .select("*")
    .eq("active", true)
    .order("day", { ascending: true });
  if (userId) query.eq("user_id", userId);
  else if (groupId) query.eq("shared_group_id", groupId);
  else throw new Error("userId 또는 groupId 중 하나는 반드시 필요합니다.");
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

// 고정비용 추가
export const addFixedCost = async ({
  category,
  amount,
  memo,
  day,
  userId = null,
  groupId = null,
}) => {
  const payload = {
    category,
    amount,
    memo,
    day,
    user_id: userId,
    shared_group_id: groupId,
  };
  const { data, error } = await supabase.from("fixed_costs").insert([payload]);
  if (error) throw error;
  return data;
};

// 고정비용 수정
export const updateFixedCost = async (
  id,
  { category, amount, memo, day, active }
) => {
  const { data, error } = await supabase
    .from("fixed_costs")
    .update({ category, amount, memo, day, active })
    .eq("id", id);
  if (error) throw error;
  return data;
};

// 고정비용 삭제(soft delete)
export const deleteFixedCost = async (id) => {
  const { data, error } = await supabase
    .from("fixed_costs")
    .update({ active: false })
    .eq("id", id);
  if (error) throw error;
  return data;
};
