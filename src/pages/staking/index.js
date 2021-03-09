import React, { useState, useEffect, useCallback } from 'react'
import { useHistory } from "react-router-dom"
import { utils } from 'ontology-ts-sdk'
import BigNumber from 'bignumber.js'
import Tooltip from 'rc-tooltip'
import { useAlert } from 'react-alert'
import { useMappedState, useDispatch } from 'redux-react-hook'
import { cyanoRequest } from '../../utils/cyano'
import { DAI_PRICE } from '../../utils/constants'
import { GOVERNANCE_ADDRESS } from '../../config'
import { useFetchPairs } from '../../hooks/usePair'
import { readBigNumberUint128, getTokenIconDom } from '../../utils/token'

import './index.css'

const { StringReader } = utils

const Staking = () => {
  const [showClosedEntry, setShowClosedEntry] = useState(false)
  const [showClosed, setShowClosed] = useState(false)
  const [unxPrice, setUnxPrice] = useState(0)
  const [tokenPrices, setTokenPrices] = useState({})
  const { account, tokens, stakingTokens, poolStat, pairs, stakingPoolWeightRatio, STAKING_ADDRESS } = useMappedState((state) => ({
    account: state.wallet.account,
    tokens: state.common.tokens,
    stakingTokens: state.staking.tokens,
    poolStat: state.gov.poolStat,
    pairs: state.swap.pairs,
    stakingPoolWeightRatio: state.gov.poolStat.pools.staking.ratio,
    STAKING_ADDRESS: state.gov.poolStat.pools.staking.address
  }))
  const dispatch = useDispatch()
  const setStakingTokens = useCallback((tokens) => dispatch({ type: 'SET_STAKING_TOKENS', tokens }), [])
  const history = useHistory()
  const Alert = useAlert()

  useFetchPairs()

  useEffect(() => {
    if (pairs.length && (!unxPrice || unxPrice === '0')) {
      const unxTk = tokens.find((t) => t.name === 'UNX')
      const daiTk = tokens.find((t) => t.name === 'pDAI')
      const pair = pairs.find((p) => (p.token1 === unxTk.id && p.token2 === daiTk.id) || (p.token2 === unxTk.id && p.token1 === daiTk.id))

      if (pair) {
        if (pair.token1 === unxTk.id) {
          setUnxPrice(new BigNumber(pair.reserve2).div(10 ** daiTk.decimals).div(pair.reserve1).times(10 ** unxTk.decimals).times(DAI_PRICE).toString())
        } else {
          setUnxPrice(new BigNumber(pair.reserve1).div(10 ** daiTk.decimals).div(pair.reserve2).times(10 ** unxTk.decimals).times(DAI_PRICE).toString())
        }
      }
    }
  }, [pairs, tokens])

  useEffect(() => {
    getStakingTokenPrice()
    let interval = setInterval(getStakingTokenPrice, 3000)
    return () => {
      interval && clearInterval(interval)
    }
  }, [stakingTokens])

  useEffect(() => {
    getStakingTokenBalance()
    let interval = setInterval(getStakingTokenBalance, 3000)
    return () => {
      interval && clearInterval(interval)
    }
  }, [tokens, STAKING_ADDRESS])

  useEffect(() => {
    if (stakingTokens.filter((st) => !st.originWeight).length) {
      setShowClosedEntry(true)
    } else {
      setShowClosedEntry(false)
    }
  }, [stakingTokens])

  async function getStakingTokenPrice() {
    if (stakingTokens.length) {
      try {
        const unxToken = tokens.find((t) => t.name === 'UNX')
        const parsedTokenPrices = {}
        const LPTokens = stakingTokens.filter((st) => st.ty === 3)
        const nonLPTokens = stakingTokens.filter((st) => st.ty !== 3)
        const tokenIds = nonLPTokens.map((t) => t.id)
        
        LPTokens.map((lpt) => {
          const tokenNames = lpt.name.split('-').filter((t) => t !== 'LP' && t !== 'UNX')

          tokenNames.map((tn) => {
            const tokenId = tokens.find((t) => t.name === tn).id
          
            if (tokenIds.indexOf(tokenId) < 0) {
              tokenIds.push(tokenId)
            }
          })
        })

        const args = [
          {
            type: 'Array',
            value: tokenIds.map((id) => ({ type: 'Long', value: id }))
          }
        ]
        const tokenPriceStr = await cyanoRequest('smartContract.invokeWasmRead', {
          scriptHash: GOVERNANCE_ADDRESS,
          operation: 'token_prices',
          args
        })
        const strReader = new StringReader(tokenPriceStr)
        const tokenCount = strReader.readNextLen()
        for (let i = 0; i < tokenCount; i++) {
          parsedTokenPrices[tokenIds[i]] = readBigNumberUint128(strReader)
        }

        LPTokens.map((lpt) => {
          const tokenNames = lpt.name.split('-').filter((t) => t !== 'LP')
          const token1 = tokens.find((t) => t.name === tokenNames[0])
          const token2 = tokens.find((t) => t.name === tokenNames[1])
          const pair = pairs.find((p) => (p.token1 === token1.id && p.token2 === token2.id) || p.token1 === token2.id && p.token2 === token1.id)

          if (pair) {
            let value = new BigNumber(0)
            if (token1.name === 'UNX' || token2.name === 'UNX') {
              const nonUnxToken = (token1.name === 'UNX') ? token2 : token1

              if (pair.token1 === unxToken.id) {
                value = value.plus(new BigNumber(pair.reserve2).div(10 ** nonUnxToken.decimals).times(parsedTokenPrices[pair.token2]).times(2))
              } else {
                value = value.plus(new BigNumber(pair.reserve1).div(10 ** nonUnxToken.decimals).times(parsedTokenPrices[pair.token1]).times(2))
              }
            } else {
              if (pair.token1 === token1.id) {
                value  = value.plus(new BigNumber(pair.reserve1).div(10 ** token1.decimals).times(parsedTokenPrices[pair.token1])).plus(new BigNumber(pair.reserve2).div(10 ** token2.decimals).times(parsedTokenPrices[pair.token2]))
              } else {
                value  = value.plus(new BigNumber(pair.reserve1).div(10 ** token2.decimals).times(parsedTokenPrices[pair.token1])).plus(new BigNumber(pair.reserve2).div(10 ** token1.decimals).times(parsedTokenPrices[pair.token2]))
              }
            }

            parsedTokenPrices[lpt.id] = value.div(pair.lp).times(10 ** 18).toString()
          }
        })
        
        setTokenPrices(parsedTokenPrices)
      } catch (e) {
        console.log(e)
      }
    }
  }

  async function getStakingTokenBalance() {
    if (tokens.length && STAKING_ADDRESS) {
      try {
        const statStr = await cyanoRequest('smartContract.invokeWasmRead', {
          scriptHash: STAKING_ADDRESS,
          operation: 'stat',
          args: []
        })
        const parsedTokens = []
        const strReader = new StringReader(statStr)
        const tokenCount = strReader.readNextLen()
        for (let i = 0; i < tokenCount; i++) {
          const token = {}
          token.id = strReader.readUint128()
          const tempToken = tokens.find((t) => t.id === token.id)
          token.weight = strReader.readUint128()
          token.balance = readBigNumberUint128(strReader)

          parsedTokens.push(Object.assign({}, tempToken, token))
        }

        const totalWeight = parsedTokens.filter((t) => t.balance).reduce((a, b) => a + b.weight, 0)
        const filteredTokens = parsedTokens.map((t) => {
          return {
            ...t,
            originWeight: t.weight,
            weight: t.balance ? (t.weight / totalWeight) : 0
          }
        })

        setStakingTokens(filteredTokens)
      } catch (e) {
        console.log(e)
      }
    }
  }

  function onSelectToken(token) {
    if (!account) {
      Alert.show('Please Connect Wallet First')
      return
    }
    history.push(`/staking/${token.id}`)
  }

  function getTip(token) {
    return `${token.name} is the hidden receipt for WING ${token.name.replace('f', '')} suppliers`
  }

  function generateStakingPool() {
    if (stakingTokens.length) {
      const openStakingTokens = stakingTokens.filter((t) => !!t.originWeight)
      const closedStakingTokens = stakingTokens.filter((t) => !t.originWeight)

      return (showClosed ? closedStakingTokens : openStakingTokens).map((token) => {
        const unxAmount = new BigNumber(poolStat.distributionInfo.amount || 0)
          .div(poolStat.distributionInfo.period || 1)
          .times(86400 * 365)
          .times(stakingPoolWeightRatio || 0)
          .times(token.weight)
        const tokenAPY = tokenPrices[token.id] ? unxAmount
          .times(unxPrice)
          .times(10 ** 12)
          .div(tokenPrices[token.id])
          .div(token.balance)
          .times(10 ** token.decimals)
          .times(100)
          .toFixed(2) : 0

        return (
          <div className={`pool-list-item ${!showClosed ? '' : 'pool-list-item-disabled'}`} key={token.name}>
            <div className="item-detail">
              <div className="item-detail-wrapper">
                { token.ty === 3 && <div className="corner-badge">10X</div> }
                <div className="staking-token">
                  {
                    token.ty === 3 ? (
                      <div className="staking-text">Deposit
                        {getTokenIconDom(token, 'stake-lp-token')}
                      </div>
                    ) : (
                      <div className={`staking-text icon-${token.name}`}>Deposit</div>
                    )
                  }
                  {
                    token.name.startsWith('f') ? (
                      <Tooltip placement="top" overlay={getTip(token)}>
                        <div className="staking-token-name">{token.name}</div>
                      </Tooltip>
                    ) : <div className="staking-token-name">{token.name}</div>
                  }
                </div>
                <div className="earn-line">Earn<span>UNX</span></div>
                <div className="earn-line">APY<span>{tokenAPY}%</span></div>
                <div className="total-staking">Total Staking<span>{new BigNumber(token.balance || 0).div(10 ** token.decimals).toString()}</span></div>
                <div className="select-btn" onClick={() => onSelectToken(token)}>{ showClosed ? 'Unstake' : 'Stake' }</div>
              </div>
            </div>
          </div>
        )
      })
    }
  }

  return (
    <div className="stake-container">
      <div className="stake-pool">
        { !stakingTokens.length ? <div className="title">Loading...</div> : null }
        {
          showClosed ? (
            <div className="unstake-pool-title">
              <div className="back-icon" onClick={() => setShowClosed(false)}></div>
              Unstake from Closed Pool
            </div>
          ) : null
        }
        <div className="pool-list">
          {generateStakingPool()}
        </div>
        { showClosedEntry ? <div className="closed-pool-entrance" onClick={() => setShowClosed(true)}>Unstake from Closed Pool</div> : null }
      </div>
    </div>
  )
}

export default Staking