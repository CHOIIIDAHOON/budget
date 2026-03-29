import React, { Component } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material'
import { changePassword } from '@/api/authApi'
import './MyPageDialog.scss'

export default class MyPageDialog extends Component {
  constructor(props) {
    super(props)
    this.state = {
      currentPassword: '',
      newPassword: '',
      newPasswordConfirm: '',
      error: '',
      success: '',
      loading: false,
    }
  }

  handleChange = (e) => {
    this.setState({ [e.target.name]: e.target.value, error: '', success: '' })
  }

  handleSubmit = async (e) => {
    e.preventDefault()
    const { currentPassword, newPassword, newPasswordConfirm } = this.state

    if (!currentPassword || !newPassword || !newPasswordConfirm) {
      this.setState({ error: '모든 항목을 입력해주세요.' })
      return
    }
    if (newPassword !== newPasswordConfirm) {
      this.setState({ error: '새 비밀번호가 일치하지 않습니다.' })
      return
    }
    if (newPassword.length < 1) {
      this.setState({ error: '새 비밀번호를 입력해주세요.' })
      return
    }

    this.setState({ loading: true, error: '' })
    try {
      await changePassword(currentPassword, newPassword)
      this.setState({ success: '비밀번호가 변경되었습니다.', loading: false, currentPassword: '', newPassword: '', newPasswordConfirm: '' })
    } catch (err) {
      this.setState({ error: err.message, loading: false })
    }
  }

  handleClose = () => {
    this.setState({ currentPassword: '', newPassword: '', newPasswordConfirm: '', error: '', success: '', loading: false })
    this.props.onClose()
  }

  render() {
    const { open, username } = this.props
    const { currentPassword, newPassword, newPasswordConfirm, error, success, loading } = this.state

    return (
      <Dialog open={open} onClose={this.handleClose} maxWidth="xs" fullWidth>
        <DialogTitle className="mypage-title">마이페이지</DialogTitle>
        <DialogContent>
          <div className="mypage-user-info">
            <span className="mypage-avatar">{username?.[0] ?? '?'}</span>
            <span className="mypage-username">{username}</span>
          </div>

          <form className="mypage-form" onSubmit={this.handleSubmit}>
            <p className="mypage-section-label">비밀번호 변경</p>
            <div className="mypage-form-group">
              <label>현재 비밀번호</label>
              <input
                type="password"
                name="currentPassword"
                value={currentPassword}
                onChange={this.handleChange}
                placeholder="현재 비밀번호"
                autoComplete="current-password"
              />
            </div>
            <div className="mypage-form-group">
              <label>새 비밀번호</label>
              <input
                type="password"
                name="newPassword"
                value={newPassword}
                onChange={this.handleChange}
                placeholder="새 비밀번호"
                autoComplete="new-password"
              />
            </div>
            <div className="mypage-form-group">
              <label>새 비밀번호 확인</label>
              <input
                type="password"
                name="newPasswordConfirm"
                value={newPasswordConfirm}
                onChange={this.handleChange}
                placeholder="새 비밀번호 다시 입력"
                autoComplete="new-password"
              />
            </div>
            {error && <p className="mypage-error">{error}</p>}
            {success && <p className="mypage-success">{success}</p>}
            <button type="submit" className="mypage-btn" disabled={loading}>
              {loading ? '변경 중...' : '비밀번호 변경'}
            </button>
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={this.handleClose} color="inherit">닫기</Button>
        </DialogActions>
      </Dialog>
    )
  }
}
