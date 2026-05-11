import supabase from './supabase';

const APP_SESSION_KEY = 'budget_app_session_token';

const getSessionToken = () => localStorage.getItem(APP_SESSION_KEY);
const setSessionToken = (token) => localStorage.setItem(APP_SESSION_KEY, token);
const clearSessionToken = () => localStorage.removeItem(APP_SESSION_KEY);

export const fetchUserProfile = async (userId) => {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('users')
    .select('id, username, user_id')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const restoreSession = async () => {
  const token = getSessionToken();
  if (!token) return null;

  const { data, error } = await supabase.rpc('app_auth_validate_session', {
    p_token: token,
  });

  if (error || !data) {
    clearSessionToken();
    return null;
  }

  return {
    sessionToken: token,
    user: {
      id: data.user_id,
      username: data.username,
      userId: data.user_code,
    },
  };
};

export const signIn = async (userId, password) => {
  const { data, error } = await supabase.rpc('app_auth_sign_in', {
    p_user_id: userId,
    p_password: password,
  });

  if (error) throw new Error('로그인에 실패했습니다.');
  if (!data?.ok) throw new Error(data?.message || '아이디 또는 비밀번호가 올바르지 않습니다.');

  setSessionToken(data.session_token);

  return {
    sessionToken: data.session_token,
    user: {
      id: data.user_pk,
      username: data.username,
      userId: data.user_id,
    },
  };
};

export const signUp = async (userId, password, username) => {
  const { data, error } = await supabase.rpc('app_auth_sign_up', {
    p_user_id: userId,
    p_password: password,
    p_username: username,
  });

  if (error) throw new Error('회원가입에 실패했습니다.');
  if (!data?.ok) throw new Error(data?.message || '회원가입에 실패했습니다.');

  return { ok: true };
};

export const changePassword = async (currentPassword, newPassword) => {
  const token = getSessionToken();
  if (!token) throw new Error('로그인이 필요합니다.');

  const { data, error } = await supabase.rpc('app_auth_change_password', {
    p_token: token,
    p_current_password: currentPassword,
    p_new_password: newPassword,
  });

  if (error) throw new Error('비밀번호 변경에 실패했습니다.');
  if (!data?.ok) throw new Error(data?.message || '비밀번호 변경에 실패했습니다.');
};

export const signOut = async () => {
  const token = getSessionToken();

  if (token) {
    await supabase.rpc('app_auth_sign_out', { p_token: token });
  }

  clearSessionToken();
};
