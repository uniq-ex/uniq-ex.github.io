import React, { useState, useEffect } from 'react'
import { useMappedState } from 'redux-react-hook'
import { useTranslation } from 'react-i18next'
import './index.css'

const Countdown = (props) => {
  const { text } = props
  const [hasBegan, setHasBegan] = useState(true)
  const [leftTime, setLeftTime] = useState({})
  const { poolStat } = useMappedState((state) => ({
    poolStat: state.gov.poolStat
  }))
  const [t] = useTranslation()

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

  return !hasBegan ? (
    <div className="countdown-wrapper">{text}
      { Number(leftTime.day) ? <div className="date-item">{t('days')}<p>{leftTime.day}</p></div> : null }
      { leftTime.hour ? <div className="date-item">{t('hours')}<p>{leftTime.hour}</p></div> : null }
      { leftTime.minute ? <div className="date-item">{t('minutes')}<p>{leftTime.minute}</p></div> : null }
      { leftTime.second ? <div className="date-item">{t('seconds')}<p>{leftTime.second}</p></div> : null }
    </div>
  ) : null
}

export default Countdown