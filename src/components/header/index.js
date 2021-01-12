import React, { useState, useEffect } from 'react'
import { useMappedState } from 'redux-react-hook'
import { Link } from 'react-router-dom'
import { READY_TABS } from '../../config'
import { formatAccount } from '../../utils/common'
import './index.css'

const Header = (props) => {
  const { account } = useMappedState((state) => ({
    account: state.wallet.account
  }))
  const [showSiteIntro, setShowSiteIntro] = useState(false)

  const toggleShowSiteIntro = (show) => {
    setShowSiteIntro(show)
  }

  const renderSiteIntro = () => {
    if (showSiteIntro) {
      return (
        <div className="modal-overlay">
          <div className="modal-wrapper">
            <div className="close-btn" onClick={() => toggleShowSiteIntro(false)}></div>
            <p className="intro-line">uniq-ex is a pure github based DAO dex, all activities are logged on github.</p>
            <p className="intro-line">You can open issues for discussion <a target="_blank" rel="noreferrer" href="https://github.com/uniq-ex/uniq-ex/issues">here</a></p>
            <p className="intro-line">uniq-ex's future business will not be limited to exchanges though, we may enter various DeFi markets like compound or hegic.</p>
            <p className="intro-line">You can buy UNX(the governance token of uniq-ex) <a target="_blank" rel="noreferrer" href="https://uniq-ex.github.io/#/?asset=8&price=14">here</a></p>
          </div>
        </div>
      )
    }
    return null
  }

  const onSignOut = () => {
    typeof props.onSignOut === 'function' && props.onSignOut()
  }

  const onConnectWallet = () => {
    typeof props.onConnectWallet === 'function' && props.onConnectWallet()
  }

  return (
    <div className="header-wrapper">
      {renderSiteIntro()}
      <div className="header">
        <div className="content-wrapper">
          <div className="logo-wrapper">
            UNIQ-EX
            <div className="site-intro" onClick={() => toggleShowSiteIntro(true)}></div>
          </div>
          <div className="nav-list">
            { READY_TABS.indexOf('/') >= 0 ? <div className="nav-item"><Link to="/">Trade</Link></div> : null }
            { READY_TABS.indexOf('/swap') >= 0 ? <div className="nav-item"><Link to="/swap">Swap</Link></div> : null }
            { READY_TABS.indexOf('/staking') >= 0 ? <div className="nav-item"><Link to="/staking">Staking</Link></div> : null }
            { READY_TABS.indexOf('/governance') >= 0 ? <div className="nav-item"><Link to="/governance">Governance</Link></div> : null }
            { READY_TABS.indexOf('/token') >= 0 ? <div className="nav-item"><Link to="/token">Token</Link></div> : null }
          </div>
          <div className={`${account ? 'active' : ''} profile-wrapper`}>
            { account && <span className="account-address">{formatAccount(account)}</span> }
            { account && <span className="signout-btn" onClick={() => onSignOut()}>Sign Out</span> }
            { !account && <span className="connect-btn" onClick={() => onConnectWallet()}>Connect Wallet</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Header