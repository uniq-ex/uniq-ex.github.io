import React, { useState, useEffect } from 'react'
import { useMappedState } from 'redux-react-hook';
import { toLocaleFixed } from '../../utils/common'
import './index.css'

const Governance = (props) => {
  const [hasBegan, setHasBegan] = useState(true)
  const [leftTime, setLeftTime] = useState({})
  const { poolStat } = useMappedState((state) => ({
    poolStat: state.gov.poolStat
  }))

  const getLeftTime = (t) => {
    const time = parseInt((new Date(t * 1000) - new Date()) / 1000, 10)
    const day = parseInt((time < 0 ? 0 : time / 3600 / 24), 10)
    const hour = parseInt((time < 0 ? 0 : time / 3600 % 24), 10)
    const minute = parseInt((time < 0 ? 0 : time / 60 % 60), 10)
    const second = time < 0 ? 0 : time % 60
    const dateInfo = {
      day: day < 10 ? `0${day}` : day,
      hour: hour < 10 ? `0${hour}` : hour,
      minute: minute < 10 ? `0${minute}` : minute,
      second: second < 10 ? `0${second}` : second
    }

    setLeftTime(dateInfo)
  }

  useEffect(() => {
    const startTimeStamp = poolStat.distributionInfo.startTimeStamp
    if (startTimeStamp && new Date(startTimeStamp * 1000) > new Date()) {
      setHasBegan(false)
      getLeftTime(poolStat.distributionInfo.startTimeStamp)
    } else {
      setHasBegan(true)
    }
  }, [poolStat])

  useEffect(() => {
    const interval = !hasBegan && setInterval(() => getLeftTime(poolStat.distributionInfo.startTimeStamp), 1000)
    return () => {
      interval && clearInterval(interval)
    }
  }, [hasBegan])

  return (
    <div className="governance-wrapper">
      <div className="overview-wrapper">
        <div className="overview-title">Overview</div>
        {
          !hasBegan ? (
            <div className="countdown-wrapper">Distribution will begin in
              { Number(leftTime.day) ? <div className="date-item">DAYS<p>{leftTime.day}</p></div> : null }
              { leftTime.hour ? <div className="date-item">HOURS<p>{leftTime.hour}</p></div> : null }
              { leftTime.minute ? <div className="date-item">MINUTES<p>{leftTime.minute}</p></div> : null }
              { leftTime.second ? <div className="date-item">SECONDS<p>{leftTime.second}</p></div> : null }
            </div>
          ) : null
        }
        <div className="overview-sections">
          <div className="overview-left">
            <p className="overview-section-title">Total UNX</p>
            <p className="overview-detail">{toLocaleFixed(poolStat.distributionInfo.amount || 0)}</p>
          </div>
          <div className="overview-right">
            <p className="overview-section-title">Daily Distribution</p>
            <p className="overview-detail">{toLocaleFixed(((poolStat.distributionInfo.amount || 0) / (poolStat.distributionInfo.period || 1) * 86400).toFixed(9))} <span>UNX</span></p>
          </div>
        </div>
      </div>
      <div className="distribution-wrapper">
        <div className="overview-title">Distribution</div>
        <div className="distribution-sections">
          <div className="pie-svg">
            <svg className="donut" width="240px" height="240px" viewBox="0 0 42 42" role="img">
              <circle cx="21" cy="21" r="15.915494309189533" fill="none" stroke="#2BBE7F" stroke-width="4" stroke-dasharray="80, 20" stroke-dashoffset="100"></circle>
              <circle cx="21" cy="21" r="15.915494309189533" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-dasharray="0.5, 99.5" stroke-dashoffset="120"></circle>
              <circle cx="21" cy="21" r="15.915494309189533" fill="none" stroke="#FE332F" stroke-width="4" stroke-dasharray="8, 92" stroke-dashoffset="219.5"></circle>
              <circle cx="21" cy="21" r="15.915494309189533" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-dasharray="0.5, 99.5" stroke-dashoffset="311.5"></circle>
              <circle cx="21" cy="21" r="15.915494309189533" fill="none" stroke="#F4BA5E" stroke-width="4" stroke-dasharray="8, 92" stroke-dashoffset="411"></circle>
              <circle cx="21" cy="21" r="15.915494309189533" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-dasharray="0.5, 99.5" stroke-dashoffset="503"></circle>
              <circle cx="21" cy="21" r="15.915494309189533" fill="none" stroke="#2B3962" stroke-width="4" stroke-dasharray="3, 97" stroke-dashoffset="602.5"></circle>
              <circle cx="21" cy="21" r="15.915494309189533" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-dasharray="0.5, 99.5" stroke-dashoffset="699.5"></circle>
              <circle cx="21" cy="21" r="15.915494309189533" fill="none" stroke="#F18DA5" stroke-width="4" stroke-dasharray="1, 99" stroke-dashoffset="799"></circle>
              <circle cx="21" cy="21" r="15.915494309189533" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-dasharray="0.5, 99.5" stroke-dashoffset="898"></circle>
            </svg>
          </div>
          <div className="pie-desc">
            <div className="d-item">
              <div className="d-item-color" style={ { background: '#2BBE7F' } }></div>
              <div className="d-item-name">Community</div>
              <div className="d-item-ratio">80%</div>
            </div>
            <div className="d-item">
              <div className="d-item-color" style={ { background: '#FE332F' } }></div>
              <div className="d-item-name">Developer</div>
              <div className="d-item-ratio">8%</div>
            </div>
            <div className="d-item">
              <div className="d-item-color" style={ { background: '#F4BA5E' } }></div>
              <div className="d-item-name">Foundation</div>
              <div className="d-item-ratio">8%</div>
            </div>
            <div className="d-item">
              <div className="d-item-color" style={ { background: '#2B3962' } }></div>
              <div className="d-item-name">Resoucse Extension</div>
              <div className="d-item-ratio">3%</div>
            </div>
            <div className="d-item">
              <div className="d-item-color" style={ { background: '#F18DA5' } }></div>
              <div className="d-item-name">Volunteer</div>
              <div className="d-item-ratio">1%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Governance