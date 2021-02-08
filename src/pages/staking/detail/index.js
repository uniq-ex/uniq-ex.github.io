import { client } from '@ont-dev/ontology-dapi'
import React, { useState, useEffect, useCallback } from 'react'
import { useHistory, useLocation } from "react-router-dom"
import { utils } from 'ontology-ts-sdk'
import BigNumber from 'bignumber.js'
import { useAlert } from 'react-alert'
import { useMappedState, useDispatch } from 'redux-react-hook';
import Input from '../../../components/input'
import { getTokenBalance, getLPTokenDom } from '../../../utils/token'
import { GOVERNANCE_ADDRESS, STAKING_ADDRESS, TRANSACTION_BASE_URL, TRANSACTION_AFTERFIX } from '../../../config'

import './index.css'

const { StringReader } = utils

const StakingDetail = (props) => {
  const [stakeToken, setStakeToken] = useState({})
  const [tokenBalance, setTokenBalance] = useState('-')
  const [amount, setAmount] = useState('')
  const [myStake, setMyStake] = useState({})
  const [stakeType, setStakeType] = useState('stake')
  const [claimableWing, setClaimableWing] = useState('-')
  const [showStakingModal, setShowStakingModal] = useState(false)
  const { account, tokens } = useMappedState((state) => ({
    account: state.wallet.account,
    tokens: state.common.tokens
  }))
  const dispatch = useDispatch()
  const setModal = useCallback((modalType, modalDetail) => dispatch({ type: 'SET_MODAL', modalType, modalDetail }), [])

  const Alert = useAlert()
  const location = useLocation()
  const history = useHistory()
  const tokenId = location.pathname.match(/\/([^/]+)$/)[1]

  useEffect(() => {
    if (account && tokens.length) {
      const sToken = tokens.find((t) => `${t.id}` === tokenId)

      setStakeToken(sToken)
      getTokenBalance(account, sToken, setTokenBalance)
    }
  }, [tokens, account])


  useEffect(() => {
    const getClaimableWing = () => {
      if (account && stakeToken.id) {
        client.api.smartContract.invokeWasmRead({
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
        }).then((resp) => {
          const strReader = new StringReader(resp)

          setClaimableWing(strReader.readUint128())
        })
      }
    }

    getClaimableWing()
    let interval = setInterval(() => getClaimableWing, 3000)

    return () => {
      interval && clearInterval(interval)
    }
  }, [account, stakeToken])

  useEffect(() => {
    if (account && tokens.length) {
      getAccountStake()
      const interval = !myStake.id && setInterval(getAccountStake, 2000)
      return () => {
        interval && clearInterval(interval)
      }
    }
  }, [tokens, account])

  useEffect(() => {
    if (!account) {
      setMyStake({})
    }
  }, [account])

  function getAccountStakeByTokenId(id) {
    return client.api.smartContract.invokeWasmRead({
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
        balance: strReader.readUint128(),
        interest: strReader.readUint128()
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
      Alert.show('Please Connect Wallet First')
      return
    }
    setStakeType(action)
    setShowStakingModal(true)
  }

  async function onStake() {
    if (!account) {
      Alert.show('Please Connect Wallet First')
      return
    }
    if (stakeToken.id) {
      if (amount <= 0) {
        Alert.error('Amount should be greater than 0')
        return
      }
      if (stakeType === 'unstake' && amount > myStake.balance) {
        Alert.error('Amount should be less than your balance')
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
          gasLimit: 30000000,
          requireIdentity: false
        }

        const stakeResult = await client.api.smartContract.invokeWasm(param)

        if (stakeResult.transaction) {
          setShowStakingModal(false)
          setModal('infoModal', {
            show: true,
            type: 'success',
            text: 'Transaction Successful',
            extraText: 'View Transaction',
            extraLink: `${TRANSACTION_BASE_URL}${stakeResult.transaction}${TRANSACTION_AFTERFIX}`
          })
        }
      } catch (e) {
        setShowStakingModal(false)
        setModal('infoModal', {
          show: true,
          type: 'error',
          text: 'Transaction Failed',
          extraText: `${e}`,
          extraLink: ''
        })
      }
    }
  }

  async function onHarvest() {
    if (!account) {
      Alert.show('Please Connect Wallet First')
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
        }
      ]
      const param = {
        scriptHash: STAKING_ADDRESS,
        operation: 'harvest',
        args,
        gasPrice: 2500,
        gasLimit: 30000000,
        requireIdentity: false
      }

      const harvestResult = await client.api.smartContract.invokeWasm(param)

      if (harvestResult.transaction) {
        setShowStakingModal(false)
        setModal('infoModal', {
          show: true,
          type: 'success',
          text: 'Transaction Successful',
          extraText: 'View Transaction',
          extraLink: `${TRANSACTION_BASE_URL}${harvestResult.transaction}${TRANSACTION_AFTERFIX}`
        })
      }
    } catch (e) {
      setModal('infoModal', {
        show: true,
        type: 'error',
        text: 'Transaction Failed',
        extraText: `${e}`,
        extraLink: ''
      })
    }
  }

  function onNavigateToStaking() {
    history.goBack()
  }

  const maxInput = () => {
    if (!isNaN(tokenBalance)) {
      setAmount(tokenBalance)
    }
  }

  return (
    <div className="stake-container">
      <div className="stake-title">
        <div className="back-icon" onClick={() => onNavigateToStaking()} />
        Earn <span className="icon-UNX">UNX</span> by 
        {
          stakeToken.ty === 4 ? (
            <span className="lp-token-span">
              {getLPTokenDom(stakeToken.name, 'inline-lp-token')}
              {stakeToken.name || ''}
            </span>
          ) : (
            <span className={`icon-${stakeToken.name}`}>{stakeToken.name || ''}</span>
          )
        }
      </div>
      <div className="stake-token-detail">
        {
          stakeToken.ty === 4 ? (
            <div className="stake-token-amount">
              {getLPTokenDom(stakeToken.name, 'stake-lp-token-wrapper')}
              {new BigNumber(myStake.balance || 0).div(10 ** (stakeToken.decimals || 0)).toString()}
            </div>
          ) : (
            <div className={`stake-token-amount icon-${stakeToken.name}`}>{new BigNumber(myStake.balance || 0).div(10 ** (stakeToken.decimals || 0)).toString()}</div>
          )
        }
        <div className="stake-token-actions">
          <div className="stake-token-action" onClick={() => handleStakeClick('stake')}>Stake</div>
          <div className="stake-token-action" onClick={() => handleStakeClick('unstake')}>Unstake</div>
        </div>
      </div>
      <div className="harvest-token-detail">
        <div className="harvest-token-amount icon-UNX">{new BigNumber(myStake.interest || 0).div(10 ** 9).toString()}</div>
        <div className="harvest-token-actions">
          <div className="harvest-token-action" onClick={() => onHarvest() }>Harvest</div>
        </div>
      </div>
      {
        stakeToken.ty === 3 ? (
          <div className="claimable-wing-detail">
            <div className="claimable-wing-amount icon-WING">{new BigNumber(claimableWing || 0).div(10 ** 9).toString()}
              <span className="claimable-wing-label">WING Earned</span>
            </div>
          </div>
        ) : null
      }
      { showStakingModal ? (
        <div className="modal-overlay">
          <div className="modal-wrapper">
            <div className="close-btn" onClick={() => { setShowStakingModal(false) }}></div>
            <div className="stake-wrapper">
              <div className={`icon-${stakeToken.name} token-placeholder`}></div>
              <div className="form-item">
                <div className="input-label">Amount
                  <span className="hint">Balance: {tokenBalance}</span>
                </div>
                <div className="input-wrapper">
                  <Input placeholder="0.0" value={amount} decimals={stakeToken.decimals || 0} onChange={(amount) => setAmount(amount)} />
                  <div className="input-max-btn" onClick={() => maxInput()}>MAX</div>
                </div>
              </div>
              <div className="stake-btn" onClick={() => onStake()}>{ stakeType === 'stake' ? 'Stake' : 'Unstake'}</div>
            </div>
          </div>
        </div>
      ) : null }
    </div>
  )
}

export default StakingDetail