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
  const { account, tokens, swapTokens } = useMappedState((state) => ({
    account: state.wallet.account,
    tokens: state.common.tokens,
    swapTokens: state.swap.tokens
  }))
  const dispatch = useDispatch()
  const setModal = useCallback((modalType, modalDetail) => dispatch({ type: 'SET_MODAL', modalType, modalDetail }), [])
  const Alert = useAlert()
  const history = useHistory()

  useFetchPairs()

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
    }
  }

  function onChangeToken2(e) {
    if (e.value !== token2.id) {
      setToken2(tokens.filter((t) => t.id === e.value)[0])
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
      console.log(token1Amount, token2Amount, new BigNumber(token2Amount).toString())
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
          value: new BigNumber(token1Amount).times(new BigNumber(10 ** token1.decimals)).integerValue(BigNumber.ROUND_DOWN).toString()
        },
        {
          type: 'Long',
          value: new BigNumber(token2Amount).times(new BigNumber(10 ** token2.decimals)).integerValue(BigNumber.ROUND_DOWN).toString()
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
          type: 'Address',
          value: account
        }
      ]
      console.log(args)
      const addResult = await client.api.smartContract.invokeWasm({
        scriptHash: SWAP_ADDRESS,
        operation: 'add_liquidity',
        args,
        gasPrice: 2500,
        gasLimit: 3000000,
        requireIdentity: false
      })

      console.log('addResult', addResult)

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
        <div className="form-item">
          <div className="item-title">Input
            <span className="hint">Balance: {token1Balance}</span>
          </div>
          <div className="input-wrapper">
            {generateTokenSelection('1')}
            <input className="input inline-input" placeholder="0.0" type="number" onChange={(event) => setToken1Amount(event.target.value)}></input>
          </div>
        </div>
        <div className="icon-plus"></div>
        <div className="form-item">
          <div className="item-title">Input
            <span className="hint">Balance: {token2Balance}</span>
          </div>
          <div className="input-wrapper">
            {generateTokenSelection('2')}
            <input className="input inline-input" placeholder="0.0" type="number" onChange={(event) => setToken2Amount(event.target.value)}></input>
          </div>
        </div>
        <div className="al-add-btn" onClick={() => onAdd()}>Add</div>
      </div>
    </div>
  )
}

export default AddLiquidity