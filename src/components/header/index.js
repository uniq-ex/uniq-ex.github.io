import React, { useState, useEffect, useCallback } from 'react'
import { useMappedState, useDispatch } from 'redux-react-hook'
import { Link, useLocation } from 'react-router-dom'
import i18next from 'i18next'
import { useTranslation } from 'react-i18next'
import Input from '../input'
import { READY_TABS } from '../../config'
import { formatAccount } from '../../utils/common'
import './index.css'

const languageMap = {
  en: 'EN',
  zh: '中',
  jp: 'あ'
}

const Header = (props) => {
  const [selectedTab, setSelectedTab] = useState('')
  const [showProfilePanel, setShowProfilePanel] = useState(false)
  const [showLanguageSelection, setShowLanguageSelection] = useState(false)
  const { account, slippage } = useMappedState((state) => ({
    account: state.wallet.account,
    slippage: state.wallet.slippage
  }))
  const dispatch = useDispatch()
  const setSlippage = useCallback((slippage) => dispatch({ type: 'SET_SLIPPAGE', slippage }), [])
  const pathname = useLocation().pathname
  const [t] = useTranslation()

  useEffect(() => {
    let tab = ''
    if (pathname === '/' || pathname.indexOf('/staking') >= 0) {
      tab = '/'
    } else if (pathname.indexOf('/synth') >= 0) {
      tab = '/synth'
    } else if (pathname.indexOf('/swap') >= 0 || pathname.indexOf('/pool') >= 0) {
      tab = '/swap'
    } else if (pathname.indexOf('/trade') >= 0) {
      tab = '/trade'
    } else if (pathname.indexOf('/governance') >= 0) {
      tab = '/governance'
    } else if (pathname.indexOf('/token') >= 0) {
      tab = '/token'
    } else if (pathname.indexOf('/option') >= 0) {
      tab = '/option'
    }
    
    setSelectedTab(tab)
  }, [pathname])

  const handleSwitchLanguage = (language) => {
    const currentLanguage = i18next.language
    
    if (currentLanguage !== language) {
      localStorage.setItem('language', language)
      i18next.changeLanguage(language)
    }
    setShowLanguageSelection(false)
  }

  const onSignOut = () => {
    setShowProfilePanel(false)
    typeof props.onSignOut === 'function' && props.onSignOut()
  }

  const onConnectWallet = () => {
    typeof props.onConnectWallet === 'function' && props.onConnectWallet()
  }

  return (
    <div className="header-wrapper">
      <div className="header">
        <div className="content-wrapper">
          <div className="logo-wrapper">UNIQ-EX</div>
          <div className="nav-list">
            { READY_TABS.indexOf('/') >= 0 ? <div className={`nav-item ${selectedTab === '/' ? 'selected' : ''}`}><Link to="/">{t('staking')}</Link></div> : null }
            { READY_TABS.indexOf('/synth') >= 0 ? <div className={`nav-item ${selectedTab === '/synth' ? 'selected' : ''}`}><Link to="/synth">{t('synth')}</Link></div> : null }
            { READY_TABS.indexOf('/swap') >= 0 ? <div className={`nav-item ${selectedTab === '/swap' ? 'selected' : ''}`}><Link to="/swap">{t('swap')}</Link></div> : null }
            { READY_TABS.indexOf('/trade') >= 0 ? <div className={`nav-item ${selectedTab === '/trade' ? 'selected' : ''}`}><Link to="/trade">{t('trade')}</Link></div> : null }
            { READY_TABS.indexOf('/governance') >= 0 ? <div className={`nav-item ${selectedTab === '/governance' ? 'selected' : ''}`}><Link to="/governance">{t('governance')}</Link></div> : null }
            { READY_TABS.indexOf('/token') >= 0 ? <div className={`nav-item ${selectedTab === '/token' ? 'selected' : ''}`}><Link to="/token">{t('token')}</Link></div> : null }
            { READY_TABS.indexOf('/option') >= 0 ? <div className={`nav-item ${selectedTab === '/option' ? 'selected' : ''}`}><Link to="/option">{t('option')}</Link></div> : null }
          </div>
          <div className={`${account ? 'active' : ''} profile-wrapper`}>

            { !account && <span className="connect-btn" onClick={() => onConnectWallet()}>{t('connect_wallet')}</span>}
            {
              account && (
                <div
                  className="account-address"
                  onMouseEnter={() => { setShowProfilePanel(true); setShowLanguageSelection(false); }}
                  onMouseLeave={() => { setShowProfilePanel(false); setShowLanguageSelection(false); }}>
                  {formatAccount(account)}
                  {
                    showProfilePanel ? (
                      <div className="profile-panel">
                        <div className="setting-wrapper">
                          <div className="setting-section-title">{t('slippage')}</div>
                          <div className="slippage-setting">
                            <div className={`slippage-item ${Number(slippage) === 0.1 ? 'selected' : ''}`} onClick={() => setSlippage('0.1')}>0.1%</div>
                            <div className={`slippage-item ${Number(slippage) === 0.5 ? 'selected' : ''}`} onClick={() => setSlippage('0.5')}>0.5%</div>
                            <div className={`slippage-item ${Number(slippage) === 1 ? 'selected' : ''}`} onClick={() => setSlippage('1.0')}>1.0%</div>
                            <div className="slippage-input-wrapper">
                              <Input value={slippage} cls="slippage-input" decimals="2" placeholder={slippage} onChange={(amount) => setSlippage(amount)} />%
                            </div>
                          </div>
                        </div>
                        <div className="signout-btn" onClick={() => onSignOut()}>{t('signout')}</div>
                      </div>
                    ) : null
                  }
                </div>
              )
            }
            <div
              className="language-switch"
              onMouseEnter={() => { setShowLanguageSelection(true); setShowProfilePanel(false); }}
              onMouseLeave={() => { setShowLanguageSelection(false); setShowProfilePanel(false); }}>
              <i>{languageMap[i18next.language]}</i>
              {
                showLanguageSelection ? (
                  <div className="language-selection">
                    <div className="language-item" onClick={() => handleSwitchLanguage('zh')}>中文</div>
                    <div className="language-item" onClick={() => handleSwitchLanguage('en')}>English</div>
                    <div className="language-item" onClick={() => handleSwitchLanguage('jp')}>日本語</div>
                  </div>
                ) : null
              }
            </div>
            
          </div>
        </div>
      </div>
    </div>
  )
}

export default Header