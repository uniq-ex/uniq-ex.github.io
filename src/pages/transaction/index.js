import { client } from '@ont-dev/ontology-dapi'
import React, { useState, useEffect, useCallback } from 'react'
import { utils } from 'ontology-ts-sdk'
import BigNumber from 'bignumber.js'
import { useAlert } from 'react-alert'
import { useMappedState, useDispatch } from 'redux-react-hook';
import TokenInput from '../../components/tokenInput'
import Input from '../../components/input'
import { handleError } from '../../utils/errorHandle'
import { getHashString } from '../../utils/common'
import { PRICE_DECIMALS } from '../../utils/constants'
import { CONTRACT_ADDRESS, TRANSACTION_BASE_URL, TRANSACTION_AFTERFIX } from '../../config'
import './index.css'

const { StringReader } = utils

const Transaction = () => {
  const [assetToken, setAssetToken] = useState({})
  const [priceToken, setPriceToken] = useState({})
  const [makes, setMakes] = useState([])
  const [myMakes, setMyMakes] = useState([])
  const [makeView, setMakeView] = useState('all')
  const [price, setPrice] = useState('')
  const [amount, setAmount] = useState('')
  const [total, setTotal] = useState(0)
  const [pool, setPool] = useState([])
  const [lastPrice, setLastPrice] = useState(0)
  const [feeRate, setFeeRate] = useState(0)
  const [isValid, setIsValid] = useState(false)
  const { account, stopInterval, tokens } = useMappedState((state) => ({
    account: state.wallet.account,
    stopInterval: state.common.stopInterval,
    tokens: state.common.tokens
  }))
  const dispatch = useDispatch()
  const setModal = useCallback((modalType, modalDetail) => dispatch({ type: 'SET_MODAL', modalType, modalDetail }), [])
  const setStopInterval = useCallback((stopInterval) => dispatch({ type: 'SET_STOP_INTERVAL', stopInterval }), [])

  const Alert = useAlert()

  const urlAssetTokenName = getHashString(window.location.hash, 'asset')
  const urlPriceTokenName = getHashString(window.location.hash, 'price')

  useEffect(() => {
    if (pool.length && !assetToken.id && !priceToken.id) {
      let tempToken = pool.find((t) => urlAssetTokenName === t.name)
      setAssetToken(tempToken || pool[0])
      tempToken = pool.find((t) => urlPriceTokenName === t.name)
      setPriceToken(tempToken || pool[1])
    }
  }, [pool])

  useEffect(() => {
    function getMakesOfPair() {
      if (assetToken.id) {
        if (assetToken.id === priceToken.id) {
          setMakes([])
          setLastPrice(0)
          return
        }
        try {
          client.api.smartContract.invokeWasmRead({
            scriptHash: CONTRACT_ADDRESS,
            operation: 'get_makes_of_pair',
            args: [
              {
                type: 'Long',
                value: assetToken.id
              },
              {
                type: 'Long',
                value: priceToken.id
              }
            ]
          })
          .then((makeStr) => {
            const parsedMakes = []
            const strReader = new StringReader(makeStr)
            const pairLastPrice = strReader.readUint128()
            const tempAssetTokenId = assetToken.id < priceToken.id ? assetToken.id : priceToken.id
            const tempPriceTokenId = assetToken.id < priceToken.id ? priceToken.id : assetToken.id
    
            for (let j = 0; j <= 1; j++) {
              const makeCount = strReader.readNextLen()
              for (let i = 0; i < makeCount; i++) {
                const make = {}
                make.make_id = strReader.readUint128()
                make.price = strReader.readUint128()
                make.amount = new BigNumber(strReader.readUint128()).toString()
                make.asset_token_id = (j === 0 ? tempAssetTokenId : tempPriceTokenId)
                make.price_token_id = (j === 0 ? tempPriceTokenId : tempAssetTokenId)
        
                parsedMakes.push(make)
              }
            }
    
            setLastPrice(pairLastPrice ? (assetToken.id < priceToken.id ? pairLastPrice / PRICE_DECIMALS : PRICE_DECIMALS / pairLastPrice) : 0)
            setMakes(parsedMakes)
          })
          .catch((e) => {
            handleError(e, (errorCode) => {
              if (errorCode === 'CONTRACT_ADDRESS_ERROR') {
                setStopInterval(true)
              } else {
                console.log('get makes of pair', e)
              }
            })
          })
        } catch (e) {
          console.log(e)
        }
      }
    }
    getMakesOfPair()
    const interval = !stopInterval && setInterval(getMakesOfPair, 2000)
    return () => {
      interval && clearInterval(interval)
    }
  }, [assetToken, priceToken, account, stopInterval])

  useEffect(() => {
    function getUserMakes() {
      if (account) {
        try {
          client.api.smartContract.invokeWasmRead({
            scriptHash: CONTRACT_ADDRESS,
            operation: 'get_user_makes',
            args: [
              {
                type: 'Address',
                value: account
              }
            ]
          })
          .then((makeStr) => {
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
          })
          .catch((e) => {
            handleError(e, (errorCode) => {
              if (errorCode === 'CONTRACT_ADDRESS_ERROR') {
                setStopInterval(true)
              } else {
                console.log('get user makes', e)
              }
            })
          })
        } catch (e) {
          console.log(e)
        }
      }
    }

    getUserMakes()
    const interval = !stopInterval && setInterval(getUserMakes, 5000)
    return () => {
      interval && clearInterval(interval)
    }
  }, [assetToken, priceToken, account, stopInterval])

  useEffect(() => {
    async function getStat() {
      if (tokens.length) {
        try {
          const statStr = await client.api.smartContract.invokeWasmRead({
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
            token.balance = new BigNumber(strReader.readUint128()).div(new BigNumber(10 ** tempToken.decimals)).toString()
  
            tokenPool.push(Object.assign(tempToken, token))
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
  }, [tokens, stopInterval])

  useEffect(() => {
    setTotal((price || 0) * (amount || 0))
  }, [price, amount])

  useEffect(() => {
    if (assetToken.id !== priceToken.id && price > 0 && amount > 0) {
      setIsValid(true)
    } else {
      setIsValid(false)
    }
  }, [assetToken, priceToken, amount, price])

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
    if (assetToken.id) {
      const curMakes = (makeView === 'my' ? myMakes : makes)
      if (type === 'sell') {
        return curMakes.filter((m) => m.asset_token_id === assetToken.id && m.price_token_id === priceToken.id).map((m) => {
          return (
            <div key={m.make_id} className="my-make-item reverse">
              <div className="make-item-detail make-sell">{m.price / PRICE_DECIMALS}</div>
              <div className="make-item-detail">{new BigNumber(m.amount).div(Math.pow(10, assetToken.decimals)).toString()}</div>
              {/* <div className="make-item-detail">{new BigNumber(m.amount).times(m.price).div(Math.pow(10, assetToken.decimals)).div(PRICE_DECIMALS).toString()}</div> */}
              { makeView === 'my' && <div className="unmake-btn" onClick={() => onUnmake(m.make_id)}>Cancel</div> }
            </div>)
        })
      } else {
        return curMakes.filter((m) => m.asset_token_id === priceToken.id && m.price_token_id === assetToken.id).map((m) => {
          return (
            <div key={m.make_id} className="my-make-item">
              <div className="make-item-detail make-buy">{PRICE_DECIMALS / m.price}</div>
              <div className="make-item-detail">{new BigNumber(m.amount).times(m.price).div(PRICE_DECIMALS).div(Math.pow(10, priceToken.decimals)).toString()}</div>
              {/* <div className="make-item-detail">{new BigNumber(m.amount).div(Math.pow(10, priceToken.decimals)).toString()}</div> */}
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
    if (assetToken.id) {
      if (assetToken.id === priceToken.id) {
        Alert.error('Please select different token')
        return
      }
      if (price <= 0) {
        Alert.error('Price should be greater than 0')
        return
      }
      if (amount <= 0) {
        Alert.error('Amount should be greater than 0')
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
            value: new BigNumber(amount).times(new BigNumber(10 ** assetToken.decimals)).integerValue(BigNumber.ROUND_DOWN).toString()
          }
        ]
        const makeResult = await client.api.smartContract.invokeWasm({
          scriptHash: CONTRACT_ADDRESS,
          operation: 'make',
          args,
          gasPrice: 2500,
          gasLimit: 30000000,
          requireIdentity: false
        })

        if (makeResult.transaction) {
          setAmount('')
          setPrice('')
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
    if (account && makeId) {
      try {
        const unmakeResult = await client.api.smartContract.invokeWasm({
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
          gasLimit: 30000000,
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

  function generatePriceHint() {
    if (assetToken.id) {
      return `1 ${assetToken.name} = ${price || '?'} ${priceToken.name}`
    }
  }

  function getAmountHint() {
    if (assetToken.id) {
      return assetToken.name
    }
  }

  function getPriceToken() {
    if (assetToken.id && priceToken.id) {
      return `${assetToken.name}/${priceToken.name}`
    }
  }

  function onChangeAssetToken(token) {
    if (token.id !== assetToken.id) {
      setAssetToken(token)
      setMakes([])
      setLastPrice(0)
    }
  }

  function onChangePriceToken(token) {
    if (token.id !== priceToken.id) {
      setPriceToken(token)
      setMakes([])
      setLastPrice(0)
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

  return (
    <div className="swap-wrapper">
      <div className="trade-container">
        <div className="make-wrapper">
          <div className="container-header">Trade</div>
          <TokenInput
            label="Sell"
            tokens={pool}
            defaultTokenId={assetToken.id || (pool.length && pool[0].id)}
            value={amount}
            onTokenChange={(token) => onChangeAssetToken(token)}
            onAmountChange={(amount) => setAmount(amount)} />
          <div className="form-item">
            <div className="item-title">Price
              <span className="hint">{generatePriceHint()}</span>
            </div>
            <div className="input-wrapper">
              <Input placeholder="0.0" value={price} decimals="9" onChange={(amount) => setPrice(amount)} />
            </div>
          </div>
          <TokenInput
            label="Will Get"
            tokens={pool}
            defaultTokenId={priceToken.id || (pool.length && pool[1].id)}
            value={total}
            inputDisabled
            withMax={false}
            onTokenChange={(token) => onChangePriceToken(token)} />
          { feeRate ? <p className="fee-rate">* The fee rate of transaction is {feeRate / 100}%</p> : null }
          { isValid ? <div className="make-btn" onClick={() => onMake()}>Sell</div> : <div className="make-btn disabled">Sell</div> }
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
              <div className="item-text">Price ({getPriceToken()})</div>
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
      <div className="token-pool">
        <div className="container-header">Token Balance</div>
        <div className="pool-items">
        {generateTokenPool()}
        </div>
      </div>
    </div>
  )
}

export default Transaction