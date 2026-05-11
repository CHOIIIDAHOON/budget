import React, { Component } from 'react'
import { signIn } from '@/api/authApi'
import './SignInPage.scss'

export class SignInPage extends Component {
  constructor(props) {
    super(props)
    this.state = {
      userId: '',
      password: '',
      error: '',
      loading: false,
    }
  }

  handleChange = (e) => {
    this.setState({ [e.target.name]: e.target.value, error: '' })
  }

  handleSubmit = async (e) => {
    e.preventDefault()
    const { userId, password } = this.state

    if (!userId.trim() || !password.trim()) {
      this.setState({ error: '아이디와 비밀번호를 입력해주세요.' })
      return
    }

    this.setState({ loading: true, error: '' })
    try {
      await signIn(userId.trim(), password)
      window.location.replace('/budget')
    } catch (err) {
      this.setState({ error: err.message, loading: false })
    }
  }

  render() {
    const { userId, password, error, loading } = this.state

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
