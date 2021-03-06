import React, { useState, useEffect, useCallback } from 'react'
import { useHistory, useLocation } from "react-router-dom"
import { utils } from 'ontology-ts-sdk'
import BigNumber from 'bignumber.js'
import { useAlert } from 'react-alert'
import { useMappedState, useDispatch } from 'redux-react-hook';
import i18next from 'i18next'
import { useTranslation } from 'react-i18next'
import Tooltip from 'rc-tooltip';
import Input from '../../../components/input'
import { cyanoRequest } from '../../../utils/cyano'
import { readBigNumberUint128, getTokenBalance, getTokenIconDom } from '../../../utils/token'
import { GOVERNANCE_ADDRESS, TRANSACTION_BASE_URL, TRANSACTION_AFTERFIX } from '../../../config'

import './index.css'

const { StringReader } = utils

const StakingDetail = (props) => {
  const [stakeToken, setStakeToken] = useState({})
  const [tokenBalance, setTokenBalance] = useState('-')
  const [tokenWeight, setTokenWeight] = useState(1)
  const [amount, setAmount] = useState('')
  const [myStake, setMyStake] = useState({})
  const [stakeType, setStakeType] = useState('stake')
  const [claimableWing, setClaimableWing] = useState(0)
  const [showStakingModal, setShowStakingModal] = useState(false)
  const { account, tokens, stakingTokens, STAKING_ADDRESS } = useMappedState((state) => ({
    account: state.wallet.account,
    tokens: state.common.tokens,
    stakingTokens: state.staking.tokens,
    STAKING_ADDRESS: state.gov.poolStat.pools.staking.address
  }))
  const dispatch = useDispatch()
  const setModal = useCallback((modalType, modalDetail) => dispatch({ type: 'SET_MODAL', modalType, modalDetail }), [])

  const [t] = useTranslation()
  const isEnLanguage = i18next.language === 'en'
  const Alert = useAlert()
  const location = useLocation()
  const history = useHistory()
  const tokenId = location.pathname.match(/\/([^/]+)$/)[1]

  useEffect(() => {
    if (stakingTokens.length) {
      setTokenWeight(stakingTokens.find((t) => `${t.id}` === tokenId).originWeight)
    }
  }, [stakingTokens])

  useEffect(() => {
    if (account && tokens.length) {
      const sToken = tokens.find((t) => `${t.id}` === tokenId)

      setStakeToken(sToken)
      getTokenBalance(account, sToken, setTokenBalance)
    }
  }, [tokens, account])


  useEffect(() => {
    const getClaimableWing = async () => {
      if (account && stakeToken.ty === 2) {
        try {
          const resp = await cyanoRequest('smartContract.invokeWasmRead', {
            scriptHash: GOVERNANCE_ADDRESS,
            operation: 'claimable_wing',
            args: [
              {
                type: 'Address',
                value: account
              },
              {
                type: 'Long',
                value: stakeToken.id
              }
            ]
          })
          const strReader = new StringReader(resp)

          setClaimableWing(readBigNumberUint128(strReader))
        } catch (e) {
          console.log(e)
        }
      }
    }

    getClaimableWing()
    let interval = setInterval(getClaimableWing, 10000)

    return () => {
      interval && clearInterval(interval)
    }
  }, [account, stakeToken])

  useEffect(() => {
    if (account && stakeToken.id && STAKING_ADDRESS) {
      getAccountStake()
      const interval = setInterval(getAccountStake, 10000)
      return () => {
        interval && clearInterval(interval)
      }
    }
  }, [stakeToken, account, STAKING_ADDRESS])

  useEffect(() => {
    if (!account) {
      setMyStake({})
    }
  }, [account])

  function getAccountStakeByTokenId(id) {
    return cyanoRequest('smartContract.invokeWasmRead', {
      scriptHash: STAKING_ADDRESS,
      operation: 'account_stake_info',
      args: [
        {
          type: 'Address',
          value: account
        },
        {
          type: 'Long',
          value: id
        }
      ]
    }).then((stakeStr) => {
      const strReader = new StringReader(stakeStr)
      return {
        id,
        balance: new BigNumber(readBigNumberUint128(strReader) || 0).div(10 ** (stakeToken.decimals || 0)).toString(),
        interest: readBigNumberUint128(strReader)
      }
    })
  }

  function getAccountStake() {
    getAccountStakeByTokenId(tokenId)
    .then((stake) => {
      setMyStake(stake)
    })
    .catch((e) => {
      console.log('get account stakes', e)
    })
  }

  function handleStakeClick(action) {
    if (!account) {
      Alert.show(t('connect_wallet_first'))
      return
    }
    setStakeType(action)
    setShowStakingModal(true)
  }

  async function onStake() {
    if (!account) {
      Alert.show(t('connect_wallet_first'))
      return
    }
    if (stakeToken.id && STAKING_ADDRESS) {
      if (amount <= 0) {
        Alert.error(t('amount_gt_0'))
        return
      }
      if (stakeType === 'unstake' && new BigNumber(amount).gt(new BigNumber(myStake.balance))) {
        Alert.error(t('amount_lte_balance'))
        return
      }
      try {
        const args = [
          {
            type: 'Address',
            value: account
          },
          {
            type: 'Long',
            value: stakeToken.id
          },
          {
            type: 'Long',
            value: new BigNumber(amount).times(new BigNumber(10 ** stakeToken.decimals)).integerValue(BigNumber.ROUND_DOWN).toString()
          }
        ]
        const param = {
          scriptHash: STAKING_ADDRESS,
          operation: stakeType,
          args,
          gasPrice: 2500,
          gasLimit: 60000000,
          requireIdentity: false
        }

        const stakeResult = await cyanoRequest('smartContract.invokeWasm', param)

        if (stakeResult.transaction) {
          setShowStakingModal(false)
          setModal('infoModal', {
            show: true,
            type: 'success',
            text:  t('transaction_successful'),
            extraText: 'View Transaction',
            extraLink: `${TRANSACTION_BASE_URL}${stakeResult.transaction}${TRANSACTION_AFTERFIX}`
          })
        }
      } catch (e) {
        setShowStakingModal(false)
        setModal('infoModal', {
          show: true,
          type: 'error',
          text: t('transaction_failed'),
          // extraText: `${e}`,
          extraText: '',
          extraLink: ''
        })
      }
    }
  }

  async function onHarvest() {
    if (!account) {
      Alert.show(t('connect_wallet_first'))
      return
    }

    if (STAKING_ADDRESS) {
      try {
        const args = [
          {
            type: 'Address',
            value: account
          },
          {
            type: 'Long',
            value: stakeToken.id
          }
        ]
        const param = {
          scriptHash: STAKING_ADDRESS,
          operation: 'harvest',
          args,
          gasPrice: 2500,
          gasLimit: 60000000,
          requireIdentity: false
        }

        const harvestResult = await cyanoRequest('smartContract.invokeWasm', param)

        if (harvestResult.transaction) {
          setShowStakingModal(false)
          setModal('infoModal', {
            show: true,
            type: 'success',
            text: t('transaction_successful'),
            extraText: 'View Transaction',
            extraLink: `${TRANSACTION_BASE_URL}${harvestResult.transaction}${TRANSACTION_AFTERFIX}`
          })
        }
      } catch (e) {
        setModal('infoModal', {
          show: true,
          type: 'error',
          text: t('transaction_failed'),
          // extraText: `${e}`,
          extraText: '',
          extraLink: ''
        })
      }
    }
  }

  function onNavigateToStaking() {
    history.goBack()
  }

  const maxInput = () => {
    if (stakeType === 'stake' && !isNaN(tokenBalance)) {
      setAmount(tokenBalance)
    } else if (stakeType === 'unstake' && !isNaN(myStake.balance)) {
      setAmount(myStake.balance)
    }
  }

  return (
    <div className="stake-container">
      <div className="stake-title">
        <div className="back-icon" onClick={() => onNavigateToStaking()} />
        {
          isEnLanguage ? (
            <React.Fragment>
              {t('earn')} <span className="icon-UNX">UNX</span> {t('by')}
              {getTokenIconDom(stakeToken, 'inline-token-wrapper')}
              {stakeToken.name || ''}
            </React.Fragment>
          ) : (
            <React.Fragment>
              {t('by')} {getTokenIconDom(stakeToken, 'inline-token-wrapper')}
              {stakeToken.name || ''} {t('earn')}
              <span className="icon-UNX">UNX</span>
            </React.Fragment>
          )
        }
      </div>
      <div className="stake-token-detail">
        <div className="stake-token-amount">
          {getTokenIconDom(stakeToken, 'stake-token-wrapper')}
          <div className="stake-token-amount-detail">
            <div className="stake-token-amount-label">{t('current_staked')}</div>
            <div className="stake-token-amount-info">{myStake.balance} {stakeToken.name}</div>
          </div>
        </div>
        <div className="stake-token-actions">
          { tokenWeight ? <div className="stake-token-action" onClick={() => handleStakeClick('stake')}>{t('stake')}</div> : null }
          <div className="stake-token-action" onClick={() => handleStakeClick('unstake')}>{t('unstake')}</div>
        </div>
      </div>
      <div className="harvest-token-detail">
        <div className="harvest-token-amount icon-UNX">
          <div className="harvest-token-amount-label">{t('rewards_available')}</div>
          <div className="harvest-token-amount-info">{new BigNumber(myStake.interest || 0).div(10 ** 9).toString()} UNX</div>
        </div>
        <div className="harvest-token-actions">
          <div className="harvest-token-action" onClick={() => onHarvest() }>{t('harvest')}</div>
        </div>
      </div>
      {
        stakeToken.ty === 2 ? (
          <div className="claimable-wing-detail">
            <div className="claimable-wing-amount icon-WING">{new BigNumber(claimableWing || 0).div(10 ** 9).toString()}
              <div className="claimable-wing-label">{t('wing_earned')}
                <Tooltip placement="top" overlay="WING earned by ftoken will be transferred to your account when you stake or unstake">
                  <span>?</span>
                </Tooltip>
              </div>
            </div>
          </div>
        ) : null
      }
      { showStakingModal ? (
        <div className="modal-overlay">
          <div className="modal-wrapper">
            <div className="close-btn" onClick={() => { setShowStakingModal(false); setAmount(''); }}></div>
            <div className="stake-wrapper">
              {/* <div className={`icon-${stakeToken.name} token-placeholder`}></div> */}
              {getTokenIconDom(stakeToken, 'token-placeholder')}
              <div className="form-item">
                <div className="input-label">{t('amount')}
                  {
                    stakeType === 'stake' ? (
                      <span className="hint">{t('balance')}: {tokenBalance}</span>
                    ) : (
                      <span className="hint">{t('staked')}: {myStake.balance}</span>
                    )
                  }
                </div>
                <div className="input-wrapper">
                  <Input placeholder="0.0" value={amount} decimals={stakeToken.decimals || 0} onChange={(amount) => setAmount(amount)} />
                  <div className="input-max-btn" onClick={() => maxInput()}>{t('max')}</div>
                </div>
              </div>
              <div className="stake-btn" onClick={() => onStake()}>{ stakeType === 'stake' ? t('stake') : t('unstake')}</div>
            </div>
          </div>
        </div>
      ) : null }
    </div>
  )
}

export default StakingDetail