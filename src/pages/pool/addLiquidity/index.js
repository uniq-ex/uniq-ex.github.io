import { client } from '@ont-dev/ontology-dapi'
import React, { useState, useEffect, useCallback } from 'react'
import { useHistory } from "react-router-dom"
import { useMappedState, useDispatch } from 'redux-react-hook';
import { utils } from 'ontology-ts-sdk'
import { useAlert } from 'react-alert'
import BigNumber from 'bignumber.js'
import Select, { components } from 'react-select'
import request from '../../../utils/request'
import { useFetchPairs } from '../../../hooks/usePair';
import { SWAP_ADDRESS } from '../../../config'
import { SLIPPAGE } from '../../../utils/constants'
import './index.css'

const { StringReader, reverseHex } = utils

const AddLiquidity = () => {
  const [token1, setToken1] = useState({})
  const [token2, setToken2] = useState({})
  const [token1Balance, setToken1Balance] = useState(0)
  const [token2Balance, setToken2Balance] = useState(0)
  const [token1Amount, setToken1Amount] = useState(0)
  const [token2Amount, setToken2Amount] = useState(0)
  const [isValidPair, setIsValidPair] = useState(true)
  const [isFirstProvider, setIsFirstProvider] = useState(false)
  const [showPriceInfo, setShowPriceInfo] = useState(false)
  const { account, tokens, pairs, swapTokens } = useMappedState((state) => ({
    account: state.wallet.account,
    tokens: state.common.tokens,
    pairs: state.swap.pairs,
    swapTokens: state.swap.tokens
  }))
  const dispatch = useDispatch()
  const setModal = useCallback((modalType, modalDetail) => dispatch({ type: 'SET_MODAL', modalType, modalDetail }), [])
  const Alert = useAlert()
  const history = useHistory()

  useFetchPairs()

  useEffect(() => {
    if (!token1.id || !token2.id || (token1.id === token2.id)) {
      setIsValidPair(false)
    } else {
      setIsValidPair(true)
    }
  }, [token1, token2])

  useEffect(() => {
    if (token1.id && token2.id && token1.id != token2.id && (!pairs.length || !getPairByToken())) {
      setIsFirstProvider(true)
    } else {
      setIsFirstProvider(false)
    }
  }, [pairs, token1, token2])

  useEffect(() => {
    if (token1.id && token2.id) {
      setShowPriceInfo(true)
    } else {
      setShowPriceInfo(false)
    }
  }, [pairs, token1, token2, token1Amount, token2Amount])

  useEffect(() => {
    if (tokens.length && swapTokens.length) {
      setToken1(tokens.filter((t) => swapTokens.indexOf(t.id) >= 0)[0])
      setToken2(tokens.filter((t) => swapTokens.indexOf(t.id) >= 0)[1])
    }
  }, [account, swapTokens, tokens])

  useEffect(() => {
    if (account && token1.id) {
      getTokenBalance(token1, (balance) => {
        setToken1Balance(balance)
      })
    }
  }, [account, token1])

  useEffect(() => {
    if (account && token2.id) {
      getTokenBalance(token2, (balance) => {
        setToken2Balance(balance)
      })
    }
  }, [account, token2])

  function getPairByToken() {
    return pairs.find((p) => (p.token1 === token1.id && p.token2 === token2.id) || (p.token1 === token2.id && p.token2 === token1.id))
  }

  function getTokenBalance(token, cb = () => {}) {
    if (token.name !== 'ONT' && token.name !== 'ONG') {
      const param = {
        scriptHash: token.address,
        operation: 'balanceOf',
        args: [
          {
            type: 'Address',
            value: account,
          },
        ],
      }
      client.api.smartContract.invokeRead(param).then((balance) => {
        if (balance) {
          cb(parseInt(reverseHex(balance), 16) / (10 ** token.decimals))
        }
      })
    } else {
      request({
        method: 'get',
        url: `/v2/addresses/${account}/native/balances`
      }).then((resp) => {
        if (resp.code === 0) {
          const t = resp.result.find((t) => t.asset_name === token.name.toLowerCase())
          cb(t.balance)
        }
      })
      .catch((e) => {
        console.log(e)
      })
    }
  }

  const generateTokenSelection = (type) => {
    if (tokens.length && swapTokens.length) {
      const sTokens = swapTokens.map((t) => tokens.find((tk) => tk.id === t))
      const CustomOption = (props) => (
        <components.Option {...props}>
          <div className="option-wrapper">
            <div className={`icon-${props.label} option-icon`}></div>
            <div className="option-label">{props.label}</div>
          </div>
        </components.Option>
      )
      const SingleValue = ({ children, ...props }) => (
        <components.SingleValue {...props}>
          <div className="option-wrapper">
            <div className={`icon-${children} option-icon`}></div>
            <div className="option-label">{children}</div>
          </div>
        </components.SingleValue>
      )
      const onChangeToken = (type === '1' ? onChangeToken1 : onChangeToken2)
      const defaultToken = type === '1' ? sTokens[0] : sTokens[1]
      return (
        <Select
          className="token-select"
          defaultValue={defaultToken}
          options={sTokens}
          isSearchable={false}
          components={{ Option: CustomOption, SingleValue }}
          onChange={(e) => onChangeToken(e)}
          theme={theme => ({
            ...theme,
            borderRadius: 0,
            colors: {
              ...theme.colors,
              primary: '#2c2c2c',
            },
          })}
        />
      )
    }
  }

  function onChangeToken1(e) {
    if (e.value !== token1.id) {
      setToken1(tokens.filter((t) => t.id === e.value)[0])
      setToken1Amount(0)
      setToken2Amount(0)
    }
  }

  function onChangeToken2(e) {
    if (e.value !== token2.id) {
      setToken2(tokens.filter((t) => t.id === e.value)[0])
      setToken1Amount(0)
      setToken2Amount(0)
    }
  }

  function getPairPrice() {
    if (token1.id && token2.id && pairs.length) {
      let pair = pairs.find((p) => p.token1 === token1.id && p.token2 === token2.id)
      if (pair) {
        return (pair.reserve2 / (10 ** token2.decimals)) / (pair.reserve1 / (10 ** token1.decimals))
      }
      pair = pairs.find((p) => p.token1 === token2.id && p.token2 === token1.id)
      if (pair) {
        return (pair.reserve1 / (10 ** token1.decimals)) / (pair.reserve2 / (10 ** token2.decimals))
      }
    }

    return 0
  }

  function onToken1AmountChange(e) {
    const amount = e.target.value

    setToken1Amount(amount)
    if (tokens.length && pairs.length && !!getPairByToken()) {
      if (amount) {
        setToken2Amount(amount * getPairPrice())
      } else if (amount == 0) {
        setToken2Amount(0)
      }
    }
  }

  function onToken2AmountChange(e) {
    const amount = e.target.value

    setToken2Amount(amount)
    if (tokens.length && pairs.length && !!getPairByToken()) {
      if (amount) {
        setToken2Amount(amount / getPairPrice())
      } else if (amount == 0) {
        setToken2Amount(0)
      }
    }
  }

  function getShareOfPool() {
    if (isFirstProvider) {
      return '100%'
    } else {
      const pair = getPairByToken()
      const amountProduct = token1Amount * (10 ** token1.decimals) * token2Amount * (10 ** token2.decimals)

      if (pair) {
        return `${(amountProduct / (amountProduct + pair.reserve1 * pair.reserve2) * 100).toFixed(2)}%`
      }
      return `0%`
    }
  }

  function onNavigateToPool() {
    history.goBack()
  }

  async function onAdd() {
    if (!account) {
      Alert.show('Please Connect Wallet First')
      return
    }
    if (token1Amount <= 0 || token2Amount <= 0) {
      Alert.error('Amount should be greater than 0')
      return
    }
    if (token1.id && token1.id === token2.id) {
      Alert.error('Input should be different')
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
          value: token1.id
        },
        {
          type: 'Long',
          value: token2.id
        },
        {
          type: 'Long',
          value: new BigNumber(token1Amount).times(new BigNumber(10 ** token1.decimals)).integerValue(BigNumber.ROUND_UP).toString()
        },
        {
          type: 'Long',
          value: new BigNumber(token2Amount).times(new BigNumber(10 ** token2.decimals)).integerValue(BigNumber.ROUND_UP).toString()
        },
        {
          type: 'Long',
          value: new BigNumber(token1Amount).times(new BigNumber(10 ** token1.decimals)).times(1 - SLIPPAGE).integerValue(BigNumber.ROUND_UP).toString()
        },
        {
          type: 'Long',
          value: new BigNumber(token2Amount).times(new BigNumber(10 ** token2.decimals)).times(1 - SLIPPAGE).integerValue(BigNumber.ROUND_UP).toString()
        },
        {
          type: 'Address',
          value: account
        }
      ]
      const addResult = await client.api.smartContract.invokeWasm({
        scriptHash: SWAP_ADDRESS,
        operation: 'add_liquidity',
        args,
        gasPrice: 2500,
        gasLimit: 30000000,
        requireIdentity: false
      })

      if (addResult.transaction) {
        setModal('infoModal', {
          show: true,
          type: 'success',
          text: 'Transaction Successful',
          extraText: 'View Transaction',
          extraLink: `https://explorer.ont.io/transaction/${addResult.transaction}`
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
    <div className="add-liquidity-wrapper">
      <div className="al-header">Add Liquidity
        <div className="back-icon" onClick={() => onNavigateToPool()}></div>
      </div>
      <div className="al-wrapper">
        {
          isValidPair && isFirstProvider ? (
            <div className="first-provider-hint">
              <div><strong>You are the first liquidity provider.</strong><br /><br />The ratio of tokens you add will set the price of this pool.</div>
            </div>
          ) : null
        }
        <div className="form-item">
          <div className="item-title">Input
            <span className="hint">Balance: {token1Balance}</span>
          </div>
          <div className="input-wrapper">
            {generateTokenSelection('1')}
            <input className="input inline-input" value={token1Amount} placeholder="0.0" type="number" onChange={(event) => onToken1AmountChange(event)}></input>
          </div>
        </div>
        <div className="icon-plus"></div>
        <div className="form-item">
          <div className="item-title">Input
            <span className="hint">Balance: {token2Balance}</span>
          </div>
          <div className="input-wrapper">
            {generateTokenSelection('2')}
            <input className="input inline-input" value={token2Amount} placeholder="0.0" type="number" onChange={(event) => onToken2AmountChange(event)}></input>
          </div>
        </div>
        {
          isValidPair && showPriceInfo ? (
            <div className="al-price-wrapper">
              <div className="al-price-item">
                <div className="price-item-detail">{getPairPrice().toFixed(4)}</div>
                <div className="price-item-label">{token2.name} per {token1.name}</div>
              </div>
              <div className="al-price-item">
                <div className="price-item-detail">{(1 / getPairPrice()).toFixed(4)}</div>
                <div className="price-item-label">{token1.name} per {token2.name}</div>
              </div>
              <div className="al-price-item">
                <div className="price-item-detail">{getShareOfPool()}</div>
                <div className="price-item-label">Share of Pool</div>
              </div>
            </div>
          ) : null
        }
        <div className="al-add-btn" onClick={() => onAdd()}>Add</div>
      </div>
    </div>
  )
}

export default AddLiquidity