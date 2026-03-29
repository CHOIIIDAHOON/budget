import supabase from './supabase';

// public.users에서 userId로 auth_email 조회
const findAuthEmailByUserId = async (userId) => {
  const { data, error } = await supabase
    .from('users')
    .select('auth_email, id, username')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data; // null이면 존재하지 않는 아이디
};

// 로그인 후 public.users 프로필 조회 (auth_email 기준)
export const fetchUserProfile = async (email) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, auth_email, user_id')
    .eq('auth_email', email)
    .maybeSingle();
  if (error) throw error;
  return data;
};

// 로그인 - userId + 비밀번호
// 1) userId로 auth_email 조회
// 2) Supabase Auth signInWithPassword
// 3) 실패 시 → auth 계정 없거나 비밀번호 오류 (인증 필요 에러로 표시)
export const signIn = async (userId, password) => {
  const profile = await findAuthEmailByUserId(userId);
  if (!profile) throw new Error('존재하지 않는 아이디입니다.');

  const { data, error } = await supabase.auth.signInWithPassword({
    email: profile.auth_email,
    password,
  });

  if (error) {
    // auth 계정이 없거나 비밀번호 오류 → 인증 필요로 처리
    const needsVerification = new Error('비밀번호가 올바르지 않거나 이메일 인증이 필요합니다.');
    needsVerification.code = 'NEEDS_VERIFICATION';
    needsVerification.authEmail = profile.auth_email;
    throw needsVerification;
  }

  return data.user;
};

// 인증 이메일 발송
// - auth 계정이 없으면 signUp으로 생성 + 확인 메일 발송
// - auth 계정이 이미 있으면 password reset 메일 발송
export const sendVerificationEmail = async (userId, password) => {
  const profile = await findAuthEmailByUserId(userId);
  if (!profile) throw new Error('존재하지 않는 아이디입니다.');

  const email = profile.auth_email;

  // signUp 시도: 신규면 확인 메일 발송, 기존이면 identities가 빈 배열로 반환
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error('인증 메일 발송에 실패했습니다.');

  const isNew = data.user?.identities?.length > 0;

  if (!isNew) {
    // 이미 auth 계정 존재 → 비밀번호 재설정 메일 발송
    await supabase.auth.resetPasswordForEmail(email);
    return { type: 'reset', email };
  }

  // 신규 auth 계정 생성 → 확인 메일 발송됨
  return { type: 'confirm', email };
};

// 회원가입 - userId + 이메일 + 비밀번호 + 표시이름(username)
export const signUp = async (userId, email, password, username) => {
  // userId 중복 확인
  const { data: existingUserId } = await supabase
    .from('users')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (existingUserId) throw new Error('이미 사용중인 아이디입니다.');

  // username 중복 확인
  const { data: existingUsername } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .maybeSingle();
  if (existingUsername) throw new Error('이미 사용중인 표시 이름입니다.');

  // auth_email 중복 확인
  const { data: existingEmail } = await supabase
    .from('users')
    .select('id')
    .eq('auth_email', email)
    .maybeSingle();
  if (existingEmail) throw new Error('이미 사용중인 이메일입니다.');

  // Supabase Auth 계정 생성 (이메일 인증 메일 발송)
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  // public.users에 프로필 저장
  const { error: insertError } = await supabase
    .from('users')
    .insert([{ username, auth_email: email, user_id: userId }]);
  if (insertError) throw insertError;

  return data.user;
};

// 비밀번호 변경 (현재 비밀번호 확인 후 변경)
export const changePassword = async (currentPassword, newPassword) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('로그인이 필요합니다.');

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: session.user.email,
    password: currentPassword,
  });
  if (verifyError) throw new Error('현재 비밀번호가 올바르지 않습니다.');

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
};

// 로그아웃
export const signOut = async () => {
  await supabase.auth.signOut();
};
