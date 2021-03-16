import React, { useState, useEffect } from 'react'
import { useMappedState } from 'redux-react-hook';
import { useTranslation } from 'react-i18next'
import Countdown from '../../components/countdown'
import { toLocaleFixed } from '../../utils/common'
import './index.css'

const Governance = (props) => {
  const { poolStat } = useMappedState((state) => ({
    poolStat: state.gov.poolStat
  }))
  const [t] = useTranslation()

  return (
    <div className="governance-wrapper">
      <div className="overview-wrapper">
        <div className="overview-title">{t('overview')}</div>
        <div className="overview-countdown"><Countdown text={t('distribution_will_begin_in')} /></div>
        <div className="overview-sections">
          <div className="overview-left">
            <p className="overview-section-title">{t('total_unx')}</p>
            <p className="overview-detail">{toLocaleFixed(poolStat.distributionInfo.amount || 0)}</p>
          </div>
          <div className="overview-right">
            <p className="overview-section-title">{t('daily_distribution')}</p>
            <p className="overview-detail">{toLocaleFixed(((poolStat.distributionInfo.amount || 0) / (poolStat.distributionInfo.period || 1) * 86400).toFixed(9))} <span>UNX</span></p>
          </div>
        </div>
      </div>
      <div className="distribution-wrapper">
        <div className="overview-title">{t('distribution')}</div>
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
              <div className="d-item-name">{t('community')}</div>
              <div className="d-item-ratio">80%</div>
            </div>
            <div className="d-item">
              <div className="d-item-color" style={ { background: '#FE332F' } }></div>
              <div className="d-item-name">{t('developer')}</div>
              <div className="d-item-ratio">8%</div>
            </div>
            <div className="d-item">
              <div className="d-item-color" style={ { background: '#F4BA5E' } }></div>
              <div className="d-item-name">{t('foundation')}</div>
              <div className="d-item-ratio">8%</div>
            </div>
            <div className="d-item">
              <div className="d-item-color" style={ { background: '#2B3962' } }></div>
              <div className="d-item-name">{t('resource_extension')}</div>
              <div className="d-item-ratio">3%</div>
            </div>
            <div className="d-item">
              <div className="d-item-color" style={ { background: '#F18DA5' } }></div>
              <div className="d-item-name">{t('volunteer')}</div>
              <div className="d-item-ratio">1%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Governance