import React, { Component } from 'react'
import { signUp } from '@/api/authApi'
import './SignUpPage.scss'

export class SignUpPage extends Component {
  constructor(props) {
    super(props)
    this.state = {
      userId: '',
      username: '',
      email: '',
      password: '',
      passwordConfirm: '',
      error: '',
      loading: false,
      done: false,
    }
  }

  handleChange = (e) => {
    this.setState({ [e.target.name]: e.target.value, error: '' })
  }

  handleSubmit = async (e) => {
    e.preventDefault()
    const { userId, username, email, password, passwordConfirm } = this.state

    if (!userId.trim() || !username.trim() || !email.trim() || !password.trim()) {
      this.setState({ error: '모든 항목을 입력해주세요.' })
      return
    }
    if (password !== passwordConfirm) {
      this.setState({ error: '비밀번호가 일치하지 않습니다.' })
      return
    }
    if (password.length < 6) {
      this.setState({ error: '비밀번호는 6자 이상이어야 합니다.' })
      return
    }

    this.setState({ loading: true, error: '' })
    try {
      await signUp(userId.trim(), email.trim(), password, username.trim())
      this.setState({ done: true, loading: false })
    } catch (err) {
      this.setState({ error: err.message, loading: false })
    }
  }

  render() {
    const { userId, username, email, password, passwordConfirm, error, loading, done } = this.state

    if (done) {
      return (
        <div className="signup-page">
          <div className="signup-card">
            <div className="signup-done">
              <p className="signup-done-icon">✅</p>
              <h2>가입이 완료되었습니다</h2>
              <p><strong>{email}</strong> 로 인증 메일을 보냈습니다.</p>
              <p style={{ fontSize: 13, color: '#888', marginTop: 8 }}>메일 인증 후 로그인해주세요.</p>
              <a href="/auth/signin" className="signup-btn" style={{ display: 'block', textAlign: 'center', marginTop: 24, textDecoration: 'none' }}>
                로그인 하기
              </a>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="signup-page">
        <div className="signup-card">
          <h1 className="signup-title">가계부</h1>
          <p className="signup-subtitle">회원가입</p>

          <form className="signup-form" onSubmit={this.handleSubmit}>
            <div className="form-group">
              <label>아이디</label>
              <input
                type="text"
                name="userId"
                value={userId}
                onChange={this.handleChange}
                placeholder="로그인 시 사용할 아이디"
                autoComplete="username"
              />
            </div>
            <div className="form-group">
              <label>표시 이름</label>
              <input
                type="text"
                name="username"
                value={username}
                onChange={this.handleChange}
                placeholder="앱에서 표시될 이름 (예: 다훈)"
                autoComplete="nickname"
              />
            </div>
            <div className="form-group">
              <label>이메일 (인증용)</label>
              <input
                type="email"
                name="email"
                value={email}
                onChange={this.handleChange}
                placeholder="인증 메일을 받을 이메일"
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label>비밀번호</label>
              <input
                type="password"
                name="password"
                value={password}
                onChange={this.handleChange}
                placeholder="비밀번호 (6자 이상)"
                autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <label>비밀번호 확인</label>
              <input
                type="password"
                name="passwordConfirm"
                value={passwordConfirm}
                onChange={this.handleChange}
                placeholder="비밀번호를 다시 입력하세요"
                autoComplete="new-password"
              />
            </div>

            {error && <p className="signup-error">{error}</p>}

            <button type="submit" className="signup-btn" disabled={loading}>
              {loading ? '가입 중...' : '회원가입'}
            </button>
          </form>

          <p className="signup-footer">
            이미 계정이 있으신가요?{' '}
            <a href="/auth/signin">로그인</a>
          </p>
        </div>
      </div>
    )
  }
}

export default SignUpPage
