import React, { useEffect, useCallback } from 'react'
import { useHistory } from "react-router-dom"
import { useMappedState, useDispatch } from 'redux-react-hook';
import { utils } from 'ontology-ts-sdk'
import BigNumber from 'bignumber.js'
import { useTranslation } from 'react-i18next'
import { cyanoRequest } from '../../utils/cyano'
import { readBigNumberUint128 } from '../../utils/token'
import { useFetchPairs } from '../../hooks/usePair'
import './index.css'

const { StringReader } = utils

const Pool = () => {
  const { account, tokens, pairs, liquidityBalance, SWAP_ADDRESS } = useMappedState((state) => ({
    account: state.wallet.account,
    tokens: state.common.tokens,
    pairs: state.swap.pairs,
    ...state.pool,
    SWAP_ADDRESS: state.gov.poolStat.pools.swap.address
  }))
  const dispatch = useDispatch()
  const setLiquidityBalance = useCallback((liquidityBalance) => dispatch({ type: 'SET_POOL_LIQUIDITY_BALANCE', liquidityBalance }), [])

  const history = useHistory()
  const [t] = useTranslation()

  useFetchPairs()

  useEffect(() => {
    if (account && pairs.length && SWAP_ADDRESS) {
      const getLiquidityBalanceByPairId = (id) => {
        return cyanoRequest('smartContract.invokeWasmRead', {
          scriptHash: SWAP_ADDRESS,
          operation: 'balanceOf',
          args: [
            {
              type: 'Long',
              value: id
            },
            {
              type: 'Address',
              value: account
            }
          ]
        }).then((resp) => {
          const strReader = new StringReader(resp)
          const balance = readBigNumberUint128(strReader)
          
          return { [id]: balance }
        })
      }
      Promise.all(pairs.map((p) => getLiquidityBalanceByPairId(p.id))).then((resp) => {
        setLiquidityBalance(resp)
      })
    }
  }, [account, pairs, SWAP_ADDRESS])

  function onNavigateToSwap() {
    history.push('/swap')
  }

  function onNavigateToAddLiquidity() {
    history.push('/pool/add')
  }

  function onRemoveLiquidity(pairId) {
    history.push(`/pool/remove/${pairId}`)
  }

  function generateLiquidityList() {
    const myLiquidities = liquidityBalance.filter((l) => l[Object.keys(l)[0]])
    if (myLiquidities.length && pairs.length && tokens.length) {
      return myLiquidities.map((lb) => {
        const pairId = Object.keys(lb)[0]
        const pair = pairs.find((p) => `${p.id}` === pairId)
        const token1 = tokens.find((t) => t.id === pair.token1)
        const token2 = tokens.find((t) => t.id === pair.token2)
        const balance = new BigNumber(lb[pairId])
        const shareOfPool = balance.div(pair.lp)
        const token1Amount = shareOfPool.times(pair.reserve1).div(10 ** token1.decimals).toFixed(token1.decimals)
        const token2Amount = shareOfPool.times(pair.reserve2).div(10 ** token2.decimals).toFixed(token2.decimals)
        
        return (
          <div className="pool-liquidity-item">
            <div className="liquidity-item-detail">
              <div className={`token-icon icon-${token1.name}`}></div>
              <div className={`token-icon icon-${token2.name}`}></div>
              <div className="token-pair"><strong>{token1.name}/{token2.name}</strong></div>
              <div className="pair-position"><strong>{t('pooled')}</strong>: {token1Amount} / {token2Amount}</div>
              <div className="pool-tokens"><strong>{t('lp_tokens')}</strong>: {balance.div(10 ** 18).toString()}</div>
            </div>
            <div className="remove-liquidity-btn" onClick={() => onRemoveLiquidity(pairId)}>{t('remove')}</div>
          </div>
        )
      })
    } else {
      return <div className="pool-empty-lp">{t('no_liquidities')}</div>
    }
  }

  return (
    <div className="pool-wrapper">
      <div className="pool-container">
        <div className="sw-tabs">
          <div className="sw-tab" onClick={() => onNavigateToSwap()}>{t('swap')}</div>
          <div className="sw-tab active">{t('pool')}</div>
        </div>
        <div className="pool-content">
          <div className="pool-add-liquidity-btn" onClick={() => onNavigateToAddLiquidity()}>{t('add_liquidity')}</div>
          <div className="pool-liquidity-list">
            <div className="my-liquidity">{t('your_liquidity')}</div>
            {generateLiquidityList()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Pool