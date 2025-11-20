import { Link } from 'react-router-dom'

export default function Success() {
  return (
    <div>
      <h1>Application Sent</h1>
      <p className="wm-help">Thanks! We’ve emailed your application to our team. We’ll be in touch shortly.</p>
      <div style={{ marginTop: 16 }}>
        <Link to="/"><span className="wm-button secondary">Back to eligibility</span></Link>
      </div>
    </div>
  )
}
