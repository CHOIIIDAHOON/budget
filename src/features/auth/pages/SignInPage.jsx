import React, { Component } from 'react'
import { Navigate } from 'react-router-dom'
import { signIn, sendVerificationEmail } from '@/api/authApi'
import './SignInPage.scss'

export class SignInPage extends Component {
  constructor(props) {
    super(props)
    this.state = {
      userId: '',
      password: '',
      error: '',
      loading: false,
      redirectToBudget: false,
      // 인증 필요 상태
      needsVerification: false,
      authEmail: '',
      verificationSent: false,
      verificationLoading: false,
    }
  }

  handleChange = (e) => {
    this.setState({ [e.target.name]: e.target.value, error: '', needsVerification: false, verificationSent: false })
  }

  handleSubmit = async (e) => {
    e.preventDefault()
    const { userId, password } = this.state

    if (!userId.trim() || !password.trim()) {
      this.setState({ error: '아이디와 비밀번호를 입력해주세요.' })
      return
    }

    this.setState({ loading: true, error: '', needsVerification: false })
    try {
      await signIn(userId.trim(), password)
      this.setState({ redirectToBudget: true })
    } catch (err) {
      if (err.code === 'NEEDS_VERIFICATION') {
        this.setState({
          error: err.message,
          needsVerification: true,
          authEmail: err.authEmail,
          loading: false,
        })
      } else {
        this.setState({ error: err.message, loading: false })
      }
    }
  }

  handleSendVerification = async () => {
    const { userId, password, authEmail } = this.state

    if (!password.trim()) {
      this.setState({ error: '인증 메일 발송을 위해 사용할 비밀번호를 입력해주세요.' })
      return
    }

    this.setState({ verificationLoading: true, error: '' })
    try {
      const result = await sendVerificationEmail(userId.trim(), password)
      const maskedEmail = authEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3')
      const msg = result.type === 'reset'
        ? `비밀번호 재설정 메일을 ${maskedEmail}로 보냈습니다.`
        : `인증 메일을 ${maskedEmail}로 보냈습니다. 메일을 확인해주세요.`
      this.setState({ verificationSent: true, verificationMsg: msg, verificationLoading: false })
    } catch (err) {
      this.setState({ error: err.message, verificationLoading: false })
    }
  }

  render() {
    const {
      userId, password, error, loading,
      redirectToBudget, needsVerification,
      verificationSent, verificationMsg, verificationLoading,
    } = this.state

    if (redirectToBudget) return <Navigate to="/budget" replace />

    return (
      <div className="signin-page">
        <div className="signin-card">
          <h1 className="signin-title">가계부</h1>
          <p className="signin-subtitle">로그인</p>

          <form className="signin-form" onSubmit={this.handleSubmit}>
            <div className="form-group">
              <label>아이디</label>
              <input
                type="text"
                name="userId"
                value={userId}
                onChange={this.handleChange}
                placeholder="아이디를 입력하세요"
                autoComplete="username"
              />
            </div>
            <div className="form-group">
              <label>비밀번호</label>
              <input
                type="password"
                name="password"
                value={password}
                onChange={this.handleChange}
                placeholder="비밀번호를 입력하세요"
                autoComplete="current-password"
              />
            </div>

            {error && <p className="signin-error">{error}</p>}

            <button type="submit" className="signin-btn" disabled={loading}>
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* 이메일 인증 필요 영역 */}
          {needsVerification && !verificationSent && (
            <div className="signin-verification">
              <p className="signin-verification-hint">
                처음 로그인이라면 이메일 인증이 필요합니다.
              </p>
              <button
                className="signin-verification-btn"
                onClick={this.handleSendVerification}
                disabled={verificationLoading}
              >
                {verificationLoading ? '발송 중...' : '인증 메일 보내기'}
              </button>
            </div>
          )}

          {verificationSent && (
            <div className="signin-verification-done">
              <p>{verificationMsg}</p>
              <p className="signin-verification-sub">메일 인증 후 다시 로그인해주세요.</p>
            </div>
          )}

          <p className="signin-footer">
            계정이 없으신가요?{' '}
            <a href="/auth/signup">회원가입</a>
          </p>
        </div>
      </div>
    )
  }
}

export default SignInPage
