import { client } from '@ont-dev/ontology-dapi'
import React, { useState, useEffect, useCallback } from 'react'
import { useLocation } from "react-router-dom"
import { utils } from 'ontology-ts-sdk'
import BigNumber from 'bignumber.js'
import { useAlert } from 'react-alert'
import { useMappedState, useDispatch } from 'redux-react-hook';
import { STAKING_ADDRESS } from '../../../config'
import './index.css'

const { StringReader } = utils

const StakingDetail = (props) => {
  const [stakeToken, setStakeToken] = useState({})
  const [amount, setAmount] = useState('')
  const [myStake, setMyStake] = useState({})
  const [stakeType, setStakeType] = useState('stake')
  const [showStakingModal, setShowStakingModal] = useState(false)
  const { account, tokens } = useMappedState((state) => ({
    account: state.wallet.account,
    tokens: state.common.tokens
  }))
  const dispatch = useDispatch()
  const setModal = useCallback((modalType, modalDetail) => dispatch({ type: 'SET_MODAL', modalType, modalDetail }), [])

  const Alert = useAlert()
  const location = useLocation()
  const tokenId = location.pathname.match(/\/([^/]+)$/)[1]

  useEffect(() => {
    if (account && tokens.length) {
      setStakeToken(tokens.find((t) => t.id == tokenId))
    }
  }, [tokens, account])

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
        console.log(args)
        const param = {
          scriptHash: STAKING_ADDRESS,
          operation: stakeType,
          args,
          gasPrice: 2500,
          gasLimit: 3000000,
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
            extraLink: `https://explorer.ont.io/transaction/${stakeResult.transaction}`
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
        gasLimit: 3000000,
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
          extraLink: `https://explorer.ont.io/transaction/${harvestResult.transaction}`
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

  return (
    <div className="stake-container">
      <div className="stake-title">Earn <span className="icon-UNX">UNX</span> by <span className={`icon-${stakeToken.name}`}>{stakeToken.name || ''}</span></div>
      <div className="stake-token-detail">
        <div className={`stake-token-amount icon-${stakeToken.name}`}>{new BigNumber(myStake.balance || 0).div(10 ** (stakeToken.decimals || 0)).toString()}</div>
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
      { showStakingModal ? (
        <div className="modal-overlay">
          <div className="modal-wrapper">
            <div className="close-btn" onClick={() => { setShowStakingModal(false) }}></div>
            <div className="stake-wrapper">
              <div className={`icon-${stakeToken.name} token-placeholder`}></div>
              <div className="form-item">
                <div className="input-wrapper">
                  <input className="input inline-input" placeholder="Amount" type="number" onChange={(event) => setAmount(event.target.value)}></input>
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