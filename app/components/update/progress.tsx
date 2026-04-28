import "./progress.css"

interface ProgressProps {
  percent?: number
}

export default function Progress({ percent = 0 }: ProgressProps) {
  return (
    <div className="update-progress">
      <div className="update-progress-pr">
        <div className="update-progress-rate" style={{ width: `${3 * percent}px` }} />
      </div>
      <span className="update-progress-num">{(percent ?? 0).toString().substring(0, 4)}%</span>
    </div>
  )
}
