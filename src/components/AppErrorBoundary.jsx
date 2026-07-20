import { Component } from 'react';

export default class AppErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Application render error', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return <main className="auth-loading-shell"><section className="card auth-loading-card"><h2>Не удалось открыть экран</h2><p>Проверьте подключение и попробуйте ещё раз.</p><button className="primary-btn" type="button" onClick={() => window.location.reload()}>Повторить</button></section></main>;
  }
}
