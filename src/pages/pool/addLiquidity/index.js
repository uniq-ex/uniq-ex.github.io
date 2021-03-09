import React, { useState, useEffect, useCallback } from 'react'
import { useHistory } from "react-router-dom"
import { useMappedState, useDispatch } from 'redux-react-hook';
import { useAlert } from 'react-alert'
import BigNumber from 'bignumber.js'
import TokenInput from '../../../components/tokenInput'
import { cyanoRequest } from '../../../utils/cyano'
import { useFetchPairs } from '../../../hooks/usePair';
import { TRANSACTION_BASE_URL, TRANSACTION_AFTERFIX } from '../../../config'
import './index.css'

const AddLiquidity = () => {
  const [token1, setToken1] = useState({})
  const [token2, setToken2] = useState({})
  const [token1Amount, setToken1Amount] = useState('')
  const [token2Amount, setToken2Amount] = useState('')
  const [minToken1, setMinToken1] = useState('')
  const [minToken2, setMinToken2] = useState('')
  const [enableAdd, setEnableAdd] = useState(false)
  const [isValidPair, setIsValidPair] = useState(true)
  const [isFirstProvider, setIsFirstProvider] = useState(false)
  const [showPriceInfo, setShowPriceInfo] = useState(false)
  const [balanceChange, setBalanceChange] = useState(0)
  const { account, slippage, pairs, swapTokens, SWAP_ADDRESS } = useMappedState((state) => ({
    account: state.wallet.account,
    slippage: state.wallet.slippage,
    pairs: state.swap.pairs,
    swapTokens: state.swap.tokens,
    SWAP_ADDRESS: state.gov.poolStat.pools.swap.address
  }))
  const dispatch = useDispatch()
  const setModal = useCallback((modalType, modalDetail) => dispatch({ type: 'SET_MODAL', modalType, modalDetail }), [])
  const Alert = useAlert()
  const history = useHistory()

  useFetchPairs()

  useEffect(() => {
    if (token1Amount > 0 && token2Amount > 0) {
      if (Number(minToken1) && new BigNumber(token1Amount).lt(new BigNumber(minToken1))) {
        setEnableAdd(false)
      } else if (Number(minToken2) && new BigNumber(token2Amount).lt(new BigNumber(minToken2))) {
        setEnableAdd(false)
      } else {
        setEnableAdd(true)
      }
    } else {
      setEnableAdd(false)
    }
  }, [token1Amount, token2Amount])

  useEffect(() => {
    if (!token1.id || !token2.id || (token1.id === token2.id)) {
      setIsValidPair(false)
    } else {
      setIsValidPair(true)
    }
  }, [token1, token2])

  useEffect(() => {
    const pair = getPairByToken()
    if (pair) {
      if (token1.id === pair.token1 && Number(pair.min1)) {
        setMinToken1(pair.min1 / (10 ** token1.decimals))
      } else if (token1.id === pair.token2 && Number(pair.min2)) {
        setMinToken1(pair.min2 / (10 ** token1.decimals))
      } else {
        setMinToken1('')
      }

      if (token2.id === pair.token1 && Number(pair.min1)) {
        setMinToken2(pair.min1 / (10 ** token2.decimals))
      } else if (token2.id === pair.token2 && Number(pair.min2)) {
        setMinToken2(pair.min2 / (10 ** token2.decimals))
      } else {
        setMinToken2('')
      }
    } else {
      setMinToken1('')
      setMinToken2('')
    }
  }, [token1, token2])

  useEffect(() => {
    const pair = getPairByToken()
    if (token1.id && token2.id && token1.id !== token2.id && (!pairs.length || !pair || (pair.reserve1 === 0 && pair.reserve2 === 0))) {
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
    if (swapTokens.length) {
      setToken1(swapTokens.find((st) => st.name === (localStorage.getItem('swap_token1') || 'pDAI')))
      setToken2(swapTokens.find((st) => st.name === (localStorage.getItem('swap_token2') || 'UNX')))
    }
  }, [account, swapTokens])

  function getPairByToken() {
    return pairs.find((p) => (p.token1 === token1.id && p.token2 === token2.id) || (p.token1 === token2.id && p.token2 === token1.id))
  }

  function onChangeToken1(token) {
    if (token.id !== token1.id) {
      setToken1(token)
      localStorage.setItem('swap_token1', token.name)
      setToken1Amount('')
      setToken2Amount('')
    }
  }

  function onChangeToken2(token) {
    if (token.id !== token2.id) {
      setToken2(token)
      localStorage.setItem('swap_token2', token.name)
      setToken1Amount('')
      setToken2Amount('')
    }
  }

  function onToken1AmountChange(amount) {
    setToken1Amount(amount)
    if (!isFirstProvider) {
      if (amount) {
        setToken2Amount(new BigNumber(amount).times(getPairPrice()).times(10 ** token2.decimals).integerValue(BigNumber.ROUND_CEIL).div(10 ** token2.decimals).toString())
      } else if (Number(amount) === 0) {
        setToken2Amount('')
      }
    }
  }

  function onToken2AmountChange(amount) {
    setToken2Amount(amount)
    if (!isFirstProvider) {
      if (amount) {
        setToken1Amount(new BigNumber(amount).div(getPairPrice()).times(10 ** token1.decimals).integerValue(BigNumber.ROUND_CEIL).div(10 ** token1.decimals).toString())
      } else if (Number(amount) === 0) {
        setToken1Amount('')
      }
    }
  }

  function getPairPrice() {
    if (token1.id && token2.id && pairs.length) {
      if (isFirstProvider && token1Amount && token2Amount) {
        return token2Amount / token1Amount
      }
      let pair = pairs.find((p) => p.token1 === token1.id && p.token2 === token2.id)
      if (pair) {
        return pair.reserve1 ? new BigNumber(pair.reserve2).div(10 ** token2.decimals).div(pair.reserve1).times(10 ** token1.decimals) : 0
      }
      pair = pairs.find((p) => p.token1 === token2.id && p.token2 === token1.id)
      if (pair) {
        return pair.reserve2 ? new BigNumber(pair.reserve1).div(10 ** token1.decimals).div(pair.reserve2).times(10 ** token2.decimals) : 0
      }
    }

    return 0
  }

  function getShareOfPool() {
    if (isFirstProvider) {
      return '100%'
    } else {
      const pair = getPairByToken()
      const amountProduct = new BigNumber(token1Amount || 0).times(10 ** token1.decimals).times(token2Amount || 0).times(10 ** token2.decimals)

      if (pair) {
        return `${amountProduct.times(100).div(new BigNumber(pair.reserve1).times(pair.reserve2).plus(amountProduct)).toFixed(2)}%`
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

    if (SWAP_ADDRESS) {
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
            value: new BigNumber(token1Amount).times(new BigNumber(10 ** token1.decimals)).times(1 - slippage / 100).integerValue(BigNumber.ROUND_UP).toString()
          },
          {
            type: 'Long',
            value: new BigNumber(token2Amount).times(new BigNumber(10 ** token2.decimals)).times(1 - slippage / 100).integerValue(BigNumber.ROUND_UP).toString()
          },
          {
            type: 'Address',
            value: account
          }
        ]
        const addResult = await cyanoRequest('smartContract.invokeWasm', {
          scriptHash: SWAP_ADDRESS,
          operation: 'add_liquidity',
          args,
          gasPrice: 2500,
          gasLimit: 60000000,
          requireIdentity: false
        })

        if (addResult.transaction) {
          setBalanceChange(balanceChange + 1)
          setToken1Amount('')
          setToken2Amount('')
          onNavigateToPool()
          setModal('infoModal', {
            show: true,
            type: 'success',
            text: 'Transaction Successful',
            extraText: 'View Transaction',
            extraLink: `${TRANSACTION_BASE_URL}${addResult.transaction}${TRANSACTION_AFTERFIX}`
          })
        }
      } catch (e) {
        setModal('infoModal', {
          show: true,
          type: 'error',
          text: 'Transaction Failed',
          // extraText: `${e}`,
          extraText: '',
          extraLink: ''
        })
      }
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
        <TokenInput
          balanceChange={balanceChange}
          tokens={swapTokens}
          value={token1Amount}
          defaultToken={swapTokens.length && swapTokens.find((st) => st.name === (localStorage.getItem('swap_token1') || 'pDAI'))}
          onTokenChange={(token) => onChangeToken1(token)}
          onAmountChange={(amount) => onToken1AmountChange(amount)} />
        { Number(minToken1) ? <div className="min-amount-hint">(Minimum: {minToken1})</div> : null }
        <div className="icon-plus"></div>
        <TokenInput
          balanceChange={balanceChange}
          tokens={swapTokens}
          value={token2Amount}
          defaultToken={swapTokens.length && swapTokens.find((st) => st.name === (localStorage.getItem('swap_token2') || 'UNX'))}
          onTokenChange={(token) => onChangeToken2(token)}
          onAmountChange={(amount) => onToken2AmountChange(amount)} />
        { Number(minToken2) ? <div className="min-amount-hint">(Minimum: {minToken2})</div> : null }
        {
          isValidPair && showPriceInfo ? (
            <div className="al-price-wrapper">
              <div className="al-price-item">
                <div className="price-item-detail">{getPairPrice().toFixed(4)}</div>
                <div className="price-item-label">{token2.name} per {token1.name}</div>
              </div>
              <div className="al-price-item">
                <div className="price-item-detail">{(getPairPrice() ? 1 / getPairPrice() : 0).toFixed(4)}</div>
                <div className="price-item-label">{token1.name} per {token2.name}</div>
              </div>
              <div className="al-price-item">
                <div className="price-item-detail">{getShareOfPool()}</div>
                <div className="price-item-label">Share of Pool</div>
              </div>
            </div>
          ) : null
        }
        {
          enableAdd ? (
            <div className="al-add-btn" onClick={() => onAdd()}>Add</div>
          ) : (
            <div className="al-add-btn disabled">Add</div>
          )
        }
      </div>
    </div>
  )
}

export default AddLiquidity
