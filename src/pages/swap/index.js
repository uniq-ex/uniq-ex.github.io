import { client } from '@ont-dev/ontology-dapi'
import React, { useState, useEffect, useCallback } from 'react'
import { useHistory } from "react-router-dom"
import Select, { components } from 'react-select'
import { useMappedState, useDispatch } from 'redux-react-hook';
import { utils } from 'ontology-ts-sdk'
import { useAlert } from 'react-alert'
import BigNumber from 'bignumber.js'
import request from '../../utils/request'
import { SWAP_ADDRESS } from '../../config'
import { useFetchPairs } from '../../hooks/usePair';
import { SLIPPAGE } from '../../utils/constants'
import { toLocaleFixed } from '../../utils/common'
import { bestSwap } from '../../utils/swap'
import './index.css'

const { StringReader, reverseHex } = utils

const Swap = () => {
  const [currentTokenBalance, setCurrentTokenBalance] = useState(0)
  const [swapType, setSwapType] = useState('exactin')
  const [token1, setToken1] = useState({})
  const [token2, setToken2] = useState({})
  const [token1Amount, setToken1Amount] = useState(0)
  const [token2Amount, setToken2Amount] = useState(0)
  const [isValidPair, setIsValidPair] = useState(false)
  const [priceImpact, setPriceImpact] = useState(0)
  const [bestPath, setBestPath] = useState([])
  const [showPrice, setShowPrice] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const { account, pairs, tokens, swapTokens } = useMappedState((state) => ({
    account: state.wallet.account,
    pairs: state.swap.pairs,
    tokens: state.common.tokens,
    swapTokens: state.swap.tokens
  }))
  const dispatch = useDispatch()
  const setModal = useCallback((modalType, modalDetail) => dispatch({ type: 'SET_MODAL', modalType, modalDetail }), [])
  const Alert = useAlert()
  const history = useHistory()

  useFetchPairs()

  useEffect(() => {
    if (token1Amount > 0 && token2Amount > 0) {
      setShowPrice(true)
      setShowInfo(true)
    } else {
      setShowPrice(false)
      setShowInfo(false)
    }
  }, [token1Amount, token2Amount])

  useEffect(() => {
    if (tokens.length && swapTokens.length) {
      const sTokens = swapTokens.map((t) => tokens.find((tk) => tk.id === t))
      setToken1(sTokens[0])
      setToken2(sTokens[1])
    }
  }, [tokens, swapTokens])

  useEffect(() => {
    if (token1.id && token2.id && validPair(token1.id, token2.id)) {
      setIsValidPair(true)
    } else {
      setIsValidPair(false)
    }
  }, [token1, token2])

  useEffect(() => {
    if (account && token1.id) {
      if (token1.name !== 'ONT' && token1.name !== 'ONG') {
        const param = {
          scriptHash: token1.address,
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
            setCurrentTokenBalance(parseInt(reverseHex(balance), 16) / (10 ** token1.decimals))
          }
        })
      } else {
        request({
          method: 'get',
          url: `/v2/addresses/${account}/native/balances`
        }).then((resp) => {
          if (resp.code === 0) {
            const token = resp.result.find((t) => t.asset_name === token1.name.toLowerCase())
            setCurrentTokenBalance(token.balance)
          }
        })
        .catch((e) => {
          console.log(e)
        })
      }
    }
  }, [account, token1])

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
      let defaultToken = type === '1' ? sTokens[0] : sTokens[1]
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

  function validPair(token1, token2) {
    if (pairs.length) {
      if (token1 && token2 && pairs.find((p) => (p.token1 === token1 && p.token2 === token2) || (p.token1 === token2 && p.token2 === token1))) {
        return true
      }
    }
    return false
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

  function onToken1AmountChange(e) {
    const amount = e.target.value

    setSwapType('exactin')
    setToken1Amount(amount)
    if (tokens.length && pairs.length && amount) {
      const inputAmount = amount * (10 ** token1.decimals)
      const [maxOutput, path] = bestSwap('exactin', inputAmount, pairs, token1.id, token2.id)

      setToken2Amount(maxOutput / (10 ** token2.decimals))
      setBestPath(path)
    } else if (amount == 0) {
      setToken2Amount(0)
    }
  }

  function onToken2AmountChange(e) {
    const amount = e.target.value

    setSwapType('exactout')
    setToken2Amount(e.target.value)
    if (tokens.length && pairs.length && amount) {
      const outputAmount = amount * (10 ** token2.decimals)
      const [minInput, path] = bestSwap('exactout', outputAmount, pairs, token1.id, token2.id)

      setToken1Amount(minInput / (10 ** token1.decimals))
      setBestPath(path)
    } else if (amount == 0) {
      setToken1Amount(0)
    }
  }

  function onNavigateToPool() {
    history.push('/pool')
  }

  async function handleSwap() {
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
          value: new BigNumber(token1Amount).times(new BigNumber(10 ** token1.decimals)).integerValue(BigNumber.ROUND_DOWN).toString()
        },
        {
          type: 'Long',
          value: new BigNumber(token2Amount).times(new BigNumber(10 ** token2.decimals)).integerValue(BigNumber.ROUND_DOWN).toString()
        },
        {
          type: 'Array',
          value: bestPath.map((p) => ({ type: 'Long', value: p }))
        },
        {
          type: 'Address',
          value: account
        }
      ]
      const swapResult = await client.api.smartContract.invokeWasm({
        scriptHash: SWAP_ADDRESS,
        operation: swapType === 'exactin' ? 'swap_exact_tokens_for_tokens' : 'swap_tokens_for_exact_tokens',
        args,
        gasPrice: 2500,
        gasLimit: 30000000,
        requireIdentity: false
      })

      if (swapResult.transaction) {
        setModal('infoModal', {
          show: true,
          type: 'success',
          text: 'Transaction Successful',
          extraText: 'View Transaction',
          extraLink: `https://explorer.ont.io/transaction/${swapResult.transaction}`
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

  function getPrice() {
    return `${toLocaleFixed(token2Amount / token1Amount, 6)} ${token2.name} per ${token1.name}`
  }

  function getMinReceiveOrMaxSold() {
    if (swapType === 'exactin') {
      return <p>Minimum Received:<span>{toLocaleFixed(token2Amount * (1 - SLIPPAGE), 6)} {token2.name}</span></p>
    } else {
      return <p>Maximum Sold:<span>{toLocaleFixed(token1Amount * (1 + SLIPPAGE), 6)} {token1.name}</span></p>
    }
  }

  function getPriceImpact() {
    let price
    let pair = pairs.find((p) => p.token1 === token1.id && p.token2 === token2.id)

    if (pair) {
      price = (pair.reserve2 / (10 ** token2.decimals)) / (pair.reserve1 / (10 ** token1.decimals))
    } else {
      pair = pairs.find((p) => p.token1 === token2.id && p.token2 === token1.id)

      if (pair) {
        price = (pair.reserve1 / (10 ** token1.decimals)) / (pair.reserve2 / (10 ** token2.decimals))
      }
    }

    return <p>Price Impact:<span>{Math.abs((token2Amount / token1Amount - price) / price * 100).toFixed(2)}%</span></p>
  }

  function getBestPath() {
    if (bestPath.length) {
      const items = []
      bestPath.map((t, index) => {
        const token = tokens.find((tk) => tk.id === t)
        index > 0 && items.push((<div className="icon-arrow-right"></div>))
        items.push((<div className={`path-icon icon-${token.name}`}>{token.name}</div>))
      })

      return items
    }
  }

  return (
    <div className="sw-wrapper">
      <div className="sw-container">
        <div className="sw-tabs">
          <div className="sw-tab active">Swap</div>
          <div className="sw-tab" onClick={() => onNavigateToPool()}>Pool</div>
        </div>
        <div className="sw-content">
          <div className="form-item">
            <div className="item-title">From
              <span className="hint">Balance: {currentTokenBalance}</span>
            </div>
            <div className="input-wrapper">
              {generateTokenSelection('1')}
              <input className="input inline-input" value={token1Amount} placeholder="0.0" type="number" onChange={(event) => onToken1AmountChange(event)}></input>
            </div>
          </div>
          <div className="icon-arrow-down"></div>
          <div className="form-item">
            <div className="item-title">To</div>
            <div className="input-wrapper">
              {generateTokenSelection('2')}
              <input className="input inline-input" value={token2Amount} placeholder="0.0" type="number" onChange={(event) => onToken2AmountChange(event)}></input>
            </div>
          </div>
          { showPrice ? <div className="sw-price-wrapper">Price<span className="sw-price-info">{getPrice()}</span></div> : null }
          { isValidPair ? null : <div className="add-liquidity-hint">Add liquidity to enable swaps for this pair.</div> }
          { isValidPair ? <div className="sw-swap-btn" onClick={() => handleSwap()}>Swap</div> : <div className="sw-swap-btn disabled">Illiquidity</div> }
        </div>
        {
          showInfo ? (
            <div className="sw-hint-wrapper">
              <div className="sw-input-output">{getMinReceiveOrMaxSold()}</div>
              <div className="sw-price-impact">{getPriceImpact()}</div>
              <div className="sw-best-path">
                <p>Route:</p>
                <div className="sw-best-path-list">
                  {getBestPath()}
                </div>
              </div>
            </div>
          ) : null
        }
      </div>
    </div>
  )
}

export default Swap