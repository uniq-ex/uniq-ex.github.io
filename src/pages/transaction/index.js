import { client } from '@ont-dev/ontology-dapi'
import React, { useState, useEffect, useCallback } from 'react'
import { utils } from 'ontology-ts-sdk'
import BigNumber from 'bignumber.js'
import { useAlert } from 'react-alert'
import { useMappedState, useDispatch } from 'redux-react-hook';
import { readBigNumberUint128, getTokenBalance } from '../../utils/token'
import Input from '../../components/input'
import { cyanoRequest } from '../../utils/cyano'
import { handleError } from '../../utils/errorHandle'
import { getHashString } from '../../utils/common'
import { PRICE_DECIMALS } from '../../utils/constants'
import { TRANSACTION_BASE_URL, TRANSACTION_AFTERFIX } from '../../config'
import './index.css'

const { StringReader } = utils

const Transaction = () => {
  const [pairNameKeyword, setPairNameKeyword] = useState('')
  const [showPairSelectModal, setShowPairSelectModal] = useState(false)
  const { account, stopInterval, tokens, makes, myMakes, pairs, tradeType, tokenPair, makeView, pool, lastPrice, feeRate, isValid, tokenBalance, price, amount, total, CONTRACT_ADDRESS } = useMappedState((state) => ({
    account: state.wallet.account,
    stopInterval: state.common.stopInterval,
    tokens: state.common.tokens,
    ...state.trade,
    CONTRACT_ADDRESS: state.gov.poolStat.pools.dex.address
  }))
  const dispatch = useDispatch()
  const setModal = useCallback((modalType, modalDetail) => dispatch({ type: 'SET_MODAL', modalType, modalDetail }), [])
  const setStopInterval = useCallback((stopInterval) => dispatch({ type: 'SET_STOP_INTERVAL', stopInterval }), [])
  const setMakes = useCallback((makes) => dispatch({ type: 'SET_TRADE_MAKES', makes }), [])
  const setMyMakes = useCallback((myMakes) => dispatch({ type: 'SET_TRADE_MY_MAKES', myMakes }), [])
  const setPairs = useCallback((pairs) => dispatch({ type: 'SET_TRADE_PAIRS', pairs }), [])
  const setTokenPair = useCallback((tokenPair) => dispatch({ type: 'SET_TRADE_TOKEN_PAIR', tokenPair }), [])
  const setTradeType = useCallback((tradeType) => dispatch({ type: 'SET_TRADE_TYPE', tradeType }), [])
  const setMakeView = useCallback((makeView) => dispatch({ type: 'SET_TRADE_MAKE_VIEW', makeView }), [])
  const setPool = useCallback((pool) => dispatch({ type: 'SET_TRADE_POOL', pool }), [])
  const setLastPrice = useCallback((lastPrice) => dispatch({ type: 'SET_TRADE_LAST_PRICE', lastPrice }), [])
  const setFeeRate = useCallback((feeRate) => dispatch({ type: 'SET_TRADE_FEE_RATE', feeRate }), [])
  const setIsValid = useCallback((isValid) => dispatch({ type: 'SET_TRADE_IS_VALID', isValid }), [])
  const setTokenBalance = useCallback((tokenBalance) => dispatch({ type: 'SET_TRADE_TOKEN_BALANCE', tokenBalance }), [])
  const setPrice = useCallback((price) => dispatch({ type: 'SET_TRADE_PRICE', price }), [])
  const setAmount = useCallback((amount) => dispatch({ type: 'SET_TRADE_AMOUNT', amount }), [])
  const setTotal = useCallback((total) => dispatch({ type: 'SET_TRADE_TOTAL', total }), [])

  const Alert = useAlert()

  const urlPairName = decodeURIComponent(getHashString(window.location.hash, 'pair') || '') || (localStorage.getItem('trade_token_pair') || '')

  useEffect(() => {
    if (pairs.length && !tokenPair.name) {
      setTokenPair(pairs.find((p) => p.name === `${urlPairName}`) || pairs.find((p) => p.name === 'pDAI/UNX') || pairs.find((p) => p.name === 'UNX/pDAI'))
    }
  }, [pairs])

  useEffect(() => {
    if (account && tokenPair.name) {
      getTokenBalance(account, tradeType === 'buy' ? tokenPair.tokens[1] : tokenPair.tokens[0], (bl) => {
        setTokenBalance(bl)
      })
    }
  }, [account, tokenPair, tradeType])

  useEffect(() => {
    async function getMakesOfPair() {
      if (tokenPair.name && CONTRACT_ADDRESS) {
        try {
          const makeStr = await cyanoRequest('smartContract.invokeWasmRead', {
            scriptHash: CONTRACT_ADDRESS,
            operation: 'get_makes_of_pair',
            args: [
              {
                type: 'Long',
                value: tokenPair.tokens[0].id
              },
              {
                type: 'Long',
                value: tokenPair.tokens[1].id
              }
            ]
          })
          const parsedMakes = []
          const strReader = new StringReader(makeStr)
          const pairLastPrice = strReader.readUint128()
  
          for (let j = 0; j <= 1; j++) {
            const makeCount = strReader.readNextLen()
            for (let i = 0; i < makeCount; i++) {
              const make = {}
              make.make_id = strReader.readUint128()
              make.price = strReader.readUint128()
              make.amount = new BigNumber(strReader.readUint128()).toString()
              make.asset_token_id = (j === 0 ? tokenPair.tokens[0].id : tokenPair.tokens[1].id)
              make.price_token_id = (j === 0 ? tokenPair.tokens[1].id : tokenPair.tokens[0].id)
      
              parsedMakes.push(make)
            }
          }
  
          setLastPrice(pairLastPrice ? new BigNumber(pairLastPrice).div(PRICE_DECIMALS).toString() : 0)
          setMakes(parsedMakes)
        } catch (e) {
          handleError(e, (errorCode) => {
            if (errorCode === 'CONTRACT_ADDRESS_ERROR') {
              setStopInterval(true)
            } else {
              console.log('get makes of pair', e)
            }
          })
        }
      }
    }
    getMakesOfPair()
    const interval = !stopInterval && setInterval(getMakesOfPair, 2000)
    return () => {
      interval && clearInterval(interval)
    }
  }, [tokenPair, account, stopInterval, CONTRACT_ADDRESS])

  useEffect(() => {
    async function getUserMakes() {
      if (account && CONTRACT_ADDRESS) {
        try {
          const makeStr = await cyanoRequest('smartContract.invokeWasmRead', {
            scriptHash: CONTRACT_ADDRESS,
            operation: 'get_user_makes',
            args: [
              {
                type: 'Address',
                value: account
              }
            ]
          })
          const parsedMakes = []
          const strReader = new StringReader(makeStr)
          const makeCount = strReader.readNextLen()
          for (let i = 0; i < makeCount; i++) {
            const make = {}
            make.address = client.api.utils.hexToAddress(strReader.read(20))
            make.asset_token_id = strReader.readUint128()
            make.price_token_id = strReader.readUint128()
            make.price = strReader.readUint128()
            make.amount = strReader.readUint128()
            make.make_id = strReader.readUint128()
  
            parsedMakes.push(make)
          }
  
          setMyMakes(parsedMakes)
        } catch (e) {
          handleError(e, (errorCode) => {
            if (errorCode === 'CONTRACT_ADDRESS_ERROR') {
              setStopInterval(true)
            } else {
              console.log('get user makes', e)
            }
          })
        }
      }
    }

    getUserMakes()
    const interval = !stopInterval && setInterval(getUserMakes, 5000)
    return () => {
      interval && clearInterval(interval)
    }
  }, [tokenPair, account, stopInterval, CONTRACT_ADDRESS])

  useEffect(() => {
    async function getStat() {
      if (tokens.length && CONTRACT_ADDRESS) {
        try {
          const statStr = await cyanoRequest('smartContract.invokeWasmRead', {
            scriptHash: CONTRACT_ADDRESS,
            operation: 'stat',
            args: []
          })
          
          const tokenPool = []
          const strReader = new StringReader(statStr)
          setFeeRate(strReader.readUint128())
          const tokenCount = strReader.readNextLen()
  
          for (let i = 0; i < tokenCount; i++) {
            const token = {}
            token.id = strReader.readUint128()
            const tempToken = tokens.find((t) => t.id === token.id)
            token.weight = strReader.readUint128()
            token.balance = new BigNumber(readBigNumberUint128(strReader)).div(new BigNumber(10 ** tempToken.decimals)).toString()
  
            tokenPool.push(Object.assign({}, tempToken, token))
          }

          if (!pairs.length) {
            const tokenPairs = []
            for (let i = 0; i < tokenPool.length; i++) {
              for (let j = i + 1; j < tokenPool.length; j++) {
                if (tokenPool[i].weight > tokenPool[j].weight || (tokenPool[i].weight === tokenPool[j].weight && tokenPool[i].id > tokenPool[j].id)) {
                  tokenPairs.push({
                    name: `${tokenPool[j].name}/${tokenPool[i].name}`,
                    tokens: [tokenPool[j], tokenPool[i]]
                  })
                } else {
                  tokenPairs.push({
                    name: `${tokenPool[i].name}/${tokenPool[j].name}`,
                    tokens: [tokenPool[i], tokenPool[j]]
                  })
                }
              }
            }

            setPairs(tokenPairs)
          }

          setPool(tokenPool)
        } catch (e) {
          handleError(e, (errorCode) => {
            if (errorCode === 'CONTRACT_ADDRESS_ERROR') {
              setStopInterval(true)
            } else {
              console.log('get stat', e)
            }
          })
        }
      }
    }

    getStat()
    const interval = setInterval(() => {
      if (stopInterval) {
        clearInterval(interval)
      } else {
        getStat()
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [tokens, pairs, stopInterval, CONTRACT_ADDRESS])

  useEffect(() => {
    if (price > 0 && amount > 0) {
      setTotal(new BigNumber(price).times(amount).toString())
    }
  }, [price, amount])

  useEffect(() => {
    if (price > 0) {
      setAmount(new BigNumber(total || 0).div(price).toString())
    }
  }, [total])

  useEffect(() => {
    if (tokenPair.name && price > 0 && amount > 0) {
      setIsValid(true)
    } else {
      setIsValid(false)
    }
  }, [tokenPair, amount, price])

  useEffect(() => {
    setMakeView('all')
  }, [account])

  function onChangeToUserMakeView() {
    if (account) {
      setMakeView('my')
    } else {
      Alert.show('Please Connect Wallet First')
    }
  }

  function getMakes(type) {
    if (tokenPair.name) {
      const curMakes = (makeView === 'my' ? myMakes : makes)
      if (type === 'sell') {
        return curMakes.filter((m) => m.asset_token_id === tokenPair.tokens[0].id && m.price_token_id === tokenPair.tokens[1].id).map((m) => {
          const isMine = makeView !== 'my' && !!myMakes.find((mm) => m.make_id === mm.make_id)
          return (
            <div key={m.make_id} className={`my-make-item reverse ${isMine ? 'mine' : ''}`}>
              <div className="make-item-detail make-sell">{new BigNumber(m.price).div(PRICE_DECIMALS).toString()}</div>
              <div className="make-item-detail">{new BigNumber(m.amount).div((10 ** tokenPair.tokens[0].decimals)).toString()}</div>
              { makeView === 'my' && <div className="unmake-btn" onClick={() => onUnmake(m.make_id)}>Cancel</div> }
            </div>)
        })
      } else {
        return curMakes.filter((m) => m.asset_token_id === tokenPair.tokens[1].id && m.price_token_id === tokenPair.tokens[0].id).map((m) => {
          const isMine = makeView !== 'my' && !!myMakes.find((mm) => m.make_id === mm.make_id)
          return (
            <div key={m.make_id} className={`my-make-item ${isMine ? 'mine' : ''}`}>
              <div className="make-item-detail make-buy">{new BigNumber(m.price).div(PRICE_DECIMALS).toString()}</div>
              <div className="make-item-detail">{new BigNumber(m.amount).div(m.price).times(PRICE_DECIMALS).div((10 ** tokenPair.tokens[1].decimals)).toString()}</div>
              { makeView === 'my' && <div className="unmake-btn" onClick={() => onUnmake(m.make_id)}>Cancel</div> }
            </div>)
        })
      }
    }
    return null
  }



  async function onMake() {
    if (!account) {
      Alert.show('Please Connect Wallet First')
      return
    }
    if (tokenPair.name && CONTRACT_ADDRESS) {
      if (price <= 0) {
        Alert.error('Price should be greater than 0')
        return
      }
      if (amount <= 0) {
        Alert.error('Amount should be greater than 0')
        return
      }
      try {
        const assetToken = tradeType === 'buy' ? tokenPair.tokens[1] : tokenPair.tokens[0]
        const priceToken = tradeType === 'buy' ? tokenPair.tokens[0] : tokenPair.tokens[1]
        // const tradePrice = tradeType === 'buy' ? new BigNumber(1).div(price).toString() : price
        const tradeAmount = tradeType === 'buy' ? total : amount
        const args = [
          {
            type: 'Address',
            value: account
          },
          {
            type: 'Long',
            value: assetToken.id
          },
          {
            type: 'Long',
            value: priceToken.id
          },
          {
            type: 'Long',
            value: new BigNumber(price).times(PRICE_DECIMALS).integerValue(BigNumber.ROUND_DOWN).toString()
          },
          {
            type: 'Long',
            value: new BigNumber(tradeAmount).times(new BigNumber(10 ** assetToken.decimals)).integerValue(BigNumber.ROUND_DOWN).toString()
          }
        ]
        const makeResult = await cyanoRequest('smartContract.invokeWasm', {
          scriptHash: CONTRACT_ADDRESS,
          operation: 'make',
          args,
          gasPrice: 2500,
          gasLimit: 60000000,
          requireIdentity: false
        })

        if (makeResult.transaction) {
          setAmount('')
          setPrice('')
          setTotal('')
          setModal('infoModal', {
            show: true,
            type: 'success',
            text: 'Transaction Successful',
            extraText: 'View Transaction',
            extraLink: `${TRANSACTION_BASE_URL}${makeResult.transaction}${TRANSACTION_AFTERFIX}`
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

  async function onUnmake(makeId) {
    if (account && makeId && CONTRACT_ADDRESS) {
      try {
        const unmakeResult = await cyanoRequest('smartContract.invokeWasm', {
          scriptHash: CONTRACT_ADDRESS,
          operation: 'unmake',
          args: [
            {
              type: 'Address',
              value: account
            },
            {
              type: 'Long',
              value: makeId
            }
          ],
          gasPrice: 2500,
          gasLimit: 60000000,
          requireIdentity: false
        })
        if (unmakeResult.transaction) {
          setModal('infoModal', {
            show: true,
            type: 'success',
            text: 'Transaction Successful',
            extraText: 'View Transaction',
            extraLink: `${TRANSACTION_BASE_URL}${unmakeResult.transaction}${TRANSACTION_AFTERFIX}`
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

  function getPriceHint() {
    if (tokenPair.name) {
      return tokenPair.tokens[1].name
    }
  }

  function getAmountHint() {
    if (tokenPair.name) {
      return tokenPair.tokens[0].name
    }
  }

  function generateTokenPool() {
    if (pool.length) {
      return pool.filter((tp) => Number(tp.balance) !== 0).map((tp) => {
        return (
          <div className="pool-item" key={tp.name}>
            <div className={`icon-${tp.name} token-name`}>{tp.name}</div>
            <div className="token-balance">{tp.balance}</div>
          </div>
        )
      })
    }
  }

  const handlePairClick = (pair) => {
    setTokenBalance('-')
    setTokenPair(pair)
    localStorage.setItem('trade_token_pair', pair.name)
    setShowPairSelectModal(false)
  }

  return (
    <div className="swap-wrapper">
      <div className="trade-container">
        <div className="make-wrapper">
          <div className="container-header">Trade
            {
              tokenPair.name ? (
                <div className="token-pair-select" onClick={() => setShowPairSelectModal(true)}>
                  <div className="token-pair-name">{tokenPair.name}</div>
                </div>
              ) : null
            }
          </div>
          <div className="trade-type-switch">
            <div className={`trade-type-item ${tradeType === 'buy' ? 'trade-buy' : ''}`} onClick={() => setTradeType('buy')}>Buy</div>
            <div className={`trade-type-item ${tradeType === 'sell' ? 'trade-sell' : ''}`} onClick={() => setTradeType('sell')}>Sell</div>
          </div>
          <div className="form-item">
            <div className="item-title">Price
              <span className="hint">{getPriceHint()}</span>
            </div>
            <div className="input-wrapper">
              <Input placeholder="0.0" value={price} decimals="9" onChange={(amount) => setPrice(amount)} />
            </div>
          </div>
          <div className="form-item">
            <div className="item-title">Amount
              <span className="hint">{getAmountHint()}</span>
            </div>
            <div className="input-wrapper">
              <Input placeholder="0.0" value={amount} decimals={tokenPair.tokens ? tokenPair.tokens[0].decimals : '9'} onChange={(amount) => setAmount(amount)} />
            </div>
          </div>
          <div className="form-item">
            <div className="item-title">Total {tradeType === 'buy' ? 'Need' : 'Receive'}
              <span className="hint">{getPriceHint()}</span>
            </div>
            <div className="input-wrapper">
              <Input placeholder="0.0" value={total} decimals="9" onChange={(amount) => setTotal(amount)} />
            </div>
          </div>
          { tokenPair.name ? <div className="balance-line">Balance: <span>{tokenBalance} {tradeType === 'buy' ? tokenPair.tokens[1].name : tokenPair.tokens[0].name}</span></div> : null }
          { feeRate ? <p className="fee-rate">* The fee rate of transaction is {feeRate / 100}%</p> : null }
          { isValid ? <div className={`make-btn make-btn-${tradeType}`} onClick={() => onMake()}>{tradeType.toUpperCase()} {tokenPair.tokens[0].name}</div> : <div className="make-btn disabled">{tradeType.toUpperCase()} {tokenPair.tokens ? tokenPair.tokens[0].name : ''}</div> }
        </div>
        <div className="trade-panel">
          <div className="panel-header">
            <div className="panel-title">Order Book</div>
            <div className="tabs">
              <div className={makeView === 'all' ? "tab-wrapper selected" : "tab-wrapper"} onClick={() => setMakeView('all')}>All</div>
              <div className={makeView === 'my' ? "tab-wrapper selected" : "tab-wrapper"} onClick={() => onChangeToUserMakeView()}>My</div>
            </div>
          </div>
          <div className="list-title">
            <div className="blank-placeholder"></div>
            <div className="title-items">
              <div className="item-text">Price ({getPriceHint()})</div>
              <div className="item-text">Amount ({getAmountHint()})</div>
              { makeView === 'my' && <div className="item-placeholder"></div> }
            </div>
          </div>
          <div className="sell-section">
            <div className="section-title">Sell</div>
            <div className="make-list reverse">
            {getMakes('sell')}
            </div>
          </div>
          {
            (makeView === 'all' && Number(lastPrice) !== 0) ? <div className="last-price-wrapper">
              <div className="last-price-label">Last Price</div>
              <div className="last-price">{lastPrice}</div>
              <div className="last-price-placeholder"></div>
            </div> : null
          }
          <div className="buy-section">
            <div className="section-title">Buy</div>
            <div className="make-list">
            {getMakes('buy')}
            </div>
          </div>
        </div>
      </div>
      {
        pool.filter((tp) => Number(tp.balance) !== 0).length ? (
          <div className="token-pool">
            <div className="container-header">Token Balance</div>
            <div className="pool-items">
            {generateTokenPool()}
            </div>
          </div>
        ) : null
      }
      {
        showPairSelectModal ? (
          <div className="modal-overlay">
            <div className="modal-wrapper">
              <div className="close-btn" onClick={() => setShowPairSelectModal(false)}></div>
              <div className="pair-select-modal-wrapper">
                <div className="pair-select-modal-title">Select</div>
                <input type="text" className="pair-select-modal-input" value={pairNameKeyword} onInput={(e) => setPairNameKeyword(e.target.value)} />
                <div className="pair-select-modal-list">
                  {
                    pairs.filter((p) => {
                      const nameLC = p.name.toLowerCase()
                      const tNames = pairNameKeyword.split(' ').filter((n) => n)
                      
                      return tNames.reduce((a, b) => a && nameLC.indexOf(b) >= 0, true)
                    }).map((p) => {
                      return (
                        <div key={p.name} className="pair-select-modal-list-item" onClick={() => handlePairClick(p)}>
                          {
                            p.tokens.map((t) => <div key={`${p.name}-${t.name}`} className={`pair-select-modal-list-item-icon icon-${t.name}`}></div>)
                          }
                          <div className="pair-select-modal-list-item-name">{p.name}</div>
                        </div>
                      )
                    })
                  }
                </div>
              </div>
            </div>
          </div>
        ) : null
      }
    </div>
  )
}

export default Transaction