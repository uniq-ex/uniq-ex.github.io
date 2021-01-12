import { client } from '@ont-dev/ontology-dapi'
import React, { useState, useEffect } from 'react'
import { useHistory } from "react-router-dom"
import Select, { components } from 'react-select'
import { useMappedState, useDispatch } from 'redux-react-hook';
import { utils } from 'ontology-ts-sdk'
import request from '../../utils/request'
import { SWAP_ADDRESS } from '../../config'
import { SLIPPAGE } from '../../utils/constants'
import './index.css'

const { StringReader, reverseHex } = utils

const Swap = () => {
  const [pairs, setPairs] = useState()
  const [currentTokenBalance, setCurrentTokenBalance] = useState(0)
  const [loadingPairs, setLoadingPairs] = useState(true)
  const [tokenA, setTokenA] = useState({})
  const [tokenB, setTokenB] = useState({})
  const [aTokenAmount, setATokenAmount] = useState(0)
  const [bTokenAmount, setBTokenAmount] = useState(0)
  const { account, loadingToken, tokens } = useMappedState((state) => ({
    account: state.wallet.account,
    loadingToken: state.common.loadingToken,
    tokens: state.common.tokens
  }))

  const history = useHistory()

  useEffect(() => {
    if (tokens.length) {
      setTokenA(tokens[0])
      setTokenB(tokens.find((t) => t.name === 'UNX') || tokens[1])
    }
  }, [tokens])

  useEffect(() => {
    if (account && tokenA.id) {
      if (tokenA.name !== 'ONT' && tokenA.name !== 'ONG') {
        const param = {
          scriptHash: tokenA.address,
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
            setCurrentTokenBalance(parseInt(reverseHex(balance), 16) / (10 ** tokenA.decimals))
          }
        })
      } else {
        request({
          method: 'get',
          url: `/v2/addresses/${account}/native/balances`
        }).then((resp) => {
          if (resp.code === 0) {
            const token = resp.result.find((t) => t.asset_name === tokenA.name.toLowerCase())
            setCurrentTokenBalance(token.balance)
          }
        })
        .catch((e) => {
          console.log(e)
        })
      }
    }
  }, [account, tokenA])

  useEffect(() => {
    function getAllPairs() {
      if (!pairs) {
        try {
          client.api.smartContract.invokeWasmRead({
            scriptHash: SWAP_ADDRESS,
            operation: 'stat',
            args: []
          })
          .then((pairStr) => {
            setLoadingPairs(false)
          
            const parsedPairs = []
            const strReader = new StringReader(pairStr)
            const pairCount = strReader.readNextLen()
            for (let i = 0; i < pairCount; i++) {
              const pair = {}
              pair.address = reverseHex(strReader.read(20))
              pair.token1 = strReader.readUint128()
              pair.token2 = strReader.readUint128()
              pair.id = strReader.readUint128()
              pair.reserve1 = strReader.readUint128()
              pair.reserve2 = strReader.readUint128()
  
              parsedPairs.push(pair)
            }

            const tokenIds = []
            const tokenCount = strReader.readNextLen()
            for (let i = 0; i < tokenCount; i++) {
              tokenIds.push(strReader.readUint128())
            }
  
            setPairs(parsedPairs)
          })
          .catch((e) => {
            console.log(e)
          })
        } catch (e) {
          console.log(e)
        }
      }
    }

    getAllPairs()
    let interval = setInterval(() => {
      if (pairs && pairs.length) {
        clearInterval(interval)
      } else {
        getAllPairs()
      }
    }, 5000)
    return () => {
      interval && clearInterval(interval)
    }
  }, [pairs])

  const generateTokenSelection = (type) => {
    if (tokens.length) {
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
      const onChangeToken = (type === 'a' ? onChangeTokenA : onChangeTokenB)
      let defaultToken = type === 'a' ? tokens[0] : (tokens.find((t) => t.name === 'UNX') || tokens[1])
      return (
        <Select
          className="token-select"
          defaultValue={defaultToken}
          options={tokens}
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

  function onChangeTokenA() {

  }

  function onChangeTokenB() {

  }

  function onNavigateToPool() {
    history.push('/pool')
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
              {generateTokenSelection('a')}
              <input className="input inline-input" placeholder="0.0" type="number" onChange={(event) => setATokenAmount(event.target.value)}></input>
            </div>
          </div>
          <div className="icon-arrow-down"></div>
          <div className="form-item">
            <div className="item-title">To</div>
            <div className="input-wrapper">
              {generateTokenSelection('b')}
              <input className="input inline-input" placeholder="0.0" type="number" onChange={(event) => setBTokenAmount(event.target.value)}></input>
            </div>
          </div>
          <div className="sw-swap-btn">Swap</div>
        </div>
      </div>
    </div>
  )
}

export default Swap