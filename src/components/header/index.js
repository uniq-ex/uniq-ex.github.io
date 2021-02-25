import React, { useState, useEffect, useCallback } from 'react'
import { useMappedState, useDispatch } from 'redux-react-hook'
import { Link, useLocation } from 'react-router-dom'
import Input from '../input'
import { READY_TABS } from '../../config'
import { formatAccount } from '../../utils/common'
import './index.css'

const Header = (props) => {
  const [selectedTab, setSelectedTab] = useState('')
  const [showProfilePanel, setShowProfilePanel] = useState(false)
  const { account, slippage } = useMappedState((state) => ({
    account: state.wallet.account,
    slippage: state.wallet.slippage
  }))
  const [showSiteIntro, setShowSiteIntro] = useState(false)
  const dispatch = useDispatch()
  const setSlippage = useCallback((slippage) => dispatch({ type: 'SET_SLIPPAGE', slippage }), [])
  const pathname = useLocation().pathname

  const toggleShowSiteIntro = (show) => {
    setShowSiteIntro(show)
  }

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
    }
    
    setSelectedTab(tab)
  }, [pathname])

  const renderSiteIntro = () => {
    if (showSiteIntro) {
      const href = `${window.location.origin}${window.location.pathname}#/trade?pair=pDAI%2FUNX`
      return (
        <div className="modal-overlay">
          <div className="modal-wrapper">
            <div className="close-btn" onClick={() => toggleShowSiteIntro(false)}></div>
            <p className="intro-line">uniq-ex is a pure github based DAO dex, all activities are logged on github.</p>
            <p className="intro-line">You can open issues for discussion <a target="_blank" rel="noreferrer" href="https://github.com/uniq-ex/uniq-ex/issues">here</a></p>
            <p className="intro-line">uniq-ex's future business will not be limited to exchanges though, we may enter various DeFi markets like compound or hegic.</p>
            <p className="intro-line">You can buy UNX(the governance token of uniq-ex) <a target="_blank" rel="noreferrer" href={href}>here</a></p>
          </div>
        </div>
      )
    }
    return null
  }

  const onSignOut = () => {
    setShowProfilePanel(false)
    typeof props.onSignOut === 'function' && props.onSignOut()
  }

  const onConnectWallet = () => {
    typeof props.onConnectWallet === 'function' && props.onConnectWallet()
  }

  const toggleProfilePanel = () => {
    setShowProfilePanel(!showProfilePanel)
  }

  return (
    <div className="header-wrapper">
      {renderSiteIntro()}
      <div className="header">
        <div className="content-wrapper">
          <div className="logo-wrapper">
            UNIQ-EX
            {/* <div className="site-intro" onClick={() => toggleShowSiteIntro(true)}></div> */}
          </div>
          <div className="nav-list">
            { READY_TABS.indexOf('/') >= 0 ? <div className={`nav-item ${selectedTab === '/' ? 'selected' : ''}`}><Link to="/">Staking</Link></div> : null }
            { READY_TABS.indexOf('/synth') >= 0 ? <div className={`nav-item ${selectedTab === '/synth' ? 'selected' : ''}`}><Link to="/synth">Synth</Link></div> : null }
            { READY_TABS.indexOf('/swap') >= 0 ? <div className={`nav-item ${selectedTab === '/swap' ? 'selected' : ''}`}><Link to="/swap">Swap</Link></div> : null }
            { READY_TABS.indexOf('/trade') >= 0 ? <div className={`nav-item ${selectedTab === '/trade' ? 'selected' : ''}`}><Link to="/trade">Trade</Link></div> : null }
            { READY_TABS.indexOf('/governance') >= 0 ? <div className={`nav-item ${selectedTab === '/governance' ? 'selected' : ''}`}><Link to="/governance">Governance</Link></div> : null }
            { READY_TABS.indexOf('/token') >= 0 ? <div className={`nav-item ${selectedTab === '/token' ? 'selected' : ''}`}><Link to="/token">Token</Link></div> : null }
          </div>
          <div className={`${account ? 'active' : ''} profile-wrapper`}>
            { !account && <span className="connect-btn" onClick={() => onConnectWallet()}>Connect Wallet</span>}
            { account && <span className="account-address" onClick={() => toggleProfilePanel()}>{formatAccount(account)}</span> }
            {
              showProfilePanel ? (
                <div className="profile-panel">
                  <div className="setting-wrapper">
                    <div className="setting-section-title">SLIPPAGE</div>
                    <div className="slippage-setting">
                      <div className={`slippage-item ${Number(slippage) === 0.1 ? 'selected' : ''}`} onClick={() => setSlippage('0.1')}>0.1%</div>
                      <div className={`slippage-item ${Number(slippage) === 0.5 ? 'selected' : ''}`} onClick={() => setSlippage('0.5')}>0.5%</div>
                      <div className={`slippage-item ${Number(slippage) === 1 ? 'selected' : ''}`} onClick={() => setSlippage('1.0')}>1.0%</div>
                      <div className="slippage-input-wrapper">
                        <Input value={slippage} cls="slippage-input" decimals="2" placeholder={slippage} onChange={(amount) => setSlippage(amount)} />%
                      </div>
                    </div>
                  </div>
                  <div className="signout-btn" onClick={() => onSignOut()}>Sign Out</div>
                </div>
              ) : null
            }
          </div>
        </div>
      </div>
    </div>
  )
}

export default Header