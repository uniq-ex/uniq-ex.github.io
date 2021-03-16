import React, { useState, useEffect, useCallback } from 'react'
import { useHistory } from "react-router-dom"
import { useMappedState, useDispatch } from 'redux-react-hook'
import { useAlert } from 'react-alert'
import BigNumber from 'bignumber.js'
import { useTranslation } from 'react-i18next'
import TokenInput from '../../components/tokenInput'
import { TRANSACTION_BASE_URL, TRANSACTION_AFTERFIX } from '../../config'
import { useFetchPairs } from '../../hooks/usePair'
import { cyanoRequest } from '../../utils/cyano'
import { toLocaleFixed } from '../../utils/common'
import { bestSwap } from '../../utils/swap'
import './index.css'

const Swap = () => {
  const [balanceChange, setBalanceChange] = useState(0)
  const { account, slippage, pairs, tokens: swapTokens, swapType, token1, token2, token1Amount, token2Amount, isValidPair, isValidSwap, bestPath, showPrice, SWAP_ADDRESS } = useMappedState((state) => ({
    account: state.wallet.account,
    slippage: state.wallet.slippage,
    ...state.swap,
    SWAP_ADDRESS: state.gov.poolStat.pools.swap.address
  }))
  const dispatch = useDispatch()
  const setModal = useCallback((modalType, modalDetail) => dispatch({ type: 'SET_MODAL', modalType, modalDetail }), [])
  const setSwapType = useCallback((swapType) => dispatch({ type: 'SET_SWAP_TYPE', swapType }), [])
  const setToken1 = useCallback((token1) => dispatch({ type: 'SET_SWAP_TOKEN1', token1 }), [])
  const setToken2 = useCallback((token2) => dispatch({ type: 'SET_SWAP_TOKEN2', token2 }), [])
  const setToken1Amount = useCallback((token1Amount) => dispatch({ type: 'SET_TOKEN1_AMOUNT', token1Amount }), [])
  const setToken2Amount = useCallback((token2Amount) => dispatch({ type: 'SET_TOKEN2_AMOUNT', token2Amount }), [])
  const setIsValidPair = useCallback((isValidPair) => dispatch({ type: 'SET_IS_VALID_PAIR', isValidPair }), [])
  const setIsValidSwap = useCallback((isValidSwap) => dispatch({ type: 'SET_IS_VALID_SWAP', isValidSwap }), [])
  const setBestPath = useCallback((bestPath) => dispatch({ type: 'SET_SWAP_BEST_PATH', bestPath }), [])
  const setShowPrice = useCallback((showPrice) => dispatch({ type: 'SET_SWAP_SHOW_RPICE', showPrice }), [])

  const Alert = useAlert()
  const history = useHistory()
  const [t] = useTranslation()

  useFetchPairs()

  useEffect(() => {
    if (token1.id !== token2.id && token1Amount > 0 && token2Amount > 0 && bestPath.length) {
      setShowPrice(true)
      setIsValidSwap(true)
    } else {
      setShowPrice(false)
      setIsValidSwap(false)
    }
  }, [token1, token2, token1Amount, token2Amount, bestPath])

  useEffect(() => {
    if (swapTokens.length) {
      setToken1(swapTokens.find((st) => st.name === (localStorage.getItem('swap_token1') || 'pDAI')))
      setToken2(swapTokens.find((st) => st.name === (localStorage.getItem('swap_token2') || 'UNX')))
    }
  }, [swapTokens])

  useEffect(() => {
    if (token1.id && token2.id && validPair(token1.id, token2.id)) {
      setIsValidPair(true)
    } else {
      setIsValidPair(false)
    }
  }, [token1, token2])

  function validPair(token1, token2) {
    if (pairs.length) {
      if (token1 && token2 && pairs.find((p) => (p.token1 === token1 && p.token2 === token2) || (p.token1 === token2 && p.token2 === token1))) {
        return true
      }
    }
    return false
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
    if (amount !== token1Amount) {
      setSwapType('exactin')
      setToken1Amount(amount)
      if (isValidPair && amount) {
        const inputAmount = new BigNumber(amount).times(10 ** token1.decimals).toString()
        const [maxOutput, path] = bestSwap('exactin', inputAmount, pairs, token1.id, token2.id)

        setToken2Amount(new BigNumber(maxOutput).div(10 ** token2.decimals).toString())
        setBestPath(path)
      } else if (Number(amount) === 0) {
        setToken2Amount('')
      }
    }
  }

  function onToken2AmountChange(amount) {
    if (amount !== token2Amount) {
      setSwapType('exactout')
      setToken2Amount(amount)
      if (isValidPair && amount) {
        const outputAmount = amount * (10 ** token2.decimals)
        const [minInput, path] = bestSwap('exactout', outputAmount, pairs, token1.id, token2.id)

        if (minInput === Infinity) {
          setToken1Amount('')
        } else {
          setToken1Amount(new BigNumber(minInput).div(10 ** token1.decimals).toString())
        }
        setBestPath(path)
      } else if (Number(amount) === 0) {
        setToken1Amount('')
      }
    }
  }

  function onNavigateToPool() {
    history.push('/pool')
  }

  async function handleSwap() {
    if (!account) {
      Alert.show(t('connect_wallet_first'))
      return
    }
    if (token1Amount <= 0 || token2Amount <= 0) {
      Alert.error(t('amount_gt_0'))
      return
    }
    if (token1.id && token1.id === token2.id) {
      Alert.error(t('input_should_be_different'))
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
        const swapResult = await cyanoRequest('smartContract.invokeWasm', {
          scriptHash: SWAP_ADDRESS,
          operation: swapType === 'exactin' ? 'swap_exact_tokens_for_tokens' : 'swap_tokens_for_exact_tokens',
          args,
          gasPrice: 2500,
          gasLimit: 60000000,
          requireIdentity: false
        })

        if (swapResult.transaction) {
          setBalanceChange(balanceChange + 1)
          setToken1Amount('')
          setToken2Amount('')
          setModal('infoModal', {
            show: true,
            type: 'success',
            text: t('transaction_successful'),
            extraText: t('view_transaction'),
            extraLink: `${TRANSACTION_BASE_URL}${swapResult.transaction}${TRANSACTION_AFTERFIX}`
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

  function getPrice() {
    return `${toLocaleFixed(token2Amount / token1Amount, 6)} ${token2.name} per ${token1.name}`
  }

  function getMinReceiveOrMaxSold() {
    if (swapType === 'exactin') {
      return <p>{t('minimum_received')}:<span>{toLocaleFixed(token2Amount * (1 - slippage / 100), 6)} {token2.name}</span></p>
    } else {
      return <p>{t('maximum_sold')}:<span>{toLocaleFixed(token1Amount * (1 + slippage / 100), 6)} {token1.name}</span></p>
    }
  }

  function getPriceImpact() {
    let price
    let pair = pairs.find((p) => p.token1 === token1.id && p.token2 === token2.id)

    if (pair) {
      price = new BigNumber(pair.reserve2).div(10 ** token2.decimals).div(pair.reserve1).times(10 ** token1.decimals).toString()
    } else {
      pair = pairs.find((p) => p.token1 === token2.id && p.token2 === token1.id)

      if (pair) {
        price = new BigNumber(pair.reserve1).div(10 ** token1.decimals).div(pair.reserve2).times(10 ** token2.decimals).toString()
      }
    }

    return <p>{t('price_impact')}:<span>{Math.abs((token2Amount / token1Amount - price) / price * 100).toFixed(2)}%</span></p>
  }

  function getBestPath() {
    if (bestPath.length) {
      const items = []
      bestPath.map((t, index) => {
        const token = swapTokens.find((tk) => tk.id === t)
        index > 0 && items.push((<div className="icon-arrow-right"></div>))
        items.push((<div className={`path-icon icon-${token.name}`}>{token.name}</div>))

        return t
      })

      return items
    }
  }

  return (
    <div className="sw-wrapper">
      <div className="sw-container">
        <div className="sw-tabs">
          <div className="sw-tab active">{t('swap')}</div>
          <div className="sw-tab" onClick={() => onNavigateToPool()}>{t('pool')}</div>
        </div>
        <div className="sw-content">
          <TokenInput
            balanceChange={balanceChange}
            label={t('from')}
            tokens={swapTokens}
            value={token1Amount}
            round='up'
            defaultToken={swapTokens.length && swapTokens.find((st) => st.name === (localStorage.getItem('swap_token1') || 'pDAI'))}
            onTokenChange={(token) => onChangeToken1(token)}
            onAmountChange={(amount) => onToken1AmountChange(amount)} />
          <div className="icon-arrow-down"></div>
          <TokenInput
            balanceChange={balanceChange}
            label={t('to')}
            tokens={swapTokens}
            value={token2Amount}
            round='down'
            defaultToken={swapTokens.length && swapTokens.find((st) => st.name === (localStorage.getItem('swap_token2') || 'UNX'))}
            onTokenChange={(token) => onChangeToken2(token)}
            onAmountChange={(amount) => onToken2AmountChange(amount)} />
          { showPrice ? <div className="sw-price-wrapper">Price<span className="sw-price-info">{getPrice()}</span></div> : null }
          { isValidPair ? null : <div className="add-liquidity-hint">{t('add_liquidity_enable_swap')}</div> }
          { isValidPair ? ( isValidSwap ? <div className="sw-swap-btn" onClick={() => handleSwap()}>{t('swap')}</div> : <div className="sw-swap-btn disabled">{t('swap')}</div> ) : <div className="sw-swap-btn disabled">{t('invalide_liquidity')}</div> }
        </div>
        {
          isValidPair && isValidSwap ? (
            <div className="sw-hint-wrapper">
              <div className="sw-input-output">{getMinReceiveOrMaxSold()}</div>
              <div className="sw-price-impact">{getPriceImpact()}</div>
              <div className="sw-best-path">
                <p>{t('route')}:</p>
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
