import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  error: Error | null
  copied: boolean
}

/** 화면 코드가 오류로 멈춰도 하얀 화면 대신 오류 내용과 새로고침 버튼을 보여준다. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, copied: false }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[admin] 화면 오류', error, info.componentStack)
  }

  render() {
    const { error, copied } = this.state
    if (!error) return this.props.children
    const detail = `${error.name}: ${error.message}\n${(error.stack ?? '').split('\n').slice(1, 6).join('\n')}`
    return (
      <div className="min-h-screen bg-[#f7f6f5] px-4 py-16">
        <div className="mx-auto max-w-xl border border-warm-300/50 bg-white p-8">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-brand">Admin</p>
          <h1 className="mt-2 text-xl font-bold text-warm-800">화면을 표시하는 중 오류가 났습니다</h1>
          <p className="mt-2 text-sm leading-relaxed text-warm-600">
            저장된 데이터는 그대로입니다. 새로고침하면 다시 불러옵니다. 계속되면 아래 오류 내용을 복사해 알려 주세요.
          </p>
          <pre className="mt-4 max-h-48 overflow-auto whitespace-pre-wrap break-all bg-cream p-3 font-mono text-[11px] text-warm-800">
            {detail}
          </pre>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bg-brand px-4 py-2 text-sm font-semibold text-white"
            >
              새로고침
            </button>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(detail).then(() => this.setState({ copied: true }))
              }}
              className="border border-warm-300 px-4 py-2 text-sm font-semibold text-warm-600"
            >
              {copied ? '복사됨' : '오류 내용 복사'}
            </button>
          </div>
        </div>
      </div>
    )
  }
}
