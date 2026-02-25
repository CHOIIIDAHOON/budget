import React, { createContext, useContext } from 'react';
import { darkenColor } from '@/shared/utils/color';
import './UIFeedback.scss';

export const UIFeedbackContext = createContext(null);

export function useUIFeedback() {
  return useContext(UIFeedbackContext);
}

/**
 * UIFeedback — popup, loading overlay, snackbar(toast)를 한 곳에서 관리하는 컴포넌트
 *
 * 사용법
 * ─────
 * [함수형] useUIFeedback() hook
 * [클래스형 자식] static contextType = UIFeedbackContext → this.context.showPopup(...)
 * [클래스형 부모] ref 전달 → this.uiFeedbackRef.current.showSnackbar(...)
 *
 * API
 * ─────
 * showPopup(message, color?)       — 확인 팝업
 * hidePopup()
 * showLoading() / hideLoading()    — 전체 화면 로딩 오버레이
 * showSnackbar(title, desc?, icon?) — 토스트 (큐 지원)
 */
export default class UIFeedback extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      popup: { show: false, message: '', color: null },
      loading: false,
      snackbarQueue: [],
      currentSnackbar: null,
      snackbarHiding: false,
      isProcessingSnackbar: false,
    };
  }

  componentDidUpdate(_, prevState) {
    const { snackbarQueue, isProcessingSnackbar } = this.state;
    if (
      prevState.snackbarQueue !== snackbarQueue &&
      snackbarQueue.length > 0 &&
      !isProcessingSnackbar
    ) {
      this._processNextSnackbar();
    }
  }

  componentWillUnmount() {
    clearTimeout(this._snackTimer);
  }

  _processNextSnackbar() {
    const { snackbarQueue } = this.state;
    if (!snackbarQueue.length) return;

    this.setState({
      isProcessingSnackbar: true,
      currentSnackbar: snackbarQueue[0],
      snackbarHiding: false,
    });

    this._snackTimer = setTimeout(() => {
      this.setState({ snackbarHiding: true });
      this._snackTimer = setTimeout(() => {
        this.setState(prev => ({
          currentSnackbar: null,
          snackbarQueue: prev.snackbarQueue.slice(1),
          isProcessingSnackbar: false,
        }));
      }, 350);
    }, 2500);
  }

  showPopup = (message = '입력 완료!', color = null) => {
    this.setState({ popup: { show: true, message, color } });
  };

  hidePopup = () => {
    this.setState(prev => ({ popup: { ...prev.popup, show: false } }));
  };

  showLoading = () => this.setState({ loading: true });
  hideLoading = () => this.setState({ loading: false });

  showSnackbar = (title, desc = '', icon = '📌') => {
    this.setState(prev => ({
      snackbarQueue: [...prev.snackbarQueue, { title, desc, icon }],
    }));
  };

  render() {
    const { children } = this.props;
    const { popup, loading, currentSnackbar, snackbarHiding } = this.state;

    const api = {
      showPopup: this.showPopup,
      hidePopup: this.hidePopup,
      showLoading: this.showLoading,
      hideLoading: this.hideLoading,
      showSnackbar: this.showSnackbar,
    };

    return (
      <UIFeedbackContext.Provider value={api}>
        {children}

        {/* 팝업 */}
        {popup.show && (
          <div className="uf-popup-overlay" onClick={this.hidePopup}>
            <div className="uf-popup-content" onClick={e => e.stopPropagation()}>
              <h3>{popup.message}</h3>
              <button
                className="uf-popup-btn"
                style={popup.color ? {
                  background: `linear-gradient(135deg, ${popup.color} 0%, ${darkenColor(popup.color, 20)} 100%)`
                } : undefined}
                onClick={this.hidePopup}
              >
                확인
              </button>
            </div>
          </div>
        )}

        {/* 로딩 오버레이 */}
        {loading && (
          <div className="uf-loading-overlay">
            <div className="uf-spinner" />
          </div>
        )}

        {/* 스낵바 / 토스트 */}
        {currentSnackbar && (
          <div className={`uf-toast ${snackbarHiding ? 'uf-toast-hide' : 'uf-toast-show'}`}>
            {currentSnackbar.icon && (
              <span className="uf-toast-icon">{currentSnackbar.icon}</span>
            )}
            <div className="uf-toast-body">
              <div className="uf-toast-title">{currentSnackbar.title}</div>
              {currentSnackbar.desc && (
                <div className="uf-toast-desc">{currentSnackbar.desc}</div>
              )}
            </div>
          </div>
        )}
      </UIFeedbackContext.Provider>
    );
  }
}
