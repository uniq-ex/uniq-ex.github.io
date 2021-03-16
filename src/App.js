import { client } from '@ont-dev/ontology-dapi'
import React, { useEffect, useCallback } from 'react'
import {
  Switch,
  Route,
  useHistory,
  useLocation
} from 'react-router-dom'
import { useAlert } from 'react-alert'
import { useMappedState, useDispatch } from 'redux-react-hook';
import { useTranslation } from 'react-i18next'
import Header from './components/header'
import Modal from './components/modal'
import Transaction from './pages/transaction'
import Swap from './pages/swap'
import Pool from './pages/pool'
import AddLiquidity from './pages/pool/addLiquidity'
import RemoveLiquidity from './pages/pool/removeLiquidity'
import Staking from './pages/staking'
import StakingDetail from './pages/staking/detail'
import Token from './pages/token'
import Option from './pages/option'
import Coming from './pages/coming'
// import Trade from './pages/trade'
import Synth from './pages/synth'
import Governance from './pages/governance'
import { NETWORK_TYPE, READY_TABS, COMING_TABS } from './config'
import { useFetchTokens } from './hooks/useToken'
import './App.css'

export const App = () => {
  const Alert = useAlert()
  const { account, isUpgrading, loadingToken, poolStat } = useMappedState((state) => ({
    isUpgrading: state.common.isUpgrading,
    loadingToken: state.common.loadingToken,
    account: state.wallet.account,
    poolStat: state.gov.poolStat
  }))
  const dispatch = useDispatch()
  const setAccount = useCallback((account) => dispatch({ type: 'SET_ACCOUNT', account }), [])
  const history = useHistory()
  const location = useLocation()
  const [t] = useTranslation()

  useEffect(() => {
    const startTimeStamp = poolStat.distributionInfo.startTimeStamp
    if (startTimeStamp && new Date(startTimeStamp * 1000) > new Date()) {
      if (location.pathname === '/') {
        history.replace('/governance')
      }
    }
  }, [poolStat])

  useEffect(() => {
    let retryTimes = 3
    const interval = setInterval(() => {
      client.api.provider.getProvider()
        .then(() => {
          clearInterval(interval)
        })
        .catch((e) => {
          if (e === 'NO_PROVIDER') {
            retryTimes--
            if (!retryTimes) {
              Alert.error('Please install wallet extension first')
            }
          }
        })
    }, 500)
  }, [])

  useEffect(() => {
    client.api.network.getNetwork()
      .then((network) => {
        if (network && network.type !== NETWORK_TYPE) {
          Alert.error(`Please connect to the ${NETWORK_TYPE}-Net`)
          return
        }
      })
      .catch((e) => {
        console.log(e)
      })
  }, [])

  useFetchTokens()

  async function onConnectWallet() {
    try {
      const accountAddress = await client.api.asset.getAccount()
      setAccount(accountAddress)
      localStorage.setItem('account', accountAddress)
    } catch (e) {
      console.log(e)
    }
  }

  function onSignOut() {
    setAccount('')
    localStorage.setItem('account', '')
  }

  function renderLoading() {
    if (loadingToken) {
      return (
        <div className="modal-overlay">
          <div className="modal-wrapper transparent-bg">
            <div className="modal-icon-loading modal-icon"></div>
            <div className="modal-text light">{t('loading')}</div>
          </div>
        </div>
      )
    }
    return null
  }

  function renderUpgrading() {
    if (isUpgrading) {
      return (
        <div className="modal-overlay">
          <div className="modal-wrapper transparent-bg">
            <div className="modal-icon-upgrading modal-icon"></div>
            <div className="modal-text light">UNIQ-EX {t('upgrading')}</div>
          </div>
        </div>
      )
    }
  }

  return (
    <React.Fragment>
      {renderLoading()}
      {
        !isUpgrading ? (
          <div className="app">
            <React.Fragment>
              {
                (account === null) && <div className="connect-wallet-overlay">
                  <div className="connect-wrapper">
                    <p className="connect-title">{t('connect_wallet')}</p>
                    <div className="wallet-item" onClick={() => onConnectWallet()}>Cyano {t('wallet')}</div>
                  </div>
                </div>
              }
              <Modal />
              <Header onSignOut={() => onSignOut()} onConnectWallet={() => onConnectWallet()} />
              <div className="main-wrapper">
                <Switch>
                  {
                    READY_TABS.indexOf('/') >= 0 ?
                    <Route exact path="/">
                      { COMING_TABS.indexOf('/') >= 0 ? <Coming /> : <Staking /> }
                    </Route> : null
                  }
                  {
                    READY_TABS.indexOf('/') >= 0 ?
                    <Route exact path="/staking/:id">
                      { COMING_TABS.indexOf('/') >= 0 ? <Coming /> : <StakingDetail /> }
                    </Route> : null
                  }
                  {
                    READY_TABS.indexOf('/swap') >= 0 ?
                    <Route exact path="/swap">
                      { COMING_TABS.indexOf('/swap') >= 0 ? <Coming /> : <Swap /> }
                    </Route> : null
                  }
                  {
                    READY_TABS.indexOf('/swap') >= 0 ?
                    <Route exact path="/pool">
                      { COMING_TABS.indexOf('swap') >= 0 ? <Coming /> : <Pool /> }
                    </Route> : null
                  }
                  {
                    READY_TABS.indexOf('/swap') >= 0 ?
                    <Route exact path="/pool/add">
                      { COMING_TABS.indexOf('/swap') >= 0 ? <Coming /> : <AddLiquidity /> }
                    </Route> : null
                  }
                  {
                    READY_TABS.indexOf('/swap') >= 0 ?
                    <Route exact path="/pool/remove/:id">
                      { COMING_TABS.indexOf('/swap') >= 0 ? <Coming /> : <RemoveLiquidity /> }
                    </Route> : null
                  }
                  {
                    READY_TABS.indexOf('/trade') >= 0 ?
                    <Route exact path="/trade">
                      { COMING_TABS.indexOf('/trade') >= 0 ? <Coming /> : <Transaction /> }
                    </Route> : null
                  }
                  {
                    READY_TABS.indexOf('/governance') >= 0 ?
                    <Route exact path="/governance">
                      { COMING_TABS.indexOf('/governance') >= 0 ? <Coming /> : <Governance /> }
                    </Route> : null
                  }
                  {
                    READY_TABS.indexOf('/token') >= 0 ?
                    <Route exact path="/token">
                      { COMING_TABS.indexOf('/token') >= 0 ? <Coming showCountdown={false} /> : <Token /> }
                    </Route> : null
                  }
                  {
                    READY_TABS.indexOf('/option') >= 0 ?
                    <Route exact path="/option">
                      { COMING_TABS.indexOf('/option') >= 0 ? <Coming showCountdown={false} /> : <Option /> }
                    </Route> : null
                  }
                  {
                    READY_TABS.indexOf('/synth') >= 0 ?
                    <Route exact path="/synth">
                      { COMING_TABS.indexOf('/synth') >= 0 ? <Coming /> : <Synth /> }
                    </Route> : null
                  }
                </Switch>
              </div>
              <div className="footer">
                <div className="telegram">Telegram: <a target="_blank" href="https://t.me/UNIQ_EX">https://t.me/UNIQ_EX</a></div>
              </div>
            </React.Fragment>
          </div>
        ) : renderUpgrading()
      }
    </React.Fragment>
  )
}
