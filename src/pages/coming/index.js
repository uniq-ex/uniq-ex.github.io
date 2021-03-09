import React from 'react'
import Countdown from '../../components/countdown';
import './index.css'

const Coming = (props) => {
  const { showCountdown = true } = props
  return (
    <div className={`coming-soon-placeholder ${showCountdown ? 'show-countdown' : ''}`}>
    {
      showCountdown ? (
        <div className="coming-soon-wrapper">
          <Countdown />
        </div>
      ) : null
    }
    </div>
  )
}

export default Coming